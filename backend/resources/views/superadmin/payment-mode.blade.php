@extends('superadmin.layout')

@section('title', 'Payment Gateway Mode')
@section('header', 'Gateway Configuration')

@section('content')
<div class="space-y-8">
    <!-- Top Section: Status & Configuration -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <!-- Status Panel -->
        <div class="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="p-6 sm:p-8">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            @if($mode === 'prod')
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"></path>
                                <path d="M12 2v2"></path>
                                <path d="M12 20v2"></path>
                                <path d="M4.93 4.93l1.41 1.41"></path>
                                <path d="M17.66 17.66l1.41 1.41"></path>
                                <path d="M2 12h2"></path>
                                <path d="M20 12h2"></path>
                                <path d="M4.93 19.07l1.41-1.41"></path>
                                <path d="M17.66 6.34l1.41-1.41"></path>
                            </svg>
                            @else
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                            </svg>
                            @endif
                            {{ $mode === 'prod' ? 'Live Environment' : 'Sandbox Environment' }}
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                            Currently processing payments via
                            <strong class="font-semibold {{ $provider === 'fiuu' ? 'text-indigo-600' : 'text-sky-600' }}">{{ ucfirst($provider) }}</strong>.
                            {{ $mode === 'prod' ? 'All transactions are real and will charge customers.' : 'Transactions are simulated for testing purposes.' }}
                        </p>
                    </div>
                    <div class="hidden sm:flex flex-col items-end gap-2">
                        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide
                            {{ $mode === 'prod' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }}">
                            <span class="relative flex h-2.5 w-2.5 mr-1">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 {{ $mode === 'prod' ? 'bg-indigo-400' : 'bg-amber-400' }}"></span>
                                <span class="relative inline-flex rounded-full h-2.5 w-2.5 {{ $mode === 'prod' ? 'bg-indigo-500' : 'bg-amber-500' }}"></span>
                            </span>
                            {{ $mode === 'prod' ? 'System Online' : 'Test Mode' }}
                        </div>
                    </div>
                </div>

                <form method="post" action="{{ route('admin.payment.mode.update') }}" class="mt-8" x-data="{ selectedMode: '{{ $mode }}' }">
                    @csrf
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- Production Option -->
                        <label class="relative group cursor-pointer" @click="selectedMode = 'prod'">
                            <input type="radio" name="mode" value="prod" class="sr-only" {{ $mode === 'prod' ? 'checked' : '' }} x-model="selectedMode">
                            <div class="h-full rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md"
                                :class="selectedMode === 'prod'
                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-500'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p class="font-bold text-slate-900 dark:text-white">Production</p>
                                            <p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Via Fiuu Gateway</p>
                                        </div>
                                    </div>
                                    <div class="w-5 h-5 rounded-full border-2 transition-colors duration-200 flex items-center justify-center"
                                        :class="selectedMode === 'prod'
                                            ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500'
                                            : 'border-slate-300 dark:border-slate-600'">
                                        <svg class="w-3 h-3 text-white transition-opacity duration-200"
                                            :class="selectedMode === 'prod' ? 'opacity-100' : 'opacity-0'"
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <p class="text-sm text-slate-500 dark:text-slate-400 pl-1">
                                    Real payments processed securely. Best for live customer transactions.
                                </p>
                            </div>
                        </label>

                        <!-- Sandbox Option -->
                        <label class="relative group cursor-pointer" @click="selectedMode = 'sandbox'">
                            <input type="radio" name="mode" value="sandbox" class="sr-only" {{ $mode === 'sandbox' ? 'checked' : '' }} x-model="selectedMode">
                            <div class="h-full rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md"
                                :class="selectedMode === 'sandbox'
                                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-500'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p class="font-bold text-slate-900 dark:text-white">Sandbox</p>
                                            <p class="text-xs font-semibold text-amber-600 dark:text-amber-400">Via ToyyibPay Dev</p>
                                        </div>
                                    </div>
                                    <div class="w-5 h-5 rounded-full border-2 transition-colors duration-200 flex items-center justify-center"
                                        :class="selectedMode === 'sandbox'
                                            ? 'border-amber-500 bg-amber-500 dark:border-amber-400 dark:bg-amber-500'
                                            : 'border-slate-300 dark:border-slate-600'">
                                        <svg class="w-3 h-3 text-white transition-opacity duration-200"
                                            :class="selectedMode === 'sandbox' ? 'opacity-100' : 'opacity-0'"
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <p class="text-sm text-slate-500 dark:text-slate-400 pl-1">
                                    Simulator mode. No real money deducted. Suitable for system testing.
                                </p>
                            </div>
                        </label>
                    </div>

                    <div class="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-2 text-sm p-3 rounded-lg {{ $toyyibConfigured ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' }}">
                            @if($toyyibConfigured)
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            <span class="font-medium">ToyyibPay Configured</span>
                            @else
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                            <span class="font-medium">ToyyibPay Secrets Missing</span>
                            @endif
                        </div>

                        <button type="submit" class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                            Update Environment
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Quick Stats Side Panel -->
        <div class="space-y-4">
            <!-- Balance Card -->
            <div class="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl shadow-lg p-6 text-white relative overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div class="relative z-10">
                    <p class="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-1">Total Volume</p>
                    <h3 class="text-3xl font-extrabold tracking-tight">RM {{ number_format($summary['total_amount'], 2) }}</h3>
                    <div class="mt-4 pt-4 border-t border-indigo-500/30 flex items-center justify-between">
                        <div>
                            <p class="text-indigo-200 text-xs">Successful</p>
                            <p class="font-bold text-lg">RM {{ number_format($summary['success_amount'], 2) }}</p>
                        </div>
                        <div class="h-8 w-px bg-indigo-500/50"></div>
                        <div>
                            <p class="text-indigo-200 text-xs">Transactions</p>
                            <p class="font-bold text-lg">{{ number_format($summary['total_count']) }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Transaction Status List -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <h4 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4">Activity Status</h4>
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold text-xs">
                                {{ round(($summary['success_count'] / max($summary['total_count'], 1)) * 100) }}%
                            </div>
                            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Successful</span>
                        </div>
                        <span class="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-sm">{{ number_format($summary['success_count']) }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold text-xs">
                                {{ round(($summary['pending_count'] / max($summary['total_count'], 1)) * 100) }}%
                            </div>
                            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Pending</span>
                        </div>
                        <span class="text-amber-700 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded text-sm">{{ number_format($summary['pending_count']) }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-300 font-bold text-xs">
                                {{ round(($summary['failed_count'] / max($summary['total_count'], 1)) * 100) }}%
                            </div>
                            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Failed</span>
                        </div>
                        <span class="text-rose-700 dark:text-rose-400 font-bold bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded text-sm">{{ number_format($summary['failed_count']) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!-- Transaction History -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">Transaction Logs</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Unified view of WPay, AI Tokens & Workshop records.</p>
            </div>

            <!-- Filter Bar -->
            <form method="get" action="{{ route('admin.payment.mode') }}" class="flex flex-col sm:flex-row gap-2">
                <div class="relative">
                    <select name="source" class="pl-3 pr-8 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer">
                        <option value="">All Sources</option>
                        @foreach ($sources as $item)
                        <option value="{{ $item }}" {{ $sourceFilter === $item ? 'selected' : '' }}>{{ $item }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="relative">
                    <select name="status" class="pl-3 pr-8 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer">
                        <option value="">All Statuses</option>
                        @foreach ($availableStatuses as $item)
                        <option value="{{ $item }}" {{ $statusFilter === $item ? 'selected' : '' }}>{{ $item }}</option>
                        @endforeach
                    </select>
                </div>
                <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
                    Filter
                </button>
                @if($sourceFilter || $statusFilter)
                <a href="{{ route('admin.payment.mode') }}" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors">
                    Reset
                </a>
                @endif
            </form>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead class="bg-slate-50/50 dark:bg-slate-800/30 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                    <tr>
                        <th class="px-6 py-4">Ref & Customer</th>
                        <th class="px-6 py-4">Source</th>
                        <th class="px-6 py-4">Amount</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Date Time</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    @forelse ($transactions as $trx)
                    <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex flex-col">
                                <span class="font-mono text-xs text-slate-400 dark:text-slate-500 mb-0.5">{{ $trx->order_id }}</span>
                                <span class="font-bold text-slate-900 dark:text-white">{{ $trx->customer ?: 'Guest' }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            @php
                            $sourceColor = match($trx->source) {
                            'WPay' => 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                            'AI Tokens' => 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                            'Workshop' => 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                            default => 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            };
                            @endphp
                            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase {{ $sourceColor }}">
                                {{ $trx->source }}
                            </span>
                        </td>
                        <td class="px-6 py-4">
                            <span class="font-mono font-bold text-slate-900 dark:text-white">RM {{ number_format((float) $trx->amount, 2) }}</span>
                        </td>
                        <td class="px-6 py-4">
                            @php
                            $statusValue = strtolower((string) $trx->status);
                            $isSuccess = in_array($statusValue, ['success', 'completed', 'pay_later'], true);
                            $isPending = in_array($statusValue, ['pending', 'processing'], true);

                            $badgeColor = $isSuccess
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : ($isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20');

                            $icon = $isSuccess
                            ? '<svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>'
                            : ($isPending
                            ? '<svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>'
                            : '<svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>');
                            @endphp
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize {{ $badgeColor }}">
                                {!! $icon !!}
                                {{ str_replace('_', ' ', $trx->status) }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex flex-col items-end">
                                <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ \Illuminate\Support\Carbon::parse($trx->created_at)->format('d M Y') }}</span>
                                <span class="text-[10px] text-slate-400">{{ \Illuminate\Support\Carbon::parse($trx->created_at)->format('h:i A') }}</span>
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <svg class="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p>No transactions found matching your criteria.</p>
                            </div>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if($transactions->hasPages())
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            {{ $transactions->links() }}
        </div>
        @endif
    </div>
</div>
@endsection