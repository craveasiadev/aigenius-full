<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\PaymentGatewayModeService;
use App\Services\ToyyibPayService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class PaymentModeController extends Controller
{
    public function index(Request $request, PaymentGatewayModeService $modeService, ToyyibPayService $toyyibPayService): View
    {
        $mode = $modeService->getMode();
        $provider = $mode === PaymentGatewayModeService::MODE_SANDBOX ? 'toyyibpay' : 'fiuu';

        $source = (string) $request->input('source', '');
        $status = (string) $request->input('status', '');

        $transactionsQuery = $this->applyFilters($this->transactionBaseQuery(), $source, $status)
            ->orderByDesc('created_at');

        $transactions = $transactionsQuery
            ->paginate(40, ['*'], 'page')
            ->withQueryString();

        $summaryBase = $this->transactionBaseQuery();
        $successStatuses = ['success', 'completed', 'pay_later'];
        $pendingStatuses = ['pending', 'processing'];
        $failedStatuses = ['failed', 'cancelled', 'error'];

        $summary = [
            'total_count' => (int) (clone $summaryBase)->count(),
            'success_count' => (int) (clone $summaryBase)->whereIn('status', $successStatuses)->count(),
            'pending_count' => (int) (clone $summaryBase)->whereIn('status', $pendingStatuses)->count(),
            'failed_count' => (int) (clone $summaryBase)->whereIn('status', $failedStatuses)->count(),
            'total_amount' => (float) (clone $summaryBase)->sum('amount'),
            'success_amount' => (float) (clone $summaryBase)->whereIn('status', $successStatuses)->sum('amount'),
        ];

        $availableStatuses = (clone $this->transactionBaseQuery())
            ->select('status')
            ->distinct()
            ->orderBy('status')
            ->pluck('status')
            ->filter(fn ($value) => !empty($value))
            ->values();

        return view('superadmin.payment-mode', [
            'superadmin' => $request->attributes->get('superadmin'),
            'mode' => $mode,
            'provider' => $provider,
            'availableModes' => $modeService->allowedModes(),
            'toyyibConfigured' => $toyyibPayService->isConfigured(),
            'transactions' => $transactions,
            'summary' => $summary,
            'sourceFilter' => $source,
            'statusFilter' => $status,
            'availableStatuses' => $availableStatuses,
            'sources' => ['WPay', 'AI Tokens', 'Workshop'],
        ]);
    }

    public function update(Request $request, PaymentGatewayModeService $modeService): RedirectResponse
    {
        $validated = $request->validate([
            'mode' => ['required', 'string', Rule::in($modeService->allowedModes())],
        ]);

        $superadmin = $request->attributes->get('superadmin');
        $updatedMode = $modeService->setMode($validated['mode'], $superadmin?->id);
        $provider = $updatedMode === PaymentGatewayModeService::MODE_SANDBOX ? 'ToyyibPay' : 'Fiuu';

        return redirect()
            ->route('admin.payment.mode')
            ->with('status', "Payment mode updated to {$updatedMode} ({$provider}).");
    }

    private function applyFilters($query, string $source, string $status)
    {
        if ($source !== '') {
            $query->where('source', $source);
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        return $query;
    }

    private function transactionBaseQuery()
    {
        $wpaySource = strtolower((string) config('wpay.superadmin_app_source', 'artventure'));

        $walletTransactions = DB::table('wpay_transactions as wt')
            ->selectRaw("
                'WPay' as source,
                wt.order_id as order_id,
                wt.email as customer,
                wt.amount as amount,
                wt.status as status,
                wt.created_at as created_at
            ")
            ->where('wt.app_source', $wpaySource);

        $tokenTransactions = DB::table('aigenius_purchases as ap')
            ->leftJoin('genius_profiles as gp', 'gp.id', '=', 'ap.student_id')
            ->selectRaw("
                'AI Tokens' as source,
                ap.order_id as order_id,
                COALESCE(gp.genius_name, ap.student_id) as customer,
                ap.amount_paid as amount,
                ap.status as status,
                ap.created_at as created_at
            ");

        $workshopTransactions = DB::table('aipreneur_class_bookings as cb')
            ->leftJoin('genius_profiles as gp2', 'gp2.id', '=', 'cb.student_id')
            ->selectRaw("
                'Workshop' as source,
                cb.order_id as order_id,
                COALESCE(NULLIF(cb.customer_name, ''), gp2.genius_name, cb.student_id) as customer,
                cb.amount as amount,
                cb.payment_status as status,
                cb.created_at as created_at
            ");

        $walletTransactions->unionAll($tokenTransactions)->unionAll($workshopTransactions);

        return DB::query()->fromSub($walletTransactions, 'transactions');
    }
}

