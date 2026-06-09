# WPay System Setup Summary

## Files Created

### Laravel Backend (artventure/)

| File | Description |
|------|-------------|
| `database/migrations/2025_12_16_000001_create_wpay_users_table.php` | Migration for wpay_users table |
| `database/migrations/2025_12_16_000002_create_wpay_transactions_table.php` | Migration for wpay_transactions table |
| `app/Models/WPayUser.php` | Model for WPay users with tier logic |
| `app/Models/WPayTransaction.php` | Model for WPay transactions |
| `app/Services/WPayService.php` | Core business logic service |
| `app/Http/Controllers/WPayController.php` | API controller with all endpoints |
| `routes/wpay-test.php` | Test routes for debugging |
| `routes/web.php` | Updated with WPay routes |
| `bootstrap/app.php` | Updated to load test routes and CSRF exclusions |
| `WPAY_API_DOCS.md` | Complete API documentation |
| `BOLT_INTEGRATION_PROMPT.md` | Prompt to give to Bolt for frontend integration |

### React Frontend (project/)

| File | Description |
|------|-------------|
| `src/services/wpayService.ts` | WPay API service with TypeScript types |
| `src/pages/WPayCallback.tsx` | Payment callback page |

---

## Setup Steps

### 1. Run Database Migrations

```bash
cd artventure
php artisan migrate
```

This creates:
- `wpay_users` - Stores user wallet data
- `wpay_transactions` - Logs all transactions

### 2. Configure Environment Variables

Make sure your `.env` file has:

```env
APP_URL=https://app.aigenius.com.my
FRONTEND_URL=https://your-frontend-url.com

# Fiuu Configuration (existing)
FIUU_MERCHANT_ID=your_merchant_id
FIUU_VERIFY_KEY=your_verify_key
FIUU_SECRET_KEY=your_secret_key
```

### 3. Add Route to React App

Add the WPayCallback route to your router:

```tsx
// In App.tsx or your router file
import WPayCallback from './pages/WPayCallback';

// Add this route
<Route path="/wpay/callback" element={<WPayCallback />} />
```

### 4. Configure Frontend Environment

Add to your `.env` or `vite.config.ts`:

```env
VITE_WPAY_API_URL=https://app.aigenius.com.my
```

---

## Test the API

### Using Test Routes (Browser)

1. Start Laravel server: `php artisan serve`
2. Visit these URLs:

- `http://localhost:8000/wpay-test/full-flow` - Full flow test
- `http://localhost:8000/wpay-test/test-tiers` - Tier calculation test
- `http://localhost:8000/wpay-test/test-free-payment` - Free payment test
- `http://localhost:8000/wpay-test/test-wbalance-payment` - W-Balance payment test
- `http://localhost:8000/wpay-test/users` - View all users
- `http://localhost:8000/wpay-test/transactions` - View all transactions

### Using cURL

```bash
# Process a W-Balance payment
curl -X POST http://localhost:8000/wpay/process \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "payment_category": "checkout",
    "payment_type": "wbalance",
    "order_id": "TEST-123456",
    "amount": 50.00
  }'

# Get user profile
curl http://localhost:8000/wpay/profile/test@example.com

# Get tier information
curl http://localhost:8000/wpay/tiers
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wpay/process` | Process a payment |
| POST | `/wpay/callback` | Fiuu webhook (server-to-server) |
| GET/POST | `/wpay/return` | User return after payment |
| GET | `/wpay/profile/{email}` | Get user profile |
| GET | `/wpay/transaction/{orderId}` | Get transaction details |
| POST | `/wpay/topup-preview` | Preview topup rewards |
| GET | `/wpay/tiers` | Get tier information |

---

## Tier System

| Tier | Lifetime Topups | Star Multiplier | Topup Bonus |
|------|-----------------|-----------------|-------------|
| Bronze | RM0 - RM299 | 1.0x | 0% |
| Silver | RM300 - RM999 | 1.2x | 5% |
| Gold | RM1,000 - RM2,499 | 1.5x | 10% |
| Platinum | RM2,500 - RM4,999 | 2.0x | 15% |
| VIP | RM5,000+ | 3.0x | 20% |

---

## Payment Types

1. **Online** (`payment_type: "online"`)
   - Redirects to Fiuu payment gateway
   - Returns `wpay_status: "pending"` with `payment_url`
   - User redirected back to `/wpay/callback` after payment

2. **W-Balance** (`payment_type: "wbalance"`)
   - Uses bonus first, then wbalance
   - Immediate response with `wpay_status: "success"`
   - Profile updated instantly

3. **Free** (`payment_type: "free"`)
   - Uses only bonus balance
   - Requires bonus >= amount
   - Immediate response with `wpay_status: "success"`

---

## Next Steps

1. ✅ Run migrations to create database tables
2. ✅ Test API endpoints using test routes
3. ✅ Add WPayCallback route to React app
4. ✅ Give BOLT_INTEGRATION_PROMPT.md to Bolt for full frontend integration
5. ⬜ Update existing checkout/topup pages to use WPay
6. ⬜ Create profile component showing tier and balances
7. ⬜ Remove old payment system when WPay is fully integrated

---

## Troubleshooting

### Migration Error
If you get a database connection error:
1. Check `.env` has correct database credentials
2. MySQL/MariaDB service is running
3. Database exists

### CORS Errors
The Laravel app should allow requests from your frontend. Check `config/cors.php`.

### CSRF Token Errors
WPay routes are excluded from CSRF in `bootstrap/app.php`. If you still get errors:
1. Check the routes start with `/wpay/`
2. Clear config cache: `php artisan config:clear`

### Payment Gateway Not Responding
1. Check Fiuu credentials in `.env`
2. Check network connectivity to Fiuu servers
3. Look at Laravel logs: `storage/logs/laravel.log`
