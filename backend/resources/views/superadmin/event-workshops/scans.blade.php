@extends('superadmin.layout')

@section('title', 'Scans — ' . $shop->name)
@section('header', 'Scans for ' . $shop->name)

@section('content')
<div class="space-y-5">
    <a href="{{ route('superadmin.event-workshops.index') }}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Back to workshops
    </a>

    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
        <div class="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
            @if ($shop->shop_image_url)
                <img src="{{ $shop->shop_image_url }}" alt="" class="w-full h-full object-contain">
            @endif
        </div>
        <div class="min-w-0">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white truncate">{{ $shop->name }}</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 truncate">{{ $shop->company_name }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ $unlocks->total() }} total scans · {{ $shop->is_active ? 'Live' : 'Hidden' }}</p>
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/50">
                <tr class="text-left text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th class="px-4 py-3 font-semibold">Student</th>
                    <th class="px-4 py-3 font-semibold">Scanned by</th>
                    <th class="px-4 py-3 font-semibold">When</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                @forelse ($unlocks as $u)
                    <tr class="text-slate-900 dark:text-slate-200">
                        <td class="px-4 py-3 font-mono text-xs">{{ $u->student_id }}</td>
                        <td class="px-4 py-3 text-sm">{{ optional($u->scannedBy)->name ?? '—' }}</td>
                        <td class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{{ $u->scanned_at?->diffForHumans() }}</td>
                    </tr>
                @empty
                    <tr><td colspan="3" class="px-4 py-8 text-center text-slate-500 text-sm">No scans yet.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if ($unlocks->hasPages())
        <div>{{ $unlocks->links() }}</div>
    @endif
</div>
@endsection
