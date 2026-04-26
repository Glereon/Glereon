# Glereon E-commerce Site with Stripe Integration

This is the Glereon Detailing Labs e-commerce website with integrated Stripe payment gateway.

## Setup Instructions

### 1. Stripe Account Setup
1. Sign up for a Stripe account at [stripe.com](https://stripe.com)
2. Complete account verification (much easier than Paysera - no company code required!)
3. Get your API keys from the Stripe Dashboard:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Webhook Secret** (create in Dashboard → Webhooks)

### 2. Email Setup (Hostinger Email)
1. Your email is hosted on Hostinger, so use these SMTP settings:
   ```
   EMAIL_HOST=smtp.hostinger.com
   EMAIL_PORT=465  # SSL port
   EMAIL_USER=info@glereon.com
   EMAIL_PASS=your_hostinger_email_password
   MERCHANT_EMAIL=info@glereon.com
   ```
2. Use your regular email password

### 3. Backend Setup
1. Install Node.js (version 16 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret
   EMAIL_HOST=smtp.hostinger.com
   EMAIL_PORT=465
   EMAIL_USER=info@glereon.com
   EMAIL_PASS=your_hostinger_email_password
   MERCHANT_EMAIL=info@glereon.com
   PRODUCTION_URL=https://your-railway-url.com
   ```
4. Start the backend server:
   ```bash
   npm start
   ```

### 4. Stripe Webhook Setup
1. In Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://your-railway-url.com/api/stripe-webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `charge.refunded`
4. Copy the **Webhook Secret** to your `.env` file

### 5. Update Frontend Code
In `scripts/cartsystem.js`, replace `pk_test_YOUR_PUBLISHABLE_KEY` with your actual publishable key:
```javascript
const stripe = Stripe('pk_test_your_actual_publishable_key');
```

### 6. Deployment
- Deploy to Railway (recommended)
- Update `PRODUCTION_URL` in `.env` with your Railway URL
- Test with Stripe test cards: `4242 4242 4242 4242`

## File Structure
- `index.html` - Main page with cart functionality
- `scripts/cartsystem.js` - Cart and checkout logic
- `server.js` - Backend server with Stripe integration
- `checkout-success.html` - Payment success page
- `checkout-cancel.html` - Payment cancellation page
- `styles/` - CSS stylesheets

## Security Notes
- Never expose your Stripe secret key in client-side code
- Always verify webhook signatures
- Use HTTPS in production
- Store order data securely in a database (currently stored in memory)

## Email Notifications
- **Customer**: Receives order confirmation with details
- **Merchant**: Receives new order notification with customer info
- Emails are sent automatically when payment is confirmed via Stripe webhooks
- **Customer**: Receives order confirmation with details
- **Merchant**: Receives new order notification with customer info
- Emails are sent automatically when payment is confirmed via Paysera callback

## Support
For Paysera integration issues, refer to: https://developers.paysera.com/