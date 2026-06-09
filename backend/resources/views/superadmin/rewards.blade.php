@extends('superadmin.layout')

@section('title', 'Rewards Management')
@section('header', 'Rewards Management')

@section('content')
<div x-data="{ 
    addOpen: false, 
    editOpen: false, 
    editItem: null,
    searchQuery: '',
    filterStatus: 'all',
    filterCategory: 'all',
    get filteredItems() {
        let items = {{ Js::from($items->items()) }};
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
        }
        if (this.filterStatus !== 'all') {
            items = items.filter(i => this.filterStatus === 'active' ? i.is_active : !i.is_active);
        }
        if (this.filterCategory !== 'all') {
            items = items.filter(i => i.category === this.filterCategory);
        }
        return items;
    }
}" class="space-y-6">

    {{-- Stats Cards - Modern Design --}}
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {{-- Active Rewards --}}
        <div class="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Rewards</p>
                    <p class="text-3xl font-bold text-slate-900 dark:text-white mt-2">{{ number_format($stats['active_items']) }}</p>
                    <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        Available for redemption
                    </p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
            </div>
        </div>

        {{-- Total Stock --}}
        <div class="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Stock</p>
                    <p class="text-3xl font-bold text-slate-900 dark:text-white mt-2">{{ number_format($stats['total_stock']) }}</p>
                    <p class="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                        Units remaining
                    </p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                </div>
            </div>
        </div>

        {{-- Total Redemptions --}}
        <div class="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Redemptions</p>
                    <p class="text-3xl font-bold text-slate-900 dark:text-white mt-2">{{ number_format($stats['total_redemptions']) }}</p>
                    <p class="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
                        Claims processed
                    </p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
                    </svg>
                </div>
            </div>
        </div>
    </div>

    {{-- Reward Catalog - Modern Card Grid Layout --}}
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {{-- Header with Search & Filters --}}
        <div class="p-6 border-b border-slate-100 dark:border-slate-800">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                        </svg>
                        Reward Catalog
                    </h3>
                    <p class="text-sm text-slate-500 mt-1">Manage rewards, pricing, and inventory</p>
                </div>
                <button @click="addOpen = true" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                    Add Reward
                </button>
            </div>

            {{-- Filters Bar --}}
            <div class="mt-6 flex flex-col sm:flex-row gap-3">
                {{-- Search --}}
                <div class="relative flex-1 max-w-md">
                    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input 
                        type="text" 
                        x-model="searchQuery"
                        placeholder="Search rewards..." 
                        class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                </div>

                {{-- Filter Dropdowns --}}
                <div class="flex gap-2">
                    <select x-model="filterStatus" class="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <select x-model="filterCategory" class="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                        <option value="all">All Categories</option>
                        <option value="theme_park">Theme Park</option>
                        <option value="food">Food</option>
                        <option value="beauty">Beauty</option>
                        <option value="health">Health</option>
                        <option value="travel">Travel</option>
                        <option value="more">More</option>
                    </select>
                </div>
            </div>
        </div>

        {{-- Rewards Grid --}}
        <div class="p-6">
            <template x-if="filteredItems.length === 0">
                <div class="text-center py-16">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <h4 class="text-slate-900 dark:text-white font-semibold mb-1">No rewards found</h4>
                    <p class="text-slate-500 text-sm">Try adjusting your search or filters</p>
                </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                @forelse ($items as $item)
                <div 
                    x-show="filteredItems.find(i => i.id === {{ $item->id }})"
                    x-transition
                    class="group bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300"
                >
                    {{-- Card Header with Image --}}
                    <div class="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 overflow-hidden">
                        @if ($item->image_url)
                            <img src="{{ $item->image_url }}" alt="{{ $item->name }}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        @else
                            <div class="w-full h-full flex items-center justify-center">
                                <svg class="w-12 h-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                        @endif
                        
                        {{-- Status Badge --}}
                        <div class="absolute top-3 left-3">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold {{ $item->is_active ? 'bg-emerald-500/90 text-white' : 'bg-slate-500/90 text-white' }} backdrop-blur-sm shadow-sm">
                                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                                {{ $item->is_active ? 'Active' : 'Inactive' }}
                            </span>
                        </div>

                        {{-- Stock Warning --}}
                        @if ((int) $item->stock <= 5 && (int) $item->stock > 0)
                            <div class="absolute top-3 right-3">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-red-500/90 text-white backdrop-blur-sm shadow-sm">
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                    Low Stock
                                </span>
                            </div>
                        @elseif ((int) $item->stock === 0)
                            <div class="absolute top-3 right-3">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-800/90 text-white backdrop-blur-sm shadow-sm">
                                    Out of Stock
                                </span>
                            </div>
                        @endif

                        {{-- Category Badge --}}
                        @php
                            $categoryConfig = [
                                'theme_park' => ['label' => 'Theme Park', 'color' => 'bg-purple-500', 'icon' => 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
                                'food' => ['label' => 'Food', 'color' => 'bg-orange-500', 'icon' => 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'],
                                'beauty' => ['label' => 'Beauty', 'color' => 'bg-pink-500', 'icon' => 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
                                'health' => ['label' => 'Health', 'color' => 'bg-cyan-500', 'icon' => 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'],
                                'travel' => ['label' => 'Travel', 'color' => 'bg-blue-500', 'icon' => 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
                                'more' => ['label' => 'More', 'color' => 'bg-slate-500', 'icon' => 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z'],
                            ];
                            $catConfig = $categoryConfig[$item->category] ?? $categoryConfig['more'];
                        @endphp
                        <div class="absolute bottom-3 left-3">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-sm">
                                <span class="w-2 h-2 rounded-full {{ $catConfig['color'] }}"></span>
                                {{ $catConfig['label'] }}
                            </span>
                        </div>
                    </div>

                    {{-- Card Body --}}
                    <div class="p-4">
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <h4 class="font-semibold text-slate-900 dark:text-white line-clamp-1" title="{{ $item->name }}">{{ $item->name }}</h4>
                        </div>
                        
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 h-8">{{ $item->description }}</p>

                        {{-- Type & Partner --}}
                        <div class="flex items-center gap-2 mb-3">
                            @php
                                $typeConfig = [
                                    'ticket' => ['label' => 'Ticket', 'bg' => 'bg-violet-100 dark:bg-violet-900/30', 'text' => 'text-violet-700 dark:text-violet-400'],
                                    'voucher' => ['label' => 'Voucher', 'bg' => 'bg-amber-100 dark:bg-amber-900/30', 'text' => 'text-amber-700 dark:text-amber-400'],
                                    'merch' => ['label' => 'Merchandise', 'bg' => 'bg-rose-100 dark:bg-rose-900/30', 'text' => 'text-rose-700 dark:text-rose-400'],
                                ];
                                $tConfig = $typeConfig[$item->type] ?? ['label' => ucfirst($item->type), 'bg' => 'bg-slate-100 dark:bg-slate-800', 'text' => 'text-slate-700 dark:text-slate-400'];
                            @endphp
                            <span class="px-2 py-0.5 rounded-md text-xs font-medium {{ $tConfig['bg'] }} {{ $tConfig['text'] }}">
                                {{ $tConfig['label'] }}
                            </span>
                            @if ($item->partner)
                                <span class="text-xs text-slate-400 flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                    {{ $item->partner }}
                                </span>
                            @endif
                        </div>

                        {{-- Price & Stock Row --}}
                        <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div class="flex items-center gap-1.5">
                                <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                                </svg>
                                <span class="font-bold text-slate-900 dark:text-white">{{ number_format((int) $item->price_coins) }}</span>
                                <span class="text-xs text-slate-500">tokens</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                </svg>
                                <span class="text-sm font-medium {{ (int) $item->stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300' }}">
                                    {{ number_format((int) $item->stock) }} left
                                </span>
                            </div>
                        </div>

                        {{-- Action Buttons --}}
                        <div class="flex items-center gap-2 mt-4">
                            <button
                                @click="editItem = {{ Js::from([
                                    'id' => $item->id,
                                    'name' => $item->name,
                                    'description' => $item->description,
                                    'details' => $item->details ?? '',
                                    'type' => $item->type,
                                    'category' => $item->category,
                                    'price_coins' => (int) $item->price_coins,
                                    'stock' => (int) $item->stock,
                                    'image_url' => $item->image_url ?? '',
                                    'partner' => $item->partner ?? '',
                                    'sort_order' => (int) ($item->sort_order ?? 0),
                                    'is_active' => (bool) $item->is_active,
                                ]) }}; editOpen = true"
                                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Edit
                            </button>
                            <form method="post" action="{{ route('superadmin.rewards.delete', $item->id) }}" onsubmit="return confirm('Are you sure you want to delete this reward?')" class="flex-shrink-0">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="inline-flex items-center justify-center p-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors" title="Delete reward">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                @empty
                <div class="col-span-full text-center py-16">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <h4 class="text-slate-900 dark:text-white font-semibold mb-1">No rewards yet</h4>
                    <p class="text-slate-500 text-sm mb-4">Create your first reward to get started</p>
                    <button @click="addOpen = true" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                        Add Reward
                    </button>
                </div>
                @endforelse
            </div>
        </div>

        {{-- Pagination --}}
        @if ($items->hasPages())
        <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {{ $items->links() }}
        </div>
        @endif
    </div>

    {{-- Recent Redemptions - Modern Table --}}
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">Recent Redemptions</h3>
            </div>
            <p class="text-sm text-slate-500 mt-1 ml-7">Latest student reward claims</p>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reward</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tokens</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    @forelse ($recentRedemptions as $redemption)
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="px-6 py-4">
                            <code class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-mono font-medium text-slate-700 dark:text-slate-300">{{ $redemption->code }}</code>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                    <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">{{ strtoupper(substr($redemption->student?->genius_name ?? 'U', 0, 1)) }}</span>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-slate-900 dark:text-white">{{ $redemption->student?->genius_name ?? 'Unknown' }}</p>
                                    <p class="text-xs text-slate-500">{{ $redemption->student?->genius_id ?? '' }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <p class="text-sm text-slate-700 dark:text-slate-300">{{ $redemption->item_name_snapshot ?: ($redemption->item?->name ?? '-') }}</p>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-1.5">
                                <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                                </svg>
                                <span class="font-semibold text-slate-900 dark:text-white">{{ number_format((int) $redemption->tokens_spent) }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            @php
                                $statusConfig = [
                                    'pending' => ['label' => 'Pending', 'class' => 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'],
                                    'claimed' => ['label' => 'Claimed', 'class' => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'],
                                    'expired' => ['label' => 'Expired', 'class' => 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'],
                                ];
                                $sConfig = $statusConfig[$redemption->status] ?? ['label' => ucfirst($redemption->status), 'class' => 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'];
                            @endphp
                            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border {{ $sConfig['class'] }}">
                                <span class="w-1.5 h-1.5 rounded-full mr-1.5 {{ $redemption->status === 'claimed' ? 'bg-emerald-500' : ($redemption->status === 'pending' ? 'bg-amber-500' : 'bg-red-500') }}"></span>
                                {{ $sConfig['label'] }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-500">{{ optional($redemption->created_at)->format('d M Y, h:i A') }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="px-6 py-12 text-center">
                            <div class="flex flex-col items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <p class="text-slate-500 dark:text-slate-400">No redemptions yet</p>
                            </div>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    {{-- Add Modal - Modern Design --}}
    <div x-show="addOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="addOpen = false">
        <div class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" @click="addOpen = false"></div>
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-hidden"
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0 scale-95"
             x-transition:enter-end="opacity-100 scale-100"
             x-transition:leave="transition ease-in duration-150"
             x-transition:leave-start="opacity-100 scale-100"
             x-transition:leave-end="opacity-0 scale-95">
            
            {{-- Modal Header --}}
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-lg">Add Reward</h3>
                        <p class="text-xs text-slate-500">Create a new reward item</p>
                    </div>
                </div>
                <button @click="addOpen = false" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            {{-- Modal Body --}}
            <form method="post" action="{{ route('superadmin.rewards.store') }}" class="flex flex-col h-full">
                @csrf
                <div class="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
                    @include('superadmin.partials.reward-form-fields', ['prefix' => ''])
                </div>

                {{-- Modal Footer --}}
                <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" @click="addOpen = false" class="px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40">
                        Create Reward
                    </button>
                </div>
            </form>
        </div>
    </div>

    {{-- Edit Modal - Modern Design --}}
    <div x-show="editOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="editOpen = false">
        <div class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" @click="editOpen = false"></div>
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-hidden"
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0 scale-95"
             x-transition:enter-end="opacity-100 scale-100"
             x-transition:leave="transition ease-in duration-150"
             x-transition:leave-start="opacity-100 scale-100"
             x-transition:leave-end="opacity-0 scale-95">
            
            {{-- Modal Header --}}
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-lg">Edit Reward</h3>
                        <p class="text-xs text-slate-500">Update reward details</p>
                    </div>
                </div>
                <button @click="editOpen = false" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            {{-- Modal Body --}}
            <form method="post" :action="editItem ? '/superadmin/rewards/' + editItem.id : '/superadmin/rewards'" class="flex flex-col h-full">
                @csrf
                @method('PUT')
                <div class="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
                    @include('superadmin.partials.reward-form-fields', ['prefix' => 'x-'])
                </div>

                {{-- Modal Footer --}}
                <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" @click="editOpen = false" class="px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40">
                        Update Reward
                    </button>
                </div>
            </form>
        </div>
    </div>

</div>

@push('scripts')
<script>
function imageDropzone(mode) {
    return {
        imageUrl: mode === 'edit' ? (this.editItem?.image_url || '') : '',
        isDragging: false,
        isUploading: false,
        uploadError: '',

        init() {
            if (mode === 'edit') {
                this.$watch('editItem', (val) => {
                    if (val) this.imageUrl = val.image_url || '';
                });
            }
        },

        handleDrop(event) {
            this.isDragging = false;
            const files = event.dataTransfer?.files;
            if (files && files.length > 0) {
                this.uploadFile(files[0]);
            }
        },

        handleFileSelect(event) {
            const files = event.target.files;
            if (files && files.length > 0) {
                this.uploadFile(files[0]);
            }
            event.target.value = '';
        },

        async uploadFile(file) {
            if (!file.type.startsWith('image/')) {
                this.uploadError = 'Please select an image file.';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                this.uploadError = 'File size must be under 5MB.';
                return;
            }

            this.uploadError = '';
            this.isUploading = true;

            try {
                const formData = new FormData();
                formData.append('image', file);

                const csrfToken = document.querySelector('meta[name=csrf-token]')?.getAttribute('content');

                const response = await fetch('/superadmin/rewards/upload-image', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken || '',
                        'Accept': 'application/json',
                    },
                    body: formData,
                });

                const data = await response.json();

                if (data.success) {
                    this.imageUrl = data.url;
                } else {
                    this.uploadError = data.message || 'Upload failed.';
                }
            } catch (error) {
                this.uploadError = 'Upload failed. Please try again.';
                console.error('Upload error:', error);
            } finally {
                this.isUploading = false;
            }
        },

        removeImage() {
            this.imageUrl = '';
        },
    };
}
</script>
@endpush
@endsection
