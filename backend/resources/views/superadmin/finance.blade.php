@extends('superadmin.layout')

@section('title', 'Finance')
@section('header', 'Financial Overview')

@section('content')
<div x-data="{ detailOpen: false, detail: null, newStatus: '' }">

<!-- Finance Stats Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
    <!-- WPay Revenue -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex flex-col">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">WPay Revenue</p>
            <div class="flex items-center gap-2 mt-2">
                <div class="p-2 bg-pink-50 dark:bg-pink-500/10 rounded-lg text-pink-600 dark:text-pink-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p class="text-xl font-bold text-slate-900 dark:text-white">RM {{ number_format($walletRevenue, 2) }}</p>
            </div>
        </div>
    </div>

    <!-- AI Token Revenue -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex flex-col">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">AI Token Revenue</p>
            <div class="flex items-center gap-2 mt-2">
                <div class="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <p class="text-xl font-bold text-slate-900 dark:text-white">RM {{ number_format($tokenRevenue, 2) }}</p>
            </div>
        </div>
    </div>

    <!-- Workshop Paid -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex flex-col">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Workshop Paid</p>
            <div class="flex items-center gap-2 mt-2">
                <div class="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p class="text-xl font-bold text-slate-900 dark:text-white">RM {{ number_format($classPaidRevenue, 2) }}</p>
            </div>
        </div>
    </div>

    <!-- Workshop Pay Later -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex flex-col">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Workshop Pay Later</p>
            <div class="flex items-center gap-2 mt-2">
                <div class="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p class="text-xl font-bold text-slate-900 dark:text-white">RM {{ number_format($classPayLaterRevenue, 2) }}</p>
            </div>
        </div>
    </div>

    <!-- Overall Sales -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow ring-2 ring-indigo-500/10 dark:ring-indigo-400/20">
        <div class="flex flex-col">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Sales</p>
            <div class="flex items-center gap-2 mt-2">
                <div class="p-2 bg-indigo-600 rounded-lg text-white">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p class="text-xl font-bold text-slate-900 dark:text-white">RM {{ number_format($overallRevenue, 2) }}</p>
            </div>
        </div>
    </div>
</div>

<!-- Recent Sales Table -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">Recent Sales Feed</h3>
        <a href="{{ route('superadmin.finance.export') }}" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
        </a>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                    <th class="px-6 py-4">Source</th>
                    <th class="px-6 py-4">Order ID</th>
                    <th class="px-6 py-4">Customer</th>
                    <th class="px-6 py-4">Amount</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4">Date</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($financeRows as $row)
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    @click="detail = {{ json_encode($row) }}; newStatus = '{{ $row['status'] }}'; detailOpen = true">
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase border border-slate-200 dark:border-slate-700">
                            {{ $row['source'] }}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">{{ $row['order_id'] }}</td>
                    <td class="px-6 py-4">{{ $row['customer'] ?? '-' }}</td>
                    <td class="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">RM {{ number_format((float) $row['amount'], 2) }}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                    {{ in_array($row['status'], ['success', 'completed', 'pay_later']) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' }}">
                            {{ str_replace('_', ' ', $row['status']) }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-xs text-slate-500">{{ optional($row['created_at'])->format('d M Y, h:i A') }}</td>
                    <td class="px-6 py-4">
                        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-slate-500">No finance transactions found.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>

<!-- Detail Modal -->
<div x-show="detailOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="detailOpen = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="detailOpen = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto" x-show="detailOpen" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Transaction Details</h3>
            <button @click="detailOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <div class="p-6 space-y-4" x-show="detail">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Source</p>
                    <p class="text-sm font-bold text-slate-900 dark:text-white uppercase" x-text="detail?.source"></p>
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Order ID</p>
                    <p class="text-sm font-mono text-slate-900 dark:text-white" x-text="detail?.order_id"></p>
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Customer</p>
                    <p class="text-sm text-slate-900 dark:text-white" x-text="detail?.customer || '-'"></p>
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Amount</p>
                    <p class="text-sm font-mono font-bold text-slate-900 dark:text-white">RM <span x-text="detail ? parseFloat(detail.amount).toFixed(2) : '0.00'"></span></p>
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Current Status</p>
                    <p class="text-sm font-medium capitalize" x-text="detail?.status?.replace('_', ' ')"></p>
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Date</p>
                    <p class="text-sm text-slate-900 dark:text-white" x-text="detail?.created_at ? new Date(detail.created_at).toLocaleString('en-MY') : '-'"></p>
                </div>
            </div>

            <!-- Change Status -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Update Status</p>
                <form method="post" action="{{ route('superadmin.order.status') }}" class="flex items-end gap-3">
                    @csrf
                    @method('PUT')
                    <input type="hidden" name="order_id" :value="detail?.order_id">
                    <input type="hidden" name="source" :value="detail?.source === 'WPay' ? 'wpay' : (detail?.source === 'AI Tokens' ? 'token' : 'workshop')">
                    <div class="flex-1">
                        <select name="status" x-model="newStatus" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="success">Success</option>
                            <option value="pay_later">Pay Later</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button type="submit" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
                        Update
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

</div>
@endsection