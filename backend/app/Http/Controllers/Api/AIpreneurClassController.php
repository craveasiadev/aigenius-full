<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIpreneurClassSlot;
use App\Models\AIpreneurClassBooking;
use App\Mail\BookingConfirmed;
use App\Services\FiuuPaymentService;
use App\Services\PaymentGatewayModeService;
use App\Services\ToyyibPayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AIpreneurClassController extends Controller
{
    protected FiuuPaymentService $fiuuService;
    protected ToyyibPayService $toyyibPayService;
    protected PaymentGatewayModeService $gatewayModeService;

    public function __construct(
        FiuuPaymentService $fiuuService,
        ToyyibPayService $toyyibPayService,
        PaymentGatewayModeService $gatewayModeService
    )
    {
        $this->fiuuService = $fiuuService;
        $this->toyyibPayService = $toyyibPayService;
        $this->gatewayModeService = $gatewayModeService;
    }

    public function getClasses(Request $request)
    {
        $profile = $request->genius_profile;

        $classes = \App\Models\AIpreneurClass::query()
            ->where('is_active', true)
            ->with(['slots' => function ($query) {
                $query->orderBy('start_time');
            }])
            ->orderBy('category')
            ->orderBy('title')
            ->get();

        $bookings = AIpreneurClassBooking::query()
            ->where('student_id', $profile->id)
            ->with(['slot.course'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'classes' => $classes,
            'bookings' => $bookings,
        ]);
    }

    public function bookClass(Request $request)
    {
        $profile = $request->genius_profile;

        $validated = $request->validate([
            'slot_id' => 'required|uuid|exists:aipreneur_class_slots,id',
            'payment_method' => 'required|string|in:fpx,card,tng,grabpay,boost,pay_later',
            'customer_name' => 'required|string',
            'customer_email' => 'required|email',
            'frontend_url' => 'required|string',
            'customer_phone' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $profile, $request) {
            $slot = AIpreneurClassSlot::lockForUpdate()->with('course')->find($validated['slot_id']);

            if (!$slot || !$slot->course) {
                return response()->json(['success' => false, 'message' => 'Slot not found.'], 404);
            }

            if ($slot->status !== 'open') {
                return response()->json(['success' => false, 'message' => 'This slot is not available.'], 400);
            }

            if ($slot->booked_count >= $slot->capacity) {
                $slot->update(['status' => 'full']);
                return response()->json(['success' => false, 'message' => 'This slot is full.'], 400);
            }

            $orderId = 'CLASS-' . now()->timestamp . '-' . strtoupper(Str::random(6));
            $amount = $slot->course->price;

            $booking = AIpreneurClassBooking::create([
                'slot_id' => $slot->id,
                'student_id' => $profile->id,
                'parent_id' => $profile->parent_id,
                'order_id' => $orderId,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'amount' => $amount,
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'pending',
                'status' => 'pending',
            ]);

            if ((float) $amount <= 0) {
                $booking->update([
                    'payment_status' => 'completed',
                    'status' => 'confirmed',
                    'paid_at' => now(),
                ]);

                $slot->increment('booked_count');
                if ($slot->booked_count >= $slot->capacity) {
                    $slot->update(['status' => 'full']);
                }

                $this->sendBookingEmail($booking, $slot, 'confirmed');

                return response()->json([
                    'success' => true,
                    'booking' => $booking,
                    'message' => 'Booking confirmed (free slot).',
                ]);
            }

            if ($validated['payment_method'] === 'pay_later') {
                $booking->update([
                    'payment_status' => 'pay_later',
                    'status' => 'reserved',
                    'paid_at' => null,
                ]);

                $slot->increment('booked_count');
                if ($slot->booked_count >= $slot->capacity) {
                    $slot->update(['status' => 'full']);
                }

                $this->sendBookingEmail($booking, $slot, 'pay_later');

                return response()->json([
                    'success' => true,
                    'booking' => $booking,
                    'message' => 'Seat reserved. Payment can be made during workshop check-in.',
                ]);
            }

            $paymentData = $this->initiateGatewayPayment(
                $amount,
                $orderId,
                $validated['customer_name'],
                $validated['customer_email'],
                $request->input('customer_phone', '0123456789'),
                'AIpreneur Class: ' . $slot->course->title,
                $validated['payment_method'],
                $validated['frontend_url']
            );

            Log::info('[AIpreneur Class] Payment initiated', [
                'booking_id' => $booking->id,
                'order_id' => $orderId,
                'amount' => $amount,
            ]);

            return response()->json([
                'success' => true,
                'booking' => $booking,
                'payment_url' => $paymentData['payment_url'],
                'payment_data' => $paymentData['form_data'],
                'order_id' => $orderId,
                'provider' => $paymentData['provider'],
                'gateway_mode' => $paymentData['gateway_mode'],
            ], 201);
        });
    }

    public function paymentCallback(Request $request)
    {
        try {
            Log::info('[AIpreneur Class] Callback received', $request->all());
            $gateway = $this->resolveGateway($request);

            if ($gateway === 'toyyibpay') {
                $callbackData = $this->toyyibPayService->parseCallbackData($request);
                $orderId = $callbackData['external_reference'] ?? $request->query('order_id');

                $booking = $orderId ? AIpreneurClassBooking::where('order_id', $orderId)->first() : null;
                if (!$booking) {
                    Log::error('[AIpreneur Class][ToyyibPay] Booking not found', [
                        'order_id' => $orderId,
                        'callback' => $callbackData,
                    ]);
                    return response('BOOKING NOT FOUND', 404);
                }

                $paymentStatus = match ($callbackData['status']) {
                    'success' => 'completed',
                    'pending' => 'pending',
                    default => 'failed',
                };

                $this->applyBookingPaymentStatus($booking, $paymentStatus);

                Log::info('[AIpreneur Class][ToyyibPay] Callback processed', [
                    'order_id' => $booking->order_id,
                    'status' => $paymentStatus,
                ]);

                return response('OK', 200);
            }

            // Default gateway: Fiuu
            $isValid = $this->fiuuService->verifyCallback($request->all());
            if (!$isValid) {
                Log::error('[AIpreneur Class] Invalid callback signature');
                return response('INVALID SIGNATURE', 400);
            }

            $orderId = $request->input('orderid');
            $status = $request->input('status');
            $statusCode = $request->input('status_code', $status);
            $booking = AIpreneurClassBooking::where('order_id', $orderId)->first();

            if (!$booking) {
                Log::error('[AIpreneur Class] Booking not found: ' . $orderId);
                return response('BOOKING NOT FOUND', 404);
            }

            $paymentStatus = ($status == '1' || $statusCode == '00') ? 'completed' : 'failed';
            $this->applyBookingPaymentStatus($booking, $paymentStatus);

            Log::info('[AIpreneur Class] Payment ' . $paymentStatus . ' for order: ' . $orderId);
            return response('RECEIVEOK', 200);
        } catch (\Exception $e) {
            Log::error('[AIpreneur Class] Callback error: ' . $e->getMessage());
            return response('ERROR', 500);
        }
    }

    public function paymentReturn(Request $request)
    {
        try {
            $gateway = $this->resolveGateway($request);
            $frontendUrl = $request->input('frontend_url', config('app.frontend_url'));
            $orderId = null;
            $tranID = null;
            $paymentStatus = 'failed';

            if ($gateway === 'toyyibpay') {
                $callbackData = $this->toyyibPayService->parseCallbackData($request);
                $orderId = $callbackData['external_reference'] ?? $request->query('order_id');
                $tranID = $callbackData['transaction_id'] ?? $callbackData['bill_code'];
                $paymentStatus = $callbackData['status'] === 'success' ? 'success' : 'failed';
            } else {
                $orderId = $request->input('orderid');
                $status = $request->input('status');
                $statusCode = $request->input('status_code', $status);
                $tranID = $request->input('tranID');
                $paymentStatus = ($status == '1' || $statusCode == '00') ? 'success' : 'failed';
            }

            $booking = $orderId ? AIpreneurClassBooking::where('order_id', $orderId)->first() : null;
            if ($booking && $paymentStatus === 'success' && $booking->payment_status !== 'completed') {
                $this->applyBookingPaymentStatus($booking, 'completed');
                $booking = $booking->fresh();
            }

            $safeOrderId = $orderId ?? 'unknown';
            $redirectUrl = "{$frontendUrl}/payment/callback?order_id={$safeOrderId}&status={$paymentStatus}&source=class";

            if ($booking) {
                $redirectUrl .= "&amount={$booking->amount}";
                $redirectUrl .= "&booking_id={$booking->id}";
            }

            if ($tranID) {
                $redirectUrl .= "&tran_id={$tranID}";
            }

            return redirect($redirectUrl);
        } catch (\Exception $e) {
            Log::error('[AIpreneur Class] Return error: ' . $e->getMessage());
            $frontendUrl = $request->input('frontend_url', config('app.frontend_url'));
            $orderId = $request->input('orderid', $request->query('order_id', 'unknown'));
            return redirect("{$frontendUrl}/payment/callback?status=failed&order_id={$orderId}&source=class");
        }
    }

    public function getParentBookings(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'parent') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $bookings = AIpreneurClassBooking::with(['slot.course', 'student'])
            ->where('parent_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'bookings' => $bookings,
        ]);
    }

    /**
     * Get class catalog for parents (browse available classes + slots).
     */
    public function getParentClassCatalog(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'parent') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $classes = \App\Models\AIpreneurClass::query()
            ->where('is_active', true)
            ->with(['slots' => function ($query) {
                $query->orderBy('start_time');
            }])
            ->orderBy('category')
            ->orderBy('title')
            ->get();

        // Get parent's children (model appends first_name, avatar_url via accessors)
        $children = \App\Models\GeniusProfile::where('parent_id', $user->id)->get();

        // Get existing bookings for this parent's children
        $bookings = AIpreneurClassBooking::with(['slot.course', 'student'])
            ->where('parent_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'classes' => $classes,
            'children' => $children,
            'bookings' => $bookings,
        ]);
    }

    /**
     * Book a class slot on behalf of a child (parent auth).
     */
    public function bookClassForChild(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'parent') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'slot_id' => 'required|uuid|exists:aipreneur_class_slots,id',
            'student_id' => 'required|uuid|exists:genius_profiles,id',
            'payment_method' => 'required|string|in:fpx,card,tng,grabpay,boost,pay_later',
            'customer_name' => 'required|string',
            'customer_email' => 'required|email',
            'frontend_url' => 'required|string',
            'customer_phone' => 'nullable|string',
        ]);

        // Verify the child belongs to this parent
        $child = \App\Models\GeniusProfile::where('id', $validated['student_id'])
            ->where('parent_id', $user->id)
            ->first();

        if (!$child) {
            return response()->json(['success' => false, 'message' => 'Child not found or does not belong to you.'], 403);
        }

        return DB::transaction(function () use ($validated, $user, $child, $request) {
            $slot = AIpreneurClassSlot::lockForUpdate()->with('course')->find($validated['slot_id']);

            if (!$slot || !$slot->course) {
                return response()->json(['success' => false, 'message' => 'Slot not found.'], 404);
            }

            if ($slot->status !== 'open') {
                return response()->json(['success' => false, 'message' => 'This slot is not available.'], 400);
            }

            if ($slot->booked_count >= $slot->capacity) {
                $slot->update(['status' => 'full']);
                return response()->json(['success' => false, 'message' => 'This slot is full.'], 400);
            }

            $orderId = 'CLASS-' . now()->timestamp . '-' . strtoupper(Str::random(6));
            $amount = $slot->course->price;

            $booking = AIpreneurClassBooking::create([
                'slot_id' => $slot->id,
                'student_id' => $child->id,
                'parent_id' => $user->id,
                'order_id' => $orderId,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'amount' => $amount,
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'pending',
                'status' => 'pending',
            ]);

            if ((float) $amount <= 0) {
                $booking->update([
                    'payment_status' => 'completed',
                    'status' => 'confirmed',
                    'paid_at' => now(),
                ]);

                $slot->increment('booked_count');
                if ($slot->booked_count >= $slot->capacity) {
                    $slot->update(['status' => 'full']);
                }

                $this->sendBookingEmail($booking, $slot, 'confirmed');

                return response()->json([
                    'success' => true,
                    'booking' => $booking,
                    'message' => 'Booking confirmed (free slot).',
                ]);
            }

            if ($validated['payment_method'] === 'pay_later') {
                $booking->update([
                    'payment_status' => 'pay_later',
                    'status' => 'reserved',
                    'paid_at' => null,
                ]);

                $slot->increment('booked_count');
                if ($slot->booked_count >= $slot->capacity) {
                    $slot->update(['status' => 'full']);
                }

                $this->sendBookingEmail($booking, $slot, 'pay_later');

                return response()->json([
                    'success' => true,
                    'booking' => $booking,
                    'message' => 'Seat reserved. Payment can be made during workshop check-in.',
                ]);
            }

            $paymentData = $this->initiateGatewayPayment(
                $amount,
                $orderId,
                $validated['customer_name'],
                $validated['customer_email'],
                $request->input('customer_phone', '0123456789'),
                'AIpreneur Class: ' . $slot->course->title . ' (for ' . $child->first_name . ')',
                $validated['payment_method'],
                $validated['frontend_url']
            );

            Log::info('[AIpreneur Class] Parent booking - Payment initiated', [
                'booking_id' => $booking->id,
                'order_id' => $orderId,
                'parent_id' => $user->id,
                'student_id' => $child->id,
                'amount' => $amount,
            ]);

            return response()->json([
                'success' => true,
                'booking' => $booking,
                'payment_url' => $paymentData['payment_url'],
                'payment_data' => $paymentData['form_data'],
                'order_id' => $orderId,
                'provider' => $paymentData['provider'],
                'gateway_mode' => $paymentData['gateway_mode'],
            ], 201);
        });
    }

    /**
     * @return array{payment_url:string, form_data:array<string, mixed>, provider:string, gateway_mode:string}
     */
    private function initiateGatewayPayment(
        float $amount,
        string $orderId,
        string $customerName,
        string $customerEmail,
        string $customerPhone,
        string $description,
        string $paymentMethod,
        string $frontendUrl
    ): array {
        $gatewayMode = $this->gatewayModeService->getMode();

        if ($gatewayMode === PaymentGatewayModeService::MODE_SANDBOX) {
            $callbackUrl = config('app.url') . '/aipreneur/classes/payment/callback?gateway=toyyibpay&order_id=' . urlencode($orderId);
            $returnUrl = config('app.url') . '/aipreneur/classes/payment/return?gateway=toyyibpay&order_id=' . urlencode($orderId) . '&frontend_url=' . urlencode($frontendUrl);

            $billData = $this->toyyibPayService->createBill([
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'bill_name' => 'AIpreneur Class Booking',
                'bill_description' => $description,
                'external_reference' => $orderId,
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $customerPhone,
                'callback_url' => $callbackUrl,
                'return_url' => $returnUrl,
            ]);

            return [
                'payment_url' => $billData['payment_url'],
                'form_data' => [],
                'provider' => 'toyyibpay',
                'gateway_mode' => $gatewayMode,
            ];
        }

        $fiuuData = $this->fiuuService->generatePaymentData(
            $amount,
            $orderId,
            $customerName,
            $customerEmail,
            $customerPhone,
            $description,
            'MY',
            $paymentMethod,
            config('app.url') . '/aipreneur/classes/payment/callback',
            config('app.url') . '/aipreneur/classes/payment/return?frontend_url=' . urlencode($frontendUrl)
        );

        return [
            'payment_url' => $fiuuData['payment_url'],
            'form_data' => $fiuuData['form_data'],
            'provider' => 'fiuu',
            'gateway_mode' => $gatewayMode,
        ];
    }

    private function resolveGateway(Request $request): string
    {
        $explicit = strtolower((string) $request->input('gateway', $request->query('gateway', '')));
        if (in_array($explicit, ['fiuu', 'toyyibpay'], true)) {
            return $explicit;
        }

        if ($request->has('billcode') || $request->has('BillCode') || $request->has('status_id') || $request->has('refno')) {
            return 'toyyibpay';
        }

        return 'fiuu';
    }

    private function applyBookingPaymentStatus(AIpreneurClassBooking $booking, string $paymentStatus): void
    {
        DB::transaction(function () use ($booking, $paymentStatus) {
            /** @var AIpreneurClassBooking|null $lockedBooking */
            $lockedBooking = AIpreneurClassBooking::lockForUpdate()->find($booking->id);
            if (!$lockedBooking) {
                return;
            }

            if ($paymentStatus === 'completed') {
                if ($lockedBooking->payment_status === 'completed') {
                    return;
                }

                $lockedBooking->update([
                    'payment_status' => 'completed',
                    'status' => 'confirmed',
                    'paid_at' => $lockedBooking->paid_at ?? now(),
                ]);

                $slot = AIpreneurClassSlot::lockForUpdate()->find($lockedBooking->slot_id);
                if ($slot) {
                    $slot->increment('booked_count');
                    if ($slot->booked_count >= $slot->capacity) {
                        $slot->update(['status' => 'full']);
                    }

                    $this->sendBookingEmail($lockedBooking->fresh(), $slot->fresh(), 'confirmed');
                }

                return;
            }

            if ($lockedBooking->payment_status === 'completed') {
                return;
            }

            if ($paymentStatus === 'pending') {
                $lockedBooking->update([
                    'payment_status' => 'pending',
                    'status' => 'pending',
                    'paid_at' => null,
                ]);

                return;
            }

            $lockedBooking->update([
                'payment_status' => 'failed',
                'status' => 'failed',
                'paid_at' => null,
            ]);
        });
    }

    protected function sendBookingEmail(AIpreneurClassBooking $booking, AIpreneurClassSlot $slot, string $status): void
    {
        try {
            $email = $booking->customer_email;
            if (!$email) {
                return;
            }

            Mail::to($email)->send(new BookingConfirmed($booking, $slot, $status));
        } catch (\Exception $e) {
            Log::warning('[AIpreneur Class] Email failed: ' . $e->getMessage());
        }
    }
}
