const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();
console.log('NODE_ENV:', process.env.NODE_ENV);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://glereon.com'] : true
}));

// Stripe webhook handler needs RAW body before express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Respond to Stripe immediately to avoid timeout
        res.json({ received: true });
        // Process email in background
        handleCheckoutSessionCompleted(event.data.object).catch(err => console.error('Background email error:', err));
        return;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Parse JSON for all other routes
app.use(express.json());

// Email transporter
const emailTransporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: parseInt(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Store orders temporarily (use database in production)
const orders = new Map();

const BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.PRODUCTION_URL
  : 'http://localhost:3000';

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, customer, orderId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Transform items to Stripe format
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          description: item.description || `${item.name} - Glereon Detailing Labs`,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.qty || item.quantity,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${BASE_URL ? BASE_URL + '/checkout-success.html' : 'https://glereon.com/checkout-success.html'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL ? BASE_URL + '/checkout-cancel.html' : 'https://glereon.com/checkout-cancel.html'}`,

      customer_email: customer.email,
      metadata: {
        orderId: orderId,
        customerName: customer.name,
        customerEmail: customer.email,
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['LT'],
      },
    });

    // Store order info
    orders.set(orderId, {
      sessionId: session.id,
      customer: customer,
      items: items,
      total: items.reduce((sum, item) => sum + (item.price * (item.qty || item.quantity)), 0),
      status: 'pending',
      createdAt: new Date(),
    });

    console.log(`Created Stripe checkout session: ${session.id} for order: ${orderId}`);

    res.json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create checkout session'
    });
  }
});

// Handle successful payment with timeout
async function handleCheckoutSessionCompleted(session) {
  console.log('✓ Payment completed for session:', session.id);
  console.log('Customer email:', session.customer_email);
  console.log('Customer name:', session.metadata.customerName);

  // Validate required environment variables first (fast check)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.MERCHANT_EMAIL) {
    console.error('ERROR: Missing required email configuration. Emails cannot be sent.');
    return; // Still return - Stripe already received the event
  }

  const orderId = session.metadata.orderId;
  const customerEmail = session.customer_email;
  const customerName = session.metadata.customerName;

  // Get full session details
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent'],
  });

  // Update order status
  if (orders.has(orderId)) {
    const order = orders.get(orderId);
    order.status = 'paid';
    order.stripeSessionId = session.id;
    order.paymentIntentId = fullSession.payment_intent?.id || null;
    order.paidAt = new Date();
  }

  // Send customer confirmation email
  const customerEmailHtml = `
    <h1>Thank you for your order!</h1>
    <p>Dear ${customerName},</p>
    <p>Your order has been successfully processed.</p>
    <h2>Order Details:</h2>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <ul>
      ${orders.get(orderId)?.items.map(item =>
        `<li>${item.name} - €${item.price} x ${item.qty || item.quantity} = €${(item.price * (item.qty || item.quantity)).toFixed(2)}</li>`
      ).join('')}
    </ul>
    <p><strong>Total: €${(fullSession.amount_total / 100).toFixed(2)}</strong></p>
    <p>We will process your order shortly.</p>
    <p>Best regards,<br>Glereon Detailing Labs</p>
  `;

  // Send merchant notification
  const merchantEmailHtml = `
    <h1>New Order Received!</h1>
    <h2>Order Details:</h2>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
    <p><strong>Total:</strong> €${(fullSession.amount_total / 100).toFixed(2)}</p>
    <p><strong>Stripe Session ID:</strong> ${session.id}</p>
  `;

  // Validate required environment variables
  console.log('Validating email configuration...');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST ? 'SET' : 'MISSING');
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT ? 'SET' : 'MISSING');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'MISSING');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');
  console.log('MERCHANT_EMAIL:', process.env.MERCHANT_EMAIL ? 'SET' : 'MISSING');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.MERCHANT_EMAIL) {
    console.error('ERROR: Missing required email configuration. Emails cannot be sent.');
    return;
  }

  try {
    // Send customer email
    console.log(`Sending confirmation email to customer: ${customerEmail}`);
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Order Confirmation - ${orderId}`,
      html: customerEmailHtml
    });
    console.log('Customer email sent successfully');

    // Send merchant email
    console.log(`Sending notification email to merchant: ${process.env.MERCHANT_EMAIL}`);
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.MERCHANT_EMAIL,
      subject: `New Order - ${orderId}`,
      html: merchantEmailHtml
    });
    console.log('Merchant email sent successfully');

    console.log(`✓ Confirmation emails sent for order ${orderId}`);
  } catch (emailError) {
    console.error('ERROR sending emails:', emailError.message);
    console.error('Full error:', emailError);
  }
}

// Handle refunds
async function handleChargeRefunded(charge) {
  console.log('⚠ Refund processed for charge:', charge.id);

  // Find order and notify customer
  for (const [orderId, order] of orders.entries()) {
    if (order.paymentIntentId === charge.payment_intent) {
      order.status = 'refunded';
      order.refundedAt = new Date();

      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: order.customer.customerEmail || order.customer.email,
        subject: `Refund Processed - ${orderId}`,
        html: `
          <h2>Refund Confirmation</h2>
          <p>We've processed a refund for order ${orderId}</p>
          <p>Amount: €${(charge.amount_refunded / 100).toFixed(2)}</p>
        `,
      });
    }
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running with Stripe integration' });
});

// Block sensitive files
const blockedPaths = ['/server.js', '/package.json', '/package-lock.json', '/.env'];
app.use((req, res, next) => {
  if (blockedPaths.includes(req.path)) {
    return res.status(403).send('Forbidden');
  }
  next();
});

// Serve static files
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Stripe integration active');
});
