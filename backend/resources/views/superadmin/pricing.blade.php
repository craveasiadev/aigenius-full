@extends('superadmin.layout')

@section('title', 'Pricing Plan')
@section('header', 'Pricing & Economy Management')

@section('content')
<div class="space-y-8" x-data="{ 
    activeTab: 'overview',
    showEconomyHelp: false,
    showPresetHelp: false
}">
    
    {{-- Page Header with Navigation Tabs --}}
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <svg class="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1H9m3 0h3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Economy & Pricing Dashboard
                    </h2>
                    <p class="text-sm text-slate-500 mt-1">Manage token economy, pricing rules, packages, and visitor behavior settings.</p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button @click="activeTab = 'overview'" :class="activeTab === 'overview' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 ring-1 ring-cyan-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'" class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        Overview
                    </button>
                    <button @click="activeTab = 'packages'" :class="activeTab === 'packages' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 ring-1 ring-indigo-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'" class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        Packages
                    </button>
                    <button @click="activeTab = 'rules'" :class="activeTab === 'rules' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'" class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Token Rules
                    </button>
                    <button @click="activeTab = 'visitors'" :class="activeTab === 'visitors' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'" class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Visitors
                    </button>
                </div>
            </div>
        </div>
    </div>

    {{-- Stats Overview Cards --}}
    <div x-show="activeTab === 'overview'" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5" x-transition>
        {{-- Active Packages Card --}}
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group hover:shadow-xl hover:shadow-indigo-500/30 transition-all">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <span class="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Active</span>
                </div>
                <p class="text-indigo-100 text-sm font-medium">Token Packages</p>
                <p class="text-3xl font-bold mt-1">{{ number_format((int) ($stats['active_packages'] ?? 0)) }}</p>
                <p class="text-indigo-200 text-xs mt-2 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Top-up plans available
                </p>
            </div>
        </div>

        {{-- Active Rules Card --}}
        <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-500/30 transition-all">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <span class="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Enabled</span>
                </div>
                <p class="text-emerald-100 text-sm font-medium">Cost Rules</p>
                <p class="text-3xl font-bold mt-1">{{ number_format((int) ($stats['active_rules'] ?? 0)) }}</p>
                <p class="text-emerald-200 text-xs mt-2 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    AI token cost entries
                </p>
            </div>
        </div>

        {{-- Avg Price Card --}}
        <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group hover:shadow-xl hover:shadow-amber-500/30 transition-all">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1H9m3 0h3" />
                        </svg>
                    </div>
                    <span class="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">RM / Token</span>
                </div>
                <p class="text-amber-100 text-sm font-medium">Average Price</p>
                <p class="text-3xl font-bold mt-1">{{ number_format((float) ($stats['avg_token_price_rm'] ?? 0), 4) }}</p>
                <p class="text-amber-200 text-xs mt-2 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Across active packages
                </p>
            </div>
        </div>

        {{-- Target Profit Card --}}
        <div class="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden group hover:shadow-xl hover:shadow-rose-500/30 transition-all">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <span class="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Target</span>
                </div>
                <p class="text-rose-100 text-sm font-medium">Profit Margin</p>
                <p class="text-3xl font-bold mt-1">{{ number_format((int) ($economyEditor['target_profit_percent'] ?? 60)) }}%</p>
                <p class="text-rose-200 text-xs mt-2 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Auto-calculation baseline
                </p>
            </div>
        </div>
    </div>

    @include('superadmin.partials.pricing-feature-access')

    {{-- Economy Controls & Preset Section --}}
    <div x-show="activeTab === 'overview'" class="grid grid-cols-1 xl:grid-cols-3 gap-6" x-transition>
        {{-- Economy Controls --}}
        <div class="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Economy Controls</h3>
                            <p class="text-sm text-slate-500">Configure profit ranges, conversion ratios, and visitor behavior</p>
                        </div>
                    </div>
                    <button @click="showEconomyHelp = !showEconomyHelp" class="text-slate-400 hover:text-indigo-500 transition-colors" title="Show Help">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
                
                {{-- Help Panel --}}
                <div x-show="showEconomyHelp" x-collapse class="mt-4 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                    <h4 class="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Understanding Economy Settings
                    </h4>
                    <ul class="text-xs text-indigo-700 dark:text-indigo-300 space-y-1 list-disc list-inside">
                        <li><strong>Profit/Visitor:</strong> Min/Max profit generated per visitor per day</li>
                        <li><strong>Conversion Ratio:</strong> How many tokens 1 unit of profit converts to</li>
                        <li><strong>Purchase Chance:</strong> Probability that a visitor makes a purchase</li>
                        <li><strong>Tick Interval:</strong> How often passive visitor actions occur (seconds)</li>
                    </ul>
                </div>
            </div>
            
            <form method="post" action="{{ route('superadmin.pricing.economy.update') }}" class="p-6">
                @csrf
                @method('PUT')
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {{-- Profit Per Visitor Min --}}
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1H9m3 0h3" /></svg>
                            Min Profit per Visitor
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">RM</span>
                            <input type="number" min="0" name="profit_per_visitor_min" value="{{ (int) ($economyEditor['profit_per_visitor_min'] ?? 0) }}" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                        <p class="text-xs text-slate-400">Minimum profit generated per visitor</p>
                    </div>

                    {{-- Profit Per Visitor Max --}}
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            Max Profit per Visitor
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">RM</span>
                            <input type="number" min="0" name="profit_per_visitor_max" value="{{ (int) ($economyEditor['profit_per_visitor_max'] ?? 0) }}" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                        <p class="text-xs text-slate-400">Maximum profit cap per visitor</p>
                    </div>

                    {{-- Conversion Ratio --}}
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <svg class="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            Profit : AI Token Ratio
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">1:</span>
                            <input type="number" min="1" name="conversion_profit_per_token" value="{{ (int) ($economyEditor['conversion_profit_per_token'] ?? 25) }}" required 
                                class="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                        <p class="text-xs text-slate-400">How many tokens 1 profit unit converts to</p>
                    </div>

                    {{-- Min Convertible Profit --}}
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Min Convertible Profit
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">RM</span>
                            <input type="number" min="1" name="conversion_min_profit" value="{{ (int) ($economyEditor['conversion_min_profit'] ?? 25) }}" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                        <p class="text-xs text-slate-400">Minimum profit required for conversion</p>
                    </div>

                    {{-- Purchase Chance --}}
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Purchase Chance
                        </label>
                        <div class="relative">
                            <input type="number" min="1" max="100" name="visitor_purchase_chance_percent" value="{{ (int) ($economyEditor['visitor_purchase_chance_percent'] ?? 50) }}" required 
                                class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                        </div>
                        <p class="text-xs text-slate-400">Probability of visitor purchase (1-100%)</p>
                    </div>

                    {{-- Tick Interval --}}
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <svg class="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Passive Visitor Tick
                        </label>
                        <div class="relative">
                            <input type="number" min="15" max="3600" name="passive_visitor_interval_seconds" value="{{ (int) ($economyEditor['passive_visitor_interval_seconds'] ?? 240) }}" required 
                                class="w-full pl-4 pr-16 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">secs</span>
                        </div>
                        <p class="text-xs text-slate-400">Interval between passive actions (15-3600s)</p>
                    </div>

                    {{-- Target Profit --}}
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <svg class="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            Target Profit %
                        </label>
                        <div class="relative">
                            <input type="number" min="5" max="95" name="target_profit_percent" value="{{ (int) ($economyEditor['target_profit_percent'] ?? 60) }}" 
                                class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                        </div>
                        <p class="text-xs text-slate-400">Desired profit margin target</p>
                    </div>

                    {{-- Submit Button --}}
                    <div class="flex items-end">
                        <button type="submit" class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/25">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                            Save Economy Settings
                        </button>
                    </div>
                </div>
            </form>
        </div>

        {{-- Preset Engine --}}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Auto Preset Engine</h3>
                        <p class="text-sm text-slate-500">Quick configuration with target profit</p>
                    </div>
                </div>
            </div>
            
            <form method="post" action="{{ route('superadmin.pricing.preset.apply') }}" class="p-6 space-y-5">
                @csrf
                <div class="space-y-2">
                    <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Target Profit Percentage
                    </label>
                    <div class="relative">
                        <input type="number" min="5" max="95" name="target_profit_percent" value="{{ (int) ($economyEditor['target_profit_percent'] ?? 60) }}" required 
                            class="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                    </div>
                    <input type="range" min="5" max="95" value="{{ (int) ($economyEditor['target_profit_percent'] ?? 60) }}" 
                        class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        oninput="this.previousElementSibling.previousElementSibling.value = this.value">
                </div>

                <button type="submit" class="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-amber-500/25">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Apply Auto Preset
                </button>

                <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 space-y-2">
                    <p class="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        What this does:
                    </p>
                    <ul class="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                        <li>Updates profit-per-visitor range</li>
                        <li>Adjusts conversion ratios</li>
                        <li>Sets visitor chance & tick rate</li>
                        <li>Updates token & influencer costs</li>
                        <li>Adjusts popularity visitor settings</li>
                    </ul>
                </div>
            </form>
        </div>
    </div>

    {{-- Packages Tab Content --}}
    <div x-show="activeTab === 'packages'" x-transition class="space-y-6">
        {{-- Add Package Form --}}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Add New Package</h3>
                        <p class="text-sm text-slate-500">Create a new token top-up package for users</p>
                    </div>
                </div>
            </div>
            
            <form method="post" action="{{ route('superadmin.pricing.packages.store') }}" class="p-6">
                @csrf
                <input type="hidden" name="package_type" value="ai_tokens">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Package Code</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                            </span>
                            <input name="code" placeholder="tokens_starter" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Display Name</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </span>
                            <input name="name" placeholder="Starter Pack" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2 lg:col-span-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                            </span>
                            <input name="description" placeholder="Short description of the package" 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Tokens</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1H9m3 0h3" /></svg>
                            </span>
                            <input type="number" min="1" name="tokens_amount" placeholder="1000" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bonus Tokens</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </span>
                            <input type="number" min="0" name="bonus_tokens" placeholder="100" 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price (RM)</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RM</span>
                            <input type="number" min="0.01" step="0.01" name="price_rm" placeholder="9.99" required 
                                class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Original Price</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RM</span>
                            <input type="number" min="0.01" step="0.01" name="original_price_rm" placeholder="14.99 (optional)" 
                                class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Badge</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                            </span>
                            <select name="badge" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none">
                                <option value="none">No badge</option>
                                <option value="popular">🔥 Popular</option>
                                <option value="best_value">💎 Best Value</option>
                            </select>
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                            </span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort Order</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                            </span>
                            <input type="number" min="0" name="sort_order" placeholder="0" 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                        </div>
                    </div>

                    <div class="flex items-end gap-3">
                        <label class="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <input type="checkbox" name="is_active" value="1" checked class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
                        </label>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/25">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                            Add Package
                        </button>
                    </div>
                </div>
            </form>
        </div>

        {{-- Packages List --}}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Existing Packages
                </h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                        <tr>
                            <th class="px-6 py-4 font-semibold">Package Details</th>
                            <th class="px-6 py-4 font-semibold">Tokens</th>
                            <th class="px-6 py-4 font-semibold">Pricing</th>
                            <th class="px-6 py-4 font-semibold">Status</th>
                            <th class="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody x-data="{ openRow: null }" class="divide-y divide-slate-100 dark:divide-slate-800">
                        @forelse ($packages as $package)
                        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                        {{ substr($package->name, 0, 2) }}
                                    </div>
                                    <div>
                                        <p class="font-semibold text-slate-900 dark:text-white">{{ $package->name }}</p>
                                        <p class="text-xs text-slate-500 font-mono">{{ $package->code }}</p>
                                        @if ($package->description)
                                        <p class="text-xs text-slate-400 mt-0.5">{{ $package->description }}</p>
                                        @endif
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="space-y-1">
                                    <p class="text-slate-900 dark:text-white font-semibold">{{ number_format((int) $package->tokens_amount) }}</p>
                                    @if ($package->bonus_tokens > 0)
                                    <span class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        {{ number_format((int) $package->bonus_tokens) }} bonus
                                    </span>
                                    @endif
                                    <p class="text-xs text-slate-400">Total: {{ number_format((int) $package->tokens_amount + (int) $package->bonus_tokens) }}</p>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="space-y-1">
                                    <p class="text-slate-900 dark:text-white font-semibold">RM {{ number_format((float) $package->price_rm, 2) }}</p>
                                    @if ($package->original_price_rm)
                                    <p class="text-xs text-slate-400 line-through">RM {{ number_format((float) $package->original_price_rm, 2) }}</p>
                                    @endif
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex flex-wrap gap-2">
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium {{ $package->is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }}">
                                        <span class="w-1.5 h-1.5 rounded-full {{ $package->is_active ? 'bg-emerald-500' : 'bg-slate-400' }}"></span>
                                        {{ $package->is_active ? 'Active' : 'Inactive' }}
                                    </span>
                                    @if ($package->badge !== 'none')
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                        @if ($package->badge === 'popular') 🔥 @elseif ($package->badge === 'best_value') 💎 @endif
                                        {{ $package->badge === 'best_value' ? 'Best Value' : ucfirst($package->badge) }}
                                    </span>
                                    @endif
                                </div>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button type="button" @click="openRow = openRow === '{{ (string) $package->id }}' ? null : '{{ (string) $package->id }}'" 
                                        :class="openRow === '{{ (string) $package->id }}' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'"
                                        class="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        <span x-text="openRow === '{{ (string) $package->id }}' ? 'Cancel' : 'Edit'"></span>
                                    </button>
                                    <form method="post" action="{{ route('superadmin.pricing.packages.delete', $package->id) }}" onsubmit="return confirm('Are you sure you want to delete this package?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        {{-- Inline Edit Form --}}
                        <tr x-show="openRow === '{{ (string) $package->id }}'" x-cloak style="display: none;">
                            <td colspan="5" class="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                <form method="post" action="{{ route('superadmin.pricing.packages.update', $package->id) }}" class="space-y-4">
                                    @csrf
                                    @method('PUT')
                                    <input type="hidden" name="package_type" value="ai_tokens">
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Code</label>
                                            <input name="code" value="{{ $package->code }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Name</label>
                                            <input name="name" value="{{ $package->name }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1 lg:col-span-2">
                                            <label class="text-xs font-medium text-slate-500">Description</label>
                                            <input name="description" value="{{ $package->description }}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Base Tokens</label>
                                            <input type="number" name="tokens_amount" value="{{ (int) $package->tokens_amount }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Bonus Tokens</label>
                                            <input type="number" name="bonus_tokens" value="{{ (int) $package->bonus_tokens }}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Price (RM)</label>
                                            <input type="number" step="0.01" name="price_rm" value="{{ number_format((float) $package->price_rm, 2, '.', '') }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Original (RM)</label>
                                            <input type="number" step="0.01" name="original_price_rm" value="{{ $package->original_price_rm ? number_format((float) $package->original_price_rm, 2, '.', '') : '' }}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Badge</label>
                                            <select name="badge" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                                <option value="none" {{ $package->badge === 'none' ? 'selected' : '' }}>None</option>
                                                <option value="popular" {{ $package->badge === 'popular' ? 'selected' : '' }}>Popular</option>
                                                <option value="best_value" {{ $package->badge === 'best_value' ? 'selected' : '' }}>Best Value</option>
                                            </select>
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Sort Order</label>
                                            <input type="number" name="sort_order" value="{{ (int) $package->sort_order }}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="flex items-end gap-2">
                                            <label class="flex items-center gap-2 text-sm">
                                                <input type="checkbox" name="is_active" value="1" {{ $package->is_active ? 'checked' : '' }} class="rounded border-slate-300">
                                                <span class="text-slate-600 dark:text-slate-400">Active</span>
                                            </label>
                                        </div>
                                        <div class="flex items-end">
                                            <button type="submit" class="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all">
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="5" class="px-6 py-12 text-center">
                                <div class="flex flex-col items-center gap-3">
                                    <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-900 dark:text-white font-medium">No packages yet</p>
                                        <p class="text-sm text-slate-500">Create your first token package above</p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    {{-- Token Rules Tab Content --}}
    <div x-show="activeTab === 'rules'" x-transition class="space-y-6">
        {{-- Add Rule Form --}}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Add Token Cost Rule</h3>
                        <p class="text-sm text-slate-500">Define how many tokens each action costs</p>
                    </div>
                </div>
            </div>
            
            <form method="post" action="{{ route('superadmin.pricing.rules.store') }}" class="p-6">
                @csrf
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                    <div class="space-y-2 lg:col-span-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operation Key</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            </span>
                            <input name="operation_key" placeholder="e.g., generate_image" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                        </div>
                        <p class="text-xs text-slate-400">Unique identifier for this operation</p>
                    </div>

                    <div class="space-y-2 lg:col-span-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Display Name</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            </span>
                            <input name="operation_name" placeholder="e.g., Generate Image" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                        </div>
                        <p class="text-xs text-slate-400">User-friendly name shown in UI</p>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Token Cost</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1H9m3 0h3" /></svg>
                            </span>
                            <input type="number" min="0" name="token_cost" placeholder="10" required 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2 lg:col-span-4">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                            </span>
                            <input name="description" placeholder="Optional description explaining when this cost applies" 
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort Order</label>
                        <input type="number" min="0" name="sort_order" placeholder="0" 
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                    </div>

                    <div class="flex items-end gap-3">
                        <label class="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <input type="checkbox" name="is_active" value="1" checked class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
                        </label>
                    </div>

                    <div class="flex items-end lg:col-span-3">
                        <button type="submit" class="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-emerald-500/25">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                            Add Rule
                        </button>
                    </div>
                </div>
            </form>
        </div>

        {{-- Rules List --}}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Token Cost Rules
                </h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                        <tr>
                            <th class="px-6 py-4 font-semibold">Rule</th>
                            <th class="px-6 py-4 font-semibold">Token Cost</th>
                            <th class="px-6 py-4 font-semibold">Status</th>
                            <th class="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody x-data="{ openRow: null }" class="divide-y divide-slate-100 dark:divide-slate-800">
                        @forelse ($rules as $rule)
                        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td class="px-6 py-4">
                                <div class="space-y-1">
                                    <p class="font-semibold text-slate-900 dark:text-white">{{ $rule->operation_name }}</p>
                                    <p class="text-xs text-slate-500 font-mono">{{ $rule->operation_key }}</p>
                                    @if ($rule->description)
                                    <p class="text-xs text-slate-400">{{ $rule->description }}</p>
                                    @endif
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                        <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1H9m3 0h3" /></svg>
                                    </div>
                                    <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ number_format((int) $rule->token_cost) }}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium {{ $rule->is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }}">
                                    <span class="w-1.5 h-1.5 rounded-full {{ $rule->is_active ? 'bg-emerald-500' : 'bg-slate-400' }}"></span>
                                    {{ $rule->is_active ? 'Active' : 'Inactive' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button type="button" @click="openRow = openRow === '{{ (string) $rule->id }}' ? null : '{{ (string) $rule->id }}'" 
                                        :class="openRow === '{{ (string) $rule->id }}' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'"
                                        class="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        <span x-text="openRow === '{{ (string) $rule->id }}' ? 'Cancel' : 'Edit'"></span>
                                    </button>
                                    <form method="post" action="{{ route('superadmin.pricing.rules.delete', $rule->id) }}" onsubmit="return confirm('Delete this rule?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        {{-- Inline Edit Form --}}
                        <tr x-show="openRow === '{{ (string) $rule->id }}'" x-cloak style="display: none;">
                            <td colspan="4" class="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                <form method="post" action="{{ route('superadmin.pricing.rules.update', $rule->id) }}" class="space-y-4">
                                    @csrf
                                    @method('PUT')
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div class="space-y-1 lg:col-span-2">
                                            <label class="text-xs font-medium text-slate-500">Operation Key</label>
                                            <input name="operation_key" value="{{ $rule->operation_key }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono">
                                        </div>
                                        <div class="space-y-1 lg:col-span-2">
                                            <label class="text-xs font-medium text-slate-500">Display Name</label>
                                            <input name="operation_name" value="{{ $rule->operation_name }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Token Cost</label>
                                            <input type="number" name="token_cost" value="{{ (int) $rule->token_cost }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1 lg:col-span-3">
                                            <label class="text-xs font-medium text-slate-500">Description</label>
                                            <input name="description" value="{{ $rule->description }}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Sort Order</label>
                                            <input type="number" name="sort_order" value="{{ (int) $rule->sort_order }}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="flex items-end gap-2">
                                            <label class="flex items-center gap-2 text-sm">
                                                <input type="checkbox" name="is_active" value="1" {{ $rule->is_active ? 'checked' : '' }} class="rounded border-slate-300">
                                                <span class="text-slate-600 dark:text-slate-400">Active</span>
                                            </label>
                                        </div>
                                        <div class="flex items-end">
                                            <button type="submit" class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all">
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="4" class="px-6 py-12 text-center">
                                <div class="flex flex-col items-center gap-3">
                                    <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-900 dark:text-white font-medium">No rules configured</p>
                                        <p class="text-sm text-slate-500">Add your first token cost rule above</p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    {{-- Visitors Tab Content --}}
    <div x-show="activeTab === 'visitors'" x-transition class="space-y-6">
        
        {{-- Influencer Economy Editors --}}
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                            <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Influencer Tier Pricing</h3>
                            <p class="text-sm text-slate-500">Edit token/day and popularity boost ranges by tier.</p>
                        </div>
                    </div>
                </div>
                <form method="post" action="{{ route('superadmin.pricing.economy.update') }}" class="p-6 space-y-5">
                    @csrf
                    @method('PUT')
                    @foreach (['nano', 'micro', 'macro', 'mega'] as $tier)
                    @php
                    $tierEditor = is_array($influencerEditor[$tier] ?? null) ? $influencerEditor[$tier] : ['token_per_day' => 0, 'boost_min_percent' => 0, 'boost_max_percent' => 0];
                    @endphp
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                        <div class="flex items-center">
                            <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">{{ $tier }}</span>
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">Token / Day</label>
                            <input type="number" min="1" name="influencer_token_per_day_{{ $tier }}" value="{{ (int) ($tierEditor['token_per_day'] ?? 0) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">Boost Min (%)</label>
                            <input type="number" min="0" max="500" name="influencer_boost_min_{{ $tier }}" value="{{ (int) ($tierEditor['boost_min_percent'] ?? 0) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">Boost Max (%)</label>
                            <input type="number" min="0" max="500" name="influencer_boost_max_{{ $tier }}" value="{{ (int) ($tierEditor['boost_max_percent'] ?? 0) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                    </div>
                    @endforeach
                    <div class="flex justify-end">
                        <button type="submit" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all">
                            Save Influencer Tiers
                        </button>
                    </div>
                </form>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">Duration Multipliers</h3>
                    <p class="text-sm text-slate-500">Per-hour/day campaign multipliers used by frontend and backend.</p>
                </div>
                <form method="post" action="{{ route('superadmin.pricing.economy.update') }}" class="p-6 space-y-4">
                    @csrf
                    @method('PUT')
                    <div class="space-y-1">
                        <label class="text-xs font-medium text-slate-500">Default Duration (hours)</label>
                        <input type="number" min="1" max="168" name="influencer_duration_default_hours" value="{{ (int) ($influencerDurationEditor['duration_default_hours'] ?? 168) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-medium text-slate-500">Boost Cap (%)</label>
                        <input type="number" min="0" max="500" name="influencer_marketing_boost_cap_percent" value="{{ (int) ($influencerDurationEditor['marketing_boost_cap_percent'] ?? 75) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">1h (%)</label>
                            <input type="number" min="1" name="influencer_duration_multiplier_1h_percent" value="{{ (int) ($influencerDurationEditor['1h_percent'] ?? 10) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">6h (%)</label>
                            <input type="number" min="1" name="influencer_duration_multiplier_6h_percent" value="{{ (int) ($influencerDurationEditor['6h_percent'] ?? 30) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">12h (%)</label>
                            <input type="number" min="1" name="influencer_duration_multiplier_12h_percent" value="{{ (int) ($influencerDurationEditor['12h_percent'] ?? 50) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">24h (%)</label>
                            <input type="number" min="1" name="influencer_duration_multiplier_24h_percent" value="{{ (int) ($influencerDurationEditor['24h_percent'] ?? 100) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">72h (%)</label>
                            <input type="number" min="1" name="influencer_duration_multiplier_72h_percent" value="{{ (int) ($influencerDurationEditor['72h_percent'] ?? 250) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-slate-500">168h (%)</label>
                            <input type="number" min="1" name="influencer_duration_multiplier_168h_percent" value="{{ (int) ($influencerDurationEditor['168h_percent'] ?? 500) }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        </div>
                    </div>
                    <button type="submit" class="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all">
                        Save Duration Settings
                    </button>
                </form>
            </div>
        </div>

        {{-- Influencer Plan Matrix --}}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Influencer Plan Matrix (Live Preview)</h3>
                        <p class="text-sm text-slate-500">Current token/day pricing and popularity boost per tier.</p>
                    </div>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                        <tr>
                            <th class="px-6 py-4 font-semibold">Tier</th>
                            <th class="px-6 py-4 font-semibold">Token / Day</th>
                            <th class="px-6 py-4 font-semibold">Boost Range</th>
                            <th class="px-6 py-4 font-semibold">Status Preview</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        @forelse ($influencerTiers as $tier => $config)
                        @php
                        $boost = is_array($config['boost_percent_range'] ?? null) ? $config['boost_percent_range'] : ['min' => 0, 'max' => 0];
                        $tokens = (int) ($config['token_per_day'] ?? 0);
                        @endphp
                        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center">
                                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                    </div>
                                    <span class="font-semibold text-slate-900 dark:text-white capitalize">{{ $tier }}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                                        <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1H9m3 0h3" /></svg>
                                    </div>
                                    <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ number_format($tokens) }}</span>
                                    <span class="text-xs text-slate-400">/ day</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ number_format((int) ($boost['min'] ?? 0)) }}%</span>
                                    <span class="text-slate-400">-</span>
                                    <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ number_format((int) ($boost['max'] ?? 0)) }}%</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                @if ($tokens > 0)
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Active
                                </span>
                                @else
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    Inactive
                                </span>
                                @endif
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="4" class="px-6 py-12 text-center text-slate-500">No influencer tiers configured.</td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        {{-- Popularity Ranges --}}
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Popularity vs Daily Visitors</h3>
                        <p class="text-sm text-slate-500">Configure visitor count based on popularity level (1-100)</p>
                    </div>
                </div>
            </div>
            
            {{-- Add Range Form --}}
            <div class="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                <form method="post" action="{{ route('superadmin.pricing.popularity-ranges.store') }}" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    @csrf
                    <div class="space-y-1">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Popularity</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Lv</span>
                            <input type="number" min="1" max="100" name="min_popularity" placeholder="1" required 
                                class="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Max Popularity</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Lv</span>
                            <input type="number" min="1" max="100" name="max_popularity" placeholder="10" required 
                                class="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Visitors</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </span>
                            <input type="number" min="1" max="1000" name="daily_visitors" placeholder="50" required 
                                class="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort Order</label>
                        <input type="number" min="0" name="sort_order" placeholder="0" 
                            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all">
                    </div>
                    <div class="flex items-end">
                        <label class="flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all w-full">
                            <input type="checkbox" name="is_active" value="1" checked class="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500">
                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
                        </label>
                    </div>
                    <div class="flex items-end">
                        <button type="submit" class="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-sky-500/25">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                            Add Range
                        </button>
                    </div>
                </form>
            </div>

            {{-- Ranges List --}}
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                        <tr>
                            <th class="px-6 py-4 font-semibold">Popularity Range</th>
                            <th class="px-6 py-4 font-semibold">Daily Visitors</th>
                            <th class="px-6 py-4 font-semibold">Sort</th>
                            <th class="px-6 py-4 font-semibold">Status</th>
                            <th class="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody x-data="{ openRow: null }" class="divide-y divide-slate-100 dark:divide-slate-800">
                        @forelse ($popularityRanges as $range)
                        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-sm">
                                        {{ (int) $range->min_popularity }}-{{ (int) $range->max_popularity }}
                                    </div>
                                    <div>
                                        <p class="font-semibold text-slate-900 dark:text-white">Level {{ (int) $range->min_popularity }} - {{ (int) $range->max_popularity }}</p>
                                        <div class="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                            <div class="h-full bg-sky-500 rounded-full" style="width: {{ min(100, ((int) $range->max_popularity / 100) * 100) }}%"></div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                                        <svg class="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                    <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ number_format((int) $range->daily_visitors) }}</span>
                                    <span class="text-xs text-slate-400">/ day</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="text-slate-700 dark:text-slate-300">{{ number_format((int) $range->sort_order) }}</span>
                            </td>
                            <td class="px-6 py-4">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium {{ $range->is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }}">
                                    <span class="w-1.5 h-1.5 rounded-full {{ $range->is_active ? 'bg-emerald-500' : 'bg-slate-400' }}"></span>
                                    {{ $range->is_active ? 'Active' : 'Inactive' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button type="button" @click="openRow = openRow === '{{ (string) $range->id }}' ? null : '{{ (string) $range->id }}'" 
                                        :class="openRow === '{{ (string) $range->id }}' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'"
                                        class="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        <span x-text="openRow === '{{ (string) $range->id }}' ? 'Cancel' : 'Edit'"></span>
                                    </button>
                                    <form method="post" action="{{ route('superadmin.pricing.popularity-ranges.delete', $range->id) }}" onsubmit="return confirm('Delete this range?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        {{-- Inline Edit Form --}}
                        <tr x-show="openRow === '{{ (string) $range->id }}'" x-cloak style="display: none;">
                            <td colspan="5" class="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                <form method="post" action="{{ route('superadmin.pricing.popularity-ranges.update', $range->id) }}" class="space-y-4">
                                    @csrf
                                    @method('PUT')
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Min Level</label>
                                            <input type="number" min="1" max="100" name="min_popularity" value="{{ (int) $range->min_popularity }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Max Level</label>
                                            <input type="number" min="1" max="100" name="max_popularity" value="{{ (int) $range->max_popularity }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Visitors/Day</label>
                                            <input type="number" min="1" max="1000" name="daily_visitors" value="{{ (int) $range->daily_visitors }}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs font-medium text-slate-500">Sort</label>
                                            <input type="number" min="0" name="sort_order" value="{{ (int) $range->sort_order }}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                        </div>
                                        <div class="flex items-end">
                                            <label class="flex items-center gap-2 text-sm">
                                                <input type="checkbox" name="is_active" value="1" {{ $range->is_active ? 'checked' : '' }} class="rounded border-slate-300">
                                                <span class="text-slate-600 dark:text-slate-400">Active</span>
                                            </label>
                                        </div>
                                        <div class="flex items-end">
                                            <button type="submit" class="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-all">
                                                Save Range
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="5" class="px-6 py-12 text-center">
                                <div class="flex flex-col items-center gap-3">
                                    <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-900 dark:text-white font-medium">No popularity ranges</p>
                                        <p class="text-sm text-slate-500">Add your first popularity range above</p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
