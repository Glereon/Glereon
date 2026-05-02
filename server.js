const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
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

// Note: nodemailer code removed - using Resend instead for email sending

// Store orders temporarily (use database in production)
const orders = new Map();

const BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.PRODUCTION_URL
  : 'http://localhost:3000';

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, customer, orderId, delivery, subtotal } = req.body;

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

    // Add delivery as a separate line item if selected
    if (delivery && delivery.cost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Pristatymas: ${delivery.method}`,
            description: 'Shipping/delivery fee',
          },
          unit_amount: Math.round(delivery.cost * 100),
        },
        quantity: 1,
      });
    }

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
        deliveryMethod: delivery ? delivery.method : '',
        deliveryCost: delivery ? delivery.cost.toString() : '0',
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['LT'],
      },
    });

    // Calculate totals
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * (item.qty || item.quantity)), 0);
    const deliveryCost = delivery ? delivery.cost : 0;
    const total = itemsTotal + deliveryCost;

    // Store order info
    orders.set(orderId, {
      sessionId: session.id,
      customer: customer,
      items: items,
      delivery: delivery,
      subtotal: itemsTotal,
      total: total,
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
  if (!process.env.RESEND_API_KEY) {
    console.error('ERROR: Missing RESEND_API_KEY. Emails cannot be sent.');
    return; // Still return - Stripe already received the event
  }
  
  const merchantEmail = process.env.MERCHANT_EMAIL;
  if (!merchantEmail) {
    console.error('ERROR: Missing MERCHANT_EMAIL. Emails cannot be sent.');
    return;
  }

  const orderId = session.metadata.orderId;
  const customerEmail = session.customer_email;
  const customerName = session.metadata.customerName;

  // Get full session details
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent'],
  });

// Get order for delivery info
  const order = orders.get(orderId);
  
  // Update order status
  if (order) {
    order.status = 'paid';
    order.stripeSessionId = session.id;
    order.paymentIntentId = fullSession.payment_intent?.id || null;
    order.paidAt = new Date();
  }

  const deliveryHtml = order?.delivery ? `
    <li>Pristatymas: ${order.delivery.method} - €${order.delivery.cost.toFixed(2)}</li>
  ` : '';
  
  // Send customer confirmation email
  const customerEmailHtml = `
    <h1>Thank you for your order!</h1>
    <p>Dear ${customerName},</p>
    <p>Your order has been successfully processed.</p>
    <h2>Order Details:</h2>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <ul>
      ${order?.items.map(item =>
        `<li>${item.name} - €${item.price} x ${item.qty || item.quantity} = €${(item.price * (item.qty || item.quantity)).toFixed(2)}</li>`
      ).join('')}
      ${deliveryHtml}
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
    <p><strong>Delivery:</strong> ${order?.delivery?.method || 'Not selected'} (€${order?.delivery?.cost || 0})</p>
    <p><strong>Total:</strong> €${(fullSession.amount_total / 100).toFixed(2)}</p>
    <p><strong>Stripe Session ID:</strong> ${session.id}</p>
  `;

try {
// Use Resend for email sending (works on Railway)
    // Note: After verifying domain in resend.com, update the from address below
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Use your verified domain after completing domain verification at resend.com/domains
    const fromAddress = process.env.EMAIL_FROM || 'Glereon Detailing Labs <onboarding@resend.dev>';
    
// Send customer email
    console.log(`Sending confirmation email to customer: ${customerEmail}`);
    const customerResult = await resend.emails.send({
      from: fromAddress,
      to: [customerEmail],
      subject: `Order Confirmation - ${orderId}`,
      html: customerEmailHtml
    });
    console.log('Customer email result:', JSON.stringify(customerResult));
    if (customerResult.error) {
      console.error('CUSTOMER EMAIL FAILED:', customerResult.error.message);
    }

    // Send merchant email
    console.log(`Sending notification email to merchant: ${merchantEmail}`);
    const merchantResult = await resend.emails.send({
      from: fromAddress,
      to: [merchantEmail],
      subject: `New Order - ${orderId}`,
      html: merchantEmailHtml
    });
    console.log('Merchant email result:', JSON.stringify(merchantResult));
    if (merchantResult.error) {
      console.error('MERCHANT EMAIL FAILED:', merchantResult.error.message);
    }

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

// Send refund email using Resend
const fromAddress = process.env.EMAIL_FROM || 'Glereon Detailing Labs <onboarding@resend.dev>';
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: fromAddress,
        to: [order.customer.customerEmail || order.customer.email],
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
  res.json({ status: 'Server is running with Stripe and delivery integration' });
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
