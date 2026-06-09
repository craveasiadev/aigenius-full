# Master Prompt: Frontend Integration with Internal WPay Backend

**CONTEXT FOR AI:**
You are working on a React frontend that connects to our **existing implementation of a custom internal Wallet & Payment system called "WPay"** hosted on our Laravel backend. WPay is NOT a public 3rd-party gateway; it is our own backend service.

**OBJECTIVE:**
Strictly follow the implementation patterns below. The backend API is finalized. Your job is to ensure the frontend uses the specific `wpayService` methods provided here to communicate with the backend.

**CRITICAL RULE:**
Do NOT mock these data points. You must Fetch real-time data from the Backend API.

---

## 1. Core Service: `src/services/wpayService.ts`
This is the **Primary Frontend Service** for communicating with the WPay backend. Use this class for all wallet interactions.

```typescript
import { API_BASE_URL } from '../config/api';

const WPAY_BASE_URL = API_BASE_URL;

const WPAY_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
};

// ============================================
// Types
// ============================================

export type TierType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip';
export type PaymentCategory = 'topup' | 'checkout';
export type PaymentType = 'online' | 'wbalance' | 'free';
export type PaymentMethod = 'card' | 'fpx' | 'grabpay' | 'tng';
export type WPayStatus = 'success' | 'pending' | 'failed';

export interface WPayProfile {
    email: string;
    lifetime_topups: number;
    wbalance: number;
    bonus: number;
    stars: number;
    tier_type: TierType;
    tier_factor: number;
}

export interface WPayProcessRequest {
    email: string;
    payment_category: PaymentCategory;
    payment_type: PaymentType;
    order_id: string;
    amount: number;
    payment_method?: PaymentMethod;
    customer_name?: string;
    customer_phone?: string;
    product_name?: string;
    customer_country?: string;
    metadata?: Record<string, any>;
}

export interface WPayTransactionDetails {
    amount: number;
    wbalance_used: number;
    bonus_used: number;
    stars_awarded: number;
}

export interface WPayResponse {
    wpay_status: WPayStatus;
    message?: string;
    email?: string;
    order_id?: string;
    transaction_id?: string;
    profile?: WPayProfile;
    payment_url?: string;
    payment_data?: Record<string, any>;
    transaction_details?: WPayTransactionDetails;
    expected_bonus?: number;
    errors?: Record<string, string[]>;
}

export interface WPayTransaction {
    id: string;
    order_id: string;
    email: string;
    payment_category: PaymentCategory;
    payment_type: PaymentType;
    amount: number;
    status: string;
    wbalance_used: number;
    bonus_used: number;
    stars_awarded: number;
    completed_at: string | null;
    created_at: string;
    metadata?: Record<string, any> | string;
}

// ============================================
// Service Class
// ============================================

class WPayService {
    // ... helper request() method omitted for brevity ...

    /**
     * Process a payment (Main Entry Point)
     */
    async processPayment(data: WPayProcessRequest): Promise<WPayResponse> {
        return this.request<WPayResponse>('/wpay/process', 'POST', data);
    }

    /**
     * Get user profile by email
     */
    async getProfile(email: string): Promise<{ wpay_status: WPayStatus; profile?: WPayProfile; message?: string }> {
        return this.request(`/wpay/profile/${encodeURIComponent(email)}`);
    }

    /**
     * Get transaction by order ID
     */
    async getTransaction(orderId: string): Promise<{
        wpay_status: WPayStatus;
        transaction?: WPayTransaction;
        profile?: WPayProfile;
        message?: string;
    }> {
        return this.request(`/wpay/transaction/${orderId}`);
    }

    /**
     * Get all tier information
     */
    async getTiers(): Promise<{ wpay_status: WPayStatus; tiers: WPayTier[] }> {
        return this.request('/wpay/tiers');
    }
}

export const wpayService = new WPayService();
```

---

## 2. Implementation Reference: `src/pages/ShopCheckout.tsx`
This shows how to handle the payment flow using `wpayService`.

### Handling Wallet Payment (W-Balance):
```typescript
      // For W-Balance payments, use WPay API
      console.log('[Payment] Processing W-Balance payment via WPay API');

      // Calculate gross amount (the true cost before bonus deduction)
      // because WPay handles the bonus deduction logic itself
      const grossPaymentAmount = total + (appliedBonusAmount || 0);

      const wpayResponse = await wpayService.processPayment({
        email: user.email,
        payment_category: 'checkout',
        payment_type: 'wbalance',
        order_id: orderNumber,
        amount: grossPaymentAmount,
        customer_name: user.name,
        customer_phone: user.phone || '',
        product_name: `Shop order ${orderNumber} - ${cartItems.length} item(s)`,
        metadata: {
          outlet_id: outletId,
          outlet_name: selectedOutlet?.name,
          items_count: cartItems.length,
          voucher_code: selectedVoucher ? (selectedVoucher.voucher || selectedVoucher).code : null,
          voucher_discount: calculateDiscount(),
          tier_discount: calculateTierDiscount(),
          use_bonus: appliedBonusAmount || 0 // Explicitly tell backend how much bonus to use
        }
      });

      if (wpayResponse.wpay_status !== 'success') {
        throw new Error(wpayResponse.message || 'Payment failed.');
      }
      
      // Success! Proceed to show Success Page using wpayResponse info...
```

### Handling Free Orders (Redemption):
```typescript
        // If whole amount is covered by bonus/vouchers
        const wpayResponse = await wpayService.processPayment({
          email: user.email,
          payment_category: 'checkout',
          payment_type: 'free', // Use 'free' payment type - uses only bonus
          order_id: orderNumber,
          amount: amountBeforeDiscounts, // The amount covered by bonus
          // ... other fields
          metadata: {
             // ...
            is_free_order: true
          }
        });
```

---

## 3. Implementation Reference: `src/pages/OrderSuccess.tsx`
How to verify transaction results on the success page.

```typescript
  useEffect(() => {
    // ...
    // If stars are 0, try to fetch from WPay API to get accurate stars_awarded
    if (order.stars_earned === 0 && order.order_number.startsWith('WP')) {
      wpayService.getTransaction(order.order_number).then((tx: any) => {
        const starsFn = tx?.stars_awarded ?? tx?.transaction?.stars_awarded;
        if (typeof starsFn === 'number' && starsFn > 0) {
           // Update local state with real value from backend
           setOrder(prev => prev ? ({ ...prev, stars_earned: starsFn }) : null);
        }
      });
    }
  }, [orderId, order]);
```

---

## 4. Backend API Endpoints (The "Truth")
These are the endpoints defined in `routes/web.php` that `wpayService` is hitting.

| HTTP Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/wpay/process` | **Process Payment.** Supports `wbalance`, `free`, and `online`. |
| `GET` | `/wpay/profile/{email}` | **Get Profile.** |
| `GET` | `/wpay/transaction/{orderId}` | **Get Transaction.** |
| `GET` | `/wpay/tiers` | **Get Tiers.** |

**Summary for AI:**
Use the `wpayService` class defined above for ALL wallet-related operations. Do not invent new API calls. Copy the implementation patterns from `ShopCheckout.tsx` and `OrderSuccess.tsx` to ensure consistency.
