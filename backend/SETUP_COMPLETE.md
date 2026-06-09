# Payment Gateway Setup - Complete Fix

## ✅ All Issues Resolved!

### Issue 1: Foreign Key Constraints ❌ → ✅
**Problem:** Migration tried to create foreign keys to non-existent `customers` and `products` tables

**Solution:** 
- Removed foreign key constraints from `payment_transactions` table
- Changed `customer_id` to nullable UUID (stores Supabase user ID)
- Changed `product_id` to nullable string (can be UUID or 'TOPUP-1')

**File:** `database/migrations/2025_11_10_084344_create_payment_transactions_table.php`

### Issue 2: Payment Channel Column Too Short ❌ → ✅
**Problem:** `payment_channel` column was 10 characters, but `TNG-EWALLET` is 11 characters

**Solution:**
- Increased `payment_channel` from VARCHAR(10) to VARCHAR(50)

**File:** `database/migrations/2025_11_10_084344_create_payment_transactions_table.php`

### Issue 3: Sessions Table Missing ❌ → ✅
**Problem:** Laravel tried to use database sessions but table doesn't exist

**Solution:**
- Changed `SESSION_DRIVER=database` to `SESSION_DRIVER=array` in `.env`
- Array driver stores sessions in memory (no database needed)
- Perfect for stateless payment gateway

**Files:** `.env` and `.env.example`

### Issue 4: Cache Table Missing ❌ → ✅
**Problem:** Laravel tried to use database cache but table doesn't exist

**Solution:**
- Changed `CACHE_STORE=database` to `CACHE_STORE=array` in `.env`
- Array driver stores cache in memory (no database needed)

**Files:** `.env` and `.env.example`

## Current Database Schema

### payment_transactions Table
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  customer_id UUID NULL,              -- Supabase user ID (no foreign key)
  product_id VARCHAR(255) NULL,       -- Can be UUID or 'TOPUP-1'
  order_id VARCHAR(255) UNIQUE,       -- WP-20251128-1234
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'MYR',
  payment_method VARCHAR(50),         -- credit, tng, grabpay, etc.
  payment_channel VARCHAR(50),        -- TNG-EWALLET, GrabPay, etc.
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  fiuu_transaction_id VARCHAR(255) NULL,
  fiuu_status_code VARCHAR(10) NULL,
  fiuu_response JSON NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

## Environment Configuration

### Required .env Settings
```env
# Session (use array for stateless gateway)
SESSION_DRIVER=array

# Cache (use array for stateless gateway)
CACHE_STORE=array

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=artventure
DB_USERNAME=root
DB_PASSWORD=

# Fiuu Payment Gateway
FIUU_MERCHANT_ID=your_merchant_id
FIUU_VERIFY_KEY=your_verify_key
FIUU_SECRET_KEY=your_secret_key

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

## Testing the Payment Flow

### 1. Start the Backend
```bash
cd artventure
php artisan serve --port=9002
```

### 2. Test Payment Initiation
```bash
curl -X POST http://localhost:9002/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "121d1462-5957-4ebe-b8e5-7b8658816995",
    "product_id": "TOPUP-1",
    "order_id": "TU-20251128-6468",
    "amount": 1,
    "payment_method": "tng",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "0123456789",
    "product_name": "Wallet Topup",
    "customer_country": "MY"
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-here",
    "payment_url": "https://pay.fiuu.com/...",
    "payment_data": { ... },
    "order_id": "TU-20251128-6468"
  }
}
```

## Payment Methods Supported

| Method | payment_method | payment_channel |
|--------|---------------|-----------------|
| Credit Card | `credit` | `credit` |
| Debit Card | `debit` | `credit` |
| FPX Banking | `fpx` | `fpx` |
| GrabPay | `grabpay` | `GrabPay` |
| Touch 'n Go | `tng` | `TNG-EWALLET` |
| Boost | `boost` | `BOOST` |

## Troubleshooting

### Check Logs
```bash
tail -f storage/logs/laravel.log
```

### Verify Database
```bash
php artisan tinker
>>> DB::table('payment_transactions')->count()
>>> DB::table('payment_transactions')->latest()->first()
```

### Clear Config Cache
```bash
php artisan config:clear
php artisan cache:clear
```

## What's Next?

1. ✅ Backend is now clean and working
2. ✅ Database migrations are fixed
3. ✅ Sessions and cache are configured
4. ✅ Payment channel supports all methods

**Ready to test the complete payment flow!** 🎉

---

**Last Updated:** 2025-11-28 12:20
**Status:** ✅ All Issues Resolved
