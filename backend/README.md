# Fiuu Payment Gateway - Laravel Backend

## Overview

This Laravel backend serves **ONLY** as a payment gateway proxy for Fiuu (formerly MOLPay/Razer). It handles:
- Payment initiation
- Fiuu webhook callbacks
- User redirects after payment

**All other functionality** (users, orders, products, etc.) is handled by the React frontend with Supabase database.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  React Frontend │────────▶│ Laravel Backend  │────────▶│ Fiuu Gateway│
│   (Supabase DB) │         │ (Payment Proxy)  │         │             │
└─────────────────┘         └──────────────────┘         └─────────────┘
        │                            │                           │
        │                            │◀──────────────────────────┘
        │                            │  Webhook Callback
        │◀───────────────────────────┘
        │      Redirect with status
        │
        └──▶ Updates shop_orders in Supabase
```

## Files Structure

### Controllers
- `app/Http/Controllers/PaymentController.php` - Handles all payment operations

### Models
- `app/Models/PaymentTransaction.php` - Stores payment transaction records

### Services
- `app/Services/FiuuPaymentService.php` - Fiuu API integration

### Migrations
- `2025_11_10_084344_create_payment_transactions_table.php` - Payment transactions table
- `2025_11_11_023730_modify_payment_transactions_table.php` - Add shop_order_id and wallet_transaction_id

### Routes (`routes/web.php`)
```php
POST   /payments/initiate              # Initiate payment
POST   /payments/callback              # Fiuu webhook (server-to-server)
GET    /payments/return                # User redirect after payment
GET    /payments/transaction/{orderId} # Get transaction status
GET    /health                         # Health check
```

## Environment Variables

Add these to your `.env` file:

```env
# Application
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Database (SQLite for payment transactions only)
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database.sqlite

# Fiuu Payment Gateway
FIUU_MERCHANT_ID=your_merchant_id
FIUU_VERIFY_KEY=your_verify_key
FIUU_SECRET_KEY=your_secret_key
```

## Installation

### 1. Install Dependencies
```bash
composer install
```

### 2. Setup Database
```bash
# Create SQLite database
touch database/database.sqlite

# Run migrations
php artisan migrate
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Fiuu credentials
```

### 4. Start Server
```bash
php artisan serve
```

The backend will run on `http://localhost:8000`

## Payment Flow

### 1. Payment Initiation (Frontend → Backend)
```javascript
// React frontend calls
POST /payments/initiate
{
  "customer_id": "uuid",
  "product_id": "uuid",
  "order_id": "WP-20251128-1234",
  "amount": 10.00,
  "payment_method": "credit",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "0123456789",
  "product_name": "Ice Cream",
  "customer_country": "MY"
}

// Backend responds with
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "payment_url": "https://pay.fiuu.com/...",
    "payment_data": { ... },
    "order_id": "WP-20251128-1234"
  }
}
```

### 2. User Pays on Fiuu Gateway
User is redirected to Fiuu payment page and completes payment.

### 3. Webhook Callback (Fiuu → Backend)
```
POST /payments/callback
- Fiuu sends payment result
- Backend verifies signature
- Updates payment_transactions table
- Returns "RECEIVEOK" to Fiuu
```

### 4. User Redirect (Backend → Frontend)
```
GET /payments/return?order_id=WP-xxx&status=success
- Backend redirects user to frontend
- Frontend URL: /payment/callback?order_id=WP-xxx&status=success
```

### 5. Frontend Updates Supabase
```javascript
// PaymentCallback.tsx
- Fetches payment_transactions from backend
- Updates shop_orders in Supabase
- Generates QR code
- Sets payment_status = 'completed'
- Displays success message
```

## Database Schema

### payment_transactions (SQLite)
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  customer_id UUID,
  product_id UUID,
  shop_order_id UUID,           -- Links to Supabase shop_orders.id
  wallet_transaction_id UUID,   -- Links to Supabase wallet_transactions.id
  order_id VARCHAR,             -- Unique order number (WP-xxx)
  amount DECIMAL(10,2),
  currency VARCHAR DEFAULT 'MYR',
  payment_method VARCHAR,
  payment_channel VARCHAR,
  status VARCHAR,               -- pending, completed, failed
  fiuu_transaction_id VARCHAR,
  fiuu_status_code VARCHAR,
  fiuu_response JSON,
  metadata JSON,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## API Endpoints

### POST /payments/initiate
Initiates a payment transaction.

**Request:**
```json
{
  "customer_id": "uuid",
  "order_id": "WP-20251128-1234",
  "amount": 10.00,
  "payment_method": "credit"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "payment_url": "https://pay.fiuu.com/...",
    "order_id": "WP-20251128-1234"
  }
}
```

### POST /payments/callback
Webhook endpoint for Fiuu payment notifications (server-to-server).

**Fiuu sends:**
```
orderid, status, tranID, amount, skey, etc.
```

**Response:**
```
RECEIVEOK
```

### GET /payments/return
User redirect endpoint after payment.

**Query params:**
```
orderid, status, status_code, tranID
```

**Action:**
Redirects to frontend: `{FRONTEND_URL}/payment/callback?order_id=xxx&status=success`

### GET /payments/transaction/{orderId}
Get transaction details by order ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_id": "WP-xxx",
    "amount": 10.00,
    "status": "completed",
    ...
  }
}
```

## Security

### Webhook Verification
All Fiuu callbacks are verified using HMAC signature:

```php
$string = $tranID . $orderId . $status . $domain . $amount . $currency . $appcode . $paydate . $secretKey;
$expectedSkey = md5($string);

if ($skey !== $expectedSkey) {
    return response('INVALID SIGNATURE', 400);
}
```

### CORS
Configure CORS in `config/cors.php` to allow requests from your React frontend:

```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173')
],
```

## Troubleshooting

### Check Logs
```bash
tail -f storage/logs/laravel.log
```

### Test Payment Flow
```bash
# Check health
curl http://localhost:8000/health

# Test payment initiation
curl -X POST http://localhost:8000/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST-123","amount":1.00,"payment_method":"credit"}'
```

### Common Issues

**Issue:** Payment callback not received
- Check Fiuu dashboard webhook URL configuration
- Ensure backend is publicly accessible (use ngrok for local testing)
- Check `storage/logs/laravel.log` for errors

**Issue:** Invalid signature error
- Verify `FIUU_SECRET_KEY` in `.env` matches Fiuu dashboard
- Check webhook payload in logs

**Issue:** Frontend not updating order
- Check browser console for errors
- Verify redirect URL is correct
- Check Supabase RLS policies

## Deployment

### Production Checklist
- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false` in `.env`
- [ ] Configure production database (MySQL/PostgreSQL recommended)
- [ ] Set correct `APP_URL` and `FRONTEND_URL`
- [ ] Add Fiuu production credentials
- [ ] Configure HTTPS
- [ ] Set up proper logging
- [ ] Configure queue workers for async processing (optional)

### Ngrok for Local Testing
```bash
# Start Laravel
php artisan serve

# In another terminal, start ngrok
ngrok http 8000

# Update Fiuu dashboard with ngrok URL:
# Callback URL: https://your-ngrok-url.ngrok.io/payments/callback
# Return URL: https://your-ngrok-url.ngrok.io/payments/return
```

## Removed Dependencies

The following Laravel features are **NOT** needed and can be removed:

### Sanctum (API Authentication)
```bash
composer remove laravel/sanctum
```

### Unused Packages
```bash
# If you don't need these, remove them:
composer remove laravel/tinker
composer remove laravel/pint
```

## Support

For Fiuu integration issues, refer to:
- [Fiuu Documentation](https://fiuu.com/developers)
- [Fiuu Support](https://fiuu.com/support)

For Laravel issues:
- [Laravel Documentation](https://laravel.com/docs)

---

**Last Updated:** 2025-11-28
**Version:** 1.0.0
