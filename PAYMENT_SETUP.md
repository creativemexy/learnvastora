# Payment Gateway Integration Setup

This guide explains how to set up PayPal, Paystack, and Flutterwave payment gateways for the LanguageConnect platform.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-client-secret"

# Paystack Configuration
PAYSTACK_SECRET_KEY="your-paystack-secret-key"
PAYSTACK_PUBLIC_KEY="your-paystack-public-key"

# Flutterwave Configuration
FLUTTERWAVE_PUBLIC_KEY="your-flutterwave-public-key"
FLUTTERWAVE_SECRET_KEY="your-flutterwave-secret-key"
```

## PayPal Setup

1. **Create PayPal Developer Account**
   - Go to [PayPal Developer](https://developer.paypal.com/)
   - Sign up for a developer account
   - Create a new app in the developer dashboard

2. **Get Credentials**
   - Copy your Client ID and Client Secret
   - Add them to your `.env` file

3. **Webhook Setup**
   - In PayPal Developer Dashboard, set up webhooks
   - Add webhook URL: `https://yourdomain.com/api/payments/webhooks/paypal`
   - Select events: `PAYMENT.CAPTURE.COMPLETED`

## Paystack Setup

1. **Create Paystack Account**
   - Go to [Paystack](https://paystack.com/)
   - Sign up for an account
   - Complete verification process

2. **Get API Keys**
   - Go to Settings > API Keys
   - Copy your Secret Key and Public Key
   - Add them to your `.env` file

3. **Webhook Setup**
   - In Paystack Dashboard, go to Settings > Webhooks
   - Add webhook URL: `https://yourdomain.com/api/payments/webhooks/paystack`
   - Select events: `charge.success`

## Flutterwave Setup

1. **Create Flutterwave Account**
   - Go to [Flutterwave](https://flutterwave.com/)
   - Sign up for an account
   - Complete verification process

2. **Get API Keys**
   - Go to Settings > API Keys
   - Copy your Public Key and Secret Key
   - Add them to your `.env` file

3. **Webhook Setup**
   - In Flutterwave Dashboard, go to Settings > Webhooks
   - Add webhook URL: `https://yourdomain.com/api/payments/webhooks/flutterwave`
   - Select events: `charge.completed`

## Testing

### PayPal Testing
- Use PayPal Sandbox for testing
- Create sandbox buyer and seller accounts
- Test payments using sandbox credentials

### Paystack Testing
- Use test mode for development
- Test with test card numbers provided in dashboard
- Verify webhook callbacks

### Flutterwave Testing
- Use test mode for development
- Test with test card numbers
- Verify webhook callbacks

## Production Deployment

1. **Switch to Production Mode**
   - Update environment variables with production keys
   - Ensure webhook URLs are HTTPS
   - Test all payment flows

2. **Security Considerations**
   - Implement proper webhook signature verification
   - Use environment variables for all sensitive data
   - Monitor payment logs and errors

3. **Monitoring**
   - Set up logging for payment events
   - Monitor webhook delivery
   - Track payment success/failure rates

## API Endpoints

### Payment Processing
- `POST /api/payments/process` - Unified payment processing
- `POST /api/payments/paypal` - PayPal-specific processing
- `POST /api/payments/paystack` - Paystack-specific processing
- `POST /api/payments/flutterwave` - Flutterwave-specific processing

### Webhooks
- `POST /api/payments/webhooks/paypal` - PayPal webhook handler
- `POST /api/payments/webhooks/paystack` - Paystack webhook handler
- `POST /api/payments/webhooks/flutterwave` - Flutterwave webhook handler

### Tutor Settings
- `GET /api/tutor/payment-settings` - Get payment settings
- `PUT /api/tutor/payment-settings` - Update payment settings
- `GET /api/tutor/payments` - Get payment history

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL is accessible
   - Verify HTTPS for production
   - Check webhook signature verification

2. **Payment Processing Errors**
   - Verify API keys are correct
   - Check environment variables
   - Review payment gateway logs

3. **Database Errors**
   - Ensure Prisma migrations are applied
   - Check database connection
   - Verify schema matches code

### Debug Mode

Enable debug logging by adding to your `.env`:

```env
DEBUG_PAYMENTS=true
```

This will log all payment processing steps for debugging. 