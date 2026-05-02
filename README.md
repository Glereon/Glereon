# Glereon E-commerce Site with Stripe Integration

This is the Glereon Detailing Labs e-commerce website with integrated Stripe payment gateway.

## Setup Instructions

### 1. Stripe Account Setup
1. Sign up for a Stripe account at [stripe.com](https://stripe.com)
2. Complete account verification
3. Get your API keys from the Stripe Dashboard:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Webhook Secret** (create in Dashboard → Webhooks)

### 2. Email Setup (Resend - Required for Railway)
Railway blocks SMTP connections, so we use Resend API instead:
1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the API Keys page
3. (Optional) Verify your domain to send to any email address
   - Without domain verification, you can only send to your own email (glereon123@gmail.com)
   - With domain verified, you can send to customer@anydomain.com

### 3. Backend Setup
1. Install Node.js (version 16 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file with these variables:
   ```
   # Email (Resend) - REQUIRED
   RESEND_API_KEY=re_123456789
   EMAIL_FROM=info@glereon.com  # Must be a verified email or your verified domain
   
   # Merchant (order notifications)
   MERCHANT_EMAIL=info@glereon.com

   # Stripe
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret

   # Server
   NODE_ENV=production
   PRODUCTION_URL=https://your-railway-url.com
   PORT=8080
   ```
4. Start locally:
   ```bash
   npm start
   ```

### 4. Stripe Webhook Setup
1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-railway-url.com/api/stripe-webhook`
3. Select events: `checkout.session.completed`, `charge.refunded`
4. Copy the **Webhook Secret** to your environment variables

### 5. Update Frontend
In `scripts/cartsystem.js`, find and update the Stripe publishable key:
```javascript
const stripe = Stripe('pk_test_your_actual_publishable_key');
```

### 6. Deploy to Railway
- Connect your GitHub repo to Railway
- Add all environment variables in Railway dashboard
- Test with card: `4242 4242 4242 4242`

## File Structure
- `index.html` - Main product page
- `scripts/cartsystem.js` - Cart & checkout logic
- `server.js` - Backend with Stripe + Resend
- `checkout-success.html` - Payment success page
- `checkout-cancel.html` - Payment cancelled page

## Security Notes
- Never expose Stripe secret key in client code
- Always verify webhook signatures
- Use HTTPS in production

## Email Flow
When payment is confirmed via Stripe:
1. Stripe sends webhook to server
2. Server sends order confirmation to customer
3. Server notifies merchant at info@glereon.com
