@extends('superadmin.layout')

@section('title', 'Event Workshops')
@section('header', 'Event Workshops')

@section('content')
<div class="space-y-6">

    {{-- Lead-in --}}
    <p class="text-sm text-slate-600 dark:text-slate-400">
        Partner shops (Zus, Mamee, KitKat, AirAsia&hellip;) that appear on a student's AIpreneur globe
        once a workshop staff member scans the student's QR pass.
    </p>

    @if (session('status'))
        <div class="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm">
            {{ session('status') }}
        </div>
    @endif

    {{-- Stats --}}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total workshops</p>
            <p class="text-3xl font-bold text-slate-900 dark:text-white mt-2">{{ number_format($stats['total']) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</p>
            <p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{{ number_format($stats['active']) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hidden</p>
            <p class="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{{ number_format($stats['hidden']) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total scans</p>
            <p class="text-3xl font-bold text-violet-600 dark:text-violet-400 mt-2">{{ number_format($stats['scans']) }}</p>
        </div>
    </div>

    {{-- Toolbar --}}
    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <form method="get" action="{{ route('superadmin.event-workshops.index') }}" class="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 max-w-xl">
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
            </svg>
            <input
                type="text"
                name="q"
                value="{{ $search }}"
                placeholder="Search by name, company, or description…"
                class="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            >
            @if ($search !== '')
                <a href="{{ route('superadmin.event-workshops.index') }}" class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Clear</a>
            @endif
        </form>
        <a href="{{ route('superadmin.event-workshops.create') }}" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            New workshop
        </a>
    </div>

    {{-- Table --}}
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/50">
                <tr class="text-left text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th class="px-4 py-3 font-semibold">Shop</th>
                    <th class="px-4 py-3 font-semibold">Company</th>
                    <th class="px-4 py-3 font-semibold hidden md:table-cell">Modules</th>
                    <th class="px-4 py-3 font-semibold">Status</th>
                    <th class="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                @forelse ($shops as $shop)
                    <tr class="text-slate-900 dark:text-slate-200">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                    @if ($shop->shop_image_url)
                                        <img src="{{ $shop->shop_image_url }}" alt="" class="w-full h-full object-contain" loading="lazy">
                                    @endif
                                </div>
                                <div class="min-w-0">
                                    <p class="font-semibold truncate">{{ $shop->name }}</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">{{ \Illuminate\Support\Str::limit($shop->business_nature, 80) }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{{ $shop->company_name }}</td>
                        <td class="px-4 py-3 hidden md:table-cell">
                            <div class="flex flex-wrap gap-1">
                                @foreach (($shop->modules ?? []) as $m)
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{{ $m }}</span>
                                @endforeach
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            @if ($shop->is_active)
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Live
                                </span>
                            @else
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/30">
                                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Hidden
                                </span>
                            @endif
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="inline-flex items-center gap-1">
                                <a href="{{ route('superadmin.event-workshops.scans', $shop->id) }}" title="Scans" class="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2a4 4 0 014-4h4M9 17h12M7 7h.01M3 3h18v18H3V3z"/>
                                    </svg>
                                </a>
                                <form method="post" action="{{ route('superadmin.event-workshops.toggle', $shop->id) }}">
                                    @csrf
                                    @method('PUT')
                                    <button type="submit" title="{{ $shop->is_active ? 'Hide' : 'Show' }}" class="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                                        @if ($shop->is_active)
                                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242"/>
                                            </svg>
                                        @else
                                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        @endif
                                    </button>
                                </form>
                                <a href="{{ route('superadmin.event-workshops.edit', $shop->id) }}" title="Edit" class="w-8 h-8 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </a>
                                <form method="post" action="{{ route('superadmin.event-workshops.destroy', $shop->id) }}" onsubmit="return confirm('Delete this workshop? Student unlocks stay intact.')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" title="Delete" class="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center">
                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="px-4 py-10 text-center text-slate-500 dark:text-slate-400 text-sm">
                            No workshops yet. Tap "New workshop" to add one.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if ($shops->hasPages())
        <div>{{ $shops->links() }}</div>
    @endif

    {{-- Staff_event users panel --}}
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mt-8">
        <div class="flex items-start justify-between mb-4">
            <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Event staff</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Users with the <code class="text-xs px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">staff_event</code> role — can only scan, not access the rest of the portal.</p>
            </div>
        </div>

        <form method="post" action="{{ route('superadmin.event-workshops.staff.store') }}" class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            @csrf
            <input name="name" placeholder="Full name" required class="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
            <input name="email" type="email" placeholder="Email" required class="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
            <input name="password" type="password" placeholder="Password (≥8 chars)" required minlength="8" class="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
            <button type="submit" class="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold">Add staff</button>
        </form>

        <ul class="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
            @forelse ($staffUsers as $u)
                <li class="py-2 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900 dark:text-white truncate">{{ $u->name }}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ $u->email }}</p>
                    </div>
                    <form method="post" action="{{ route('superadmin.event-workshops.staff.destroy', $u->id) }}" onsubmit="return confirm('Remove this staff member?')">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="px-2.5 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold">Remove</button>
                    </form>
                </li>
            @empty
                <li class="py-3 text-slate-500 dark:text-slate-400 text-xs italic">No event staff yet.</li>
            @endforelse
        </ul>
    </div>
</div>
@endsection
