@extends('superadmin.layout')

@section('title', 'Orders')
@section('header', 'All Orders')

@section('content')
<div x-data="{ detailOpen: false, detail: null, detailType: '', newStatus: '' }">

<!-- Workshop Bookings -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">Workshop Bookings</h3>
        <span class="text-xs text-slate-500">{{ $classBookings->total() }} total</span>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                    <th class="px-6 py-4">Order ID</th>
                    <th class="px-6 py-4">Student</th>
                    <th class="px-6 py-4">Parent</th>
                    <th class="px-6 py-4">Class</th>
                    <th class="px-6 py-4">Amount</th>
                    <th class="px-6 py-4">Payment</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($classBookings as $booking)
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    @click="detail = {
                        order_id: '{{ $booking->order_id }}',
                        student: '{{ $booking->student?->genius_name ?? '-' }}',
                        parent_name: '{{ $booking->parent?->name ?? '-' }}',
                        parent_email: '{{ $booking->parent?->email ?? '' }}',
                        class_title: '{{ $booking->slot?->course?->title ?? '-' }}',
                        slot_time: '{{ $booking->slot ? $booking->slot->start_time->format('d M Y, h:i A') . ' - ' . $booking->slot->end_time->format('h:i A') : '-' }}',
                        amount: {{ (float) $booking->amount }},
                        payment_method: '{{ $booking->payment_method ?? '-' }}',
                        status: '{{ $booking->payment_status }}',
                        booking_status: '{{ $booking->status }}',
                        paid_at: '{{ $booking->paid_at ? $booking->paid_at->format('d M Y, h:i A') : '-' }}',
                        created_at: '{{ $booking->created_at?->format('d M Y, h:i A') }}'
                    }; detailType = 'workshop'; newStatus = '{{ $booking->payment_status }}'; detailOpen = true">
                    <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">{{ $booking->order_id }}</td>
                    <td class="px-6 py-4">{{ $booking->student?->genius_name ?? '-' }}</td>
                    <td class="px-6 py-4">{{ $booking->parent?->name ?? '-' }}</td>
                    <td class="px-6 py-4 text-xs">{{ $booking->slot?->course?->title ?? '-' }}</td>
                    <td class="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">RM {{ number_format((float) $booking->amount, 2) }}</td>
                    <td class="px-6 py-4">{{ $booking->payment_method ?? '-' }}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                    {{ in_array($booking->payment_status, ['completed', 'pay_later']) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' }}">
                            {{ str_replace('_', ' ', $booking->payment_status) }}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-slate-500">No workshop bookings found.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
        {{ $classBookings->links() }}
    </div>
</div>

<!-- AI Token Orders -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">AI Token Orders</h3>
        <span class="text-xs text-slate-500">{{ $tokenOrders->total() }} total</span>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                    <th class="px-6 py-4">Order ID</th>
                    <th class="px-6 py-4">Student</th>
                    <th class="px-6 py-4">Package</th>
                    <th class="px-6 py-4">Tokens</th>
                    <th class="px-6 py-4">Amount</th>
                    <th class="px-6 py-4">Method</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($tokenOrders as $order)
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    @click="detail = {
                        order_id: '{{ $order->order_id }}',
                        student: '{{ $order->student?->genius_name ?? '-' }}',
                        package_type: '{{ $order->package_type }}',
                        package_name: '{{ $order->package_name }}',
                        package_amount: {{ (int) $order->package_amount }},
                        amount: {{ (float) $order->amount_paid }},
                        payment_method: '{{ $order->payment_method ?? '-' }}',
                        status: '{{ $order->status }}',
                        balance_before: {{ (int) $order->balance_before }},
                        balance_after: {{ (int) $order->balance_after }},
                        fiuu_id: '{{ $order->fiuu_transaction_id ?? '-' }}',
                        created_at: '{{ $order->created_at?->format('d M Y, h:i A') }}'
                    }; detailType = 'token'; newStatus = '{{ $order->status }}'; detailOpen = true">
                    <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">{{ $order->order_id }}</td>
                    <td class="px-6 py-4">{{ $order->student?->genius_name ?? '-' }}</td>
                    <td class="px-6 py-4">{{ $order->package_name }}</td>
                    <td class="px-6 py-4 font-mono text-xs">{{ number_format($order->package_amount) }}</td>
                    <td class="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">RM {{ number_format((float) $order->amount_paid, 2) }}</td>
                    <td class="px-6 py-4">{{ $order->payment_method ?? '-' }}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                    {{ $order->status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' }}">
                            {{ $order->status }}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-slate-500">No token orders found.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
        {{ $tokenOrders->links() }}
    </div>
</div>

<!-- WPay Transactions -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">WPay Transactions</h3>
        <span class="text-xs text-slate-500">{{ $walletOrders->total() }} total</span>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                    <th class="px-6 py-4">Order ID</th>
                    <th class="px-6 py-4">Email</th>
                    <th class="px-6 py-4">Category</th>
                    <th class="px-6 py-4">Type</th>
                    <th class="px-6 py-4">Amount</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4">Date</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($walletOrders as $order)
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    @click="detail = {
                        order_id: '{{ $order->order_id }}',
                        email: '{{ $order->email }}',
                        payment_category: '{{ $order->payment_category }}',
                        payment_type: '{{ $order->payment_type }}',
                        amount: {{ (float) $order->amount }},
                        wbalance_used: {{ (float) ($order->wbalance_used ?? 0) }},
                        bonus_used: {{ (float) ($order->bonus_used ?? 0) }},
                        online_paid: {{ (float) ($order->online_paid ?? 0) }},
                        status: '{{ $order->status }}',
                        fiuu_id: '{{ $order->fiuu_transaction_id ?? '-' }}',
                        created_at: '{{ $order->created_at?->format('d M Y, h:i A') }}'
                    }; detailType = 'wpay'; newStatus = '{{ $order->status }}'; detailOpen = true">
                    <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">{{ $order->order_id }}</td>
                    <td class="px-6 py-4">{{ $order->email }}</td>
                    <td class="px-6 py-4">{{ $order->payment_category }}</td>
                    <td class="px-6 py-4 uppercase text-xs font-bold">{{ $order->payment_type }}</td>
                    <td class="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">RM {{ number_format((float) $order->amount, 2) }}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                    {{ $order->status === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' }}">
                            {{ $order->status }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-xs text-slate-500">{{ optional($order->created_at)->format('d M Y, h:i A') }}</td>
                    <td class="px-6 py-4">
                        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-slate-500">No WPay transactions found.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
        {{ $walletOrders->links() }}
    </div>
</div>

<!-- Detail Modal -->
<div x-show="detailOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="detailOpen = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="detailOpen = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto" x-show="detailOpen" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Order Details</h3>
            <button @click="detailOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <div class="p-6 space-y-4" x-show="detail">
            <!-- Workshop Details -->
            <template x-if="detailType === 'workshop'">
                <div class="grid grid-cols-2 gap-4">
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Order ID</p><p class="text-sm font-mono text-slate-900 dark:text-white" x-text="detail?.order_id"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Student</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.student"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Parent</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.parent_name"></p><p class="text-xs text-slate-500" x-text="detail?.parent_email"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Class</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.class_title"></p></div>
                    <div class="col-span-2"><p class="text-xs font-medium text-slate-500 uppercase mb-1">Slot Time</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.slot_time"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Amount</p><p class="text-sm font-mono font-bold text-slate-900 dark:text-white">RM <span x-text="detail ? parseFloat(detail.amount).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Payment Method</p><p class="text-sm text-slate-900 dark:text-white uppercase" x-text="detail?.payment_method"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Paid At</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.paid_at"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Created</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.created_at"></p></div>
                </div>
            </template>

            <!-- Token Details -->
            <template x-if="detailType === 'token'">
                <div class="grid grid-cols-2 gap-4">
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Order ID</p><p class="text-sm font-mono text-slate-900 dark:text-white" x-text="detail?.order_id"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Student</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.student"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Package</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.package_name"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Type</p><p class="text-sm text-slate-900 dark:text-white capitalize" x-text="detail?.package_type?.replace('_', ' ')"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Tokens Given</p><p class="text-sm font-mono font-bold text-purple-600 dark:text-purple-400" x-text="detail?.package_amount"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Amount Paid</p><p class="text-sm font-mono font-bold text-slate-900 dark:text-white">RM <span x-text="detail ? parseFloat(detail.amount).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Balance Before</p><p class="text-sm font-mono text-slate-600 dark:text-slate-400" x-text="detail?.balance_before"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Balance After</p><p class="text-sm font-mono text-slate-600 dark:text-slate-400" x-text="detail?.balance_after"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Payment Method</p><p class="text-sm text-slate-900 dark:text-white uppercase" x-text="detail?.payment_method"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Fiuu ID</p><p class="text-sm font-mono text-xs text-slate-600 dark:text-slate-400" x-text="detail?.fiuu_id"></p></div>
                    <div class="col-span-2"><p class="text-xs font-medium text-slate-500 uppercase mb-1">Date</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.created_at"></p></div>
                </div>
            </template>

            <!-- WPay Details -->
            <template x-if="detailType === 'wpay'">
                <div class="grid grid-cols-2 gap-4">
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Order ID</p><p class="text-sm font-mono text-slate-900 dark:text-white" x-text="detail?.order_id"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Email</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.email"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Category</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.payment_category"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Type</p><p class="text-sm text-slate-900 dark:text-white uppercase font-bold" x-text="detail?.payment_type"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Total Amount</p><p class="text-sm font-mono font-bold text-slate-900 dark:text-white">RM <span x-text="detail ? parseFloat(detail.amount).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">WBalance Used</p><p class="text-sm font-mono text-slate-600 dark:text-slate-400">RM <span x-text="detail ? parseFloat(detail.wbalance_used).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Bonus Used</p><p class="text-sm font-mono text-slate-600 dark:text-slate-400">RM <span x-text="detail ? parseFloat(detail.bonus_used).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Online Paid</p><p class="text-sm font-mono text-slate-600 dark:text-slate-400">RM <span x-text="detail ? parseFloat(detail.online_paid).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Fiuu ID</p><p class="text-sm font-mono text-xs text-slate-600 dark:text-slate-400" x-text="detail?.fiuu_id"></p></div>
                    <div><p class="text-xs font-medium text-slate-500 uppercase mb-1">Date</p><p class="text-sm text-slate-900 dark:text-white" x-text="detail?.created_at"></p></div>
                </div>
            </template>

            <!-- Change Status -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Update Status</p>
                <form method="post" action="{{ route('superadmin.order.status') }}" class="flex items-end gap-3">
                    @csrf
                    @method('PUT')
                    <input type="hidden" name="order_id" :value="detail?.order_id">
                    <input type="hidden" name="source" :value="detailType">
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