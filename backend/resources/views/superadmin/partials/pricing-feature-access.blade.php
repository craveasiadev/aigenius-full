@php
    $featureCards = collect($featureAccess ?? [])->reject(fn ($feature, $key) => $key === 'all');
    $enabledCount = $featureCards->filter(fn ($feature) => !empty($feature['effective_enabled']))->count();
    $globalAccessEnabled = !empty($featureAccess['all']['enabled']);
@endphp

<div x-show="activeTab === 'overview'" x-transition class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
    <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
                <div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">Free Feature Access</h3>
                    <p class="text-sm text-slate-500">Let superadmin unlock selected AI-token features for free without overwriting the saved pricing rules.</p>
                </div>
            </div>
            <div class="flex flex-wrap gap-2">
                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {{ number_format($enabledCount) }} feature{{ $enabledCount === 1 ? '' : 's' }} currently free
                </span>
                @if ($globalAccessEnabled)
                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Global unlock is on
                </span>
                @endif
            </div>
        </div>
    </div>

    <form method="post" action="{{ route('superadmin.pricing.free-access.update') }}" class="p-6 space-y-6">
        @csrf
        @method('PUT')

        <label class="block rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/10 p-5">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-base font-bold text-slate-900 dark:text-white">{{ $featureAccess['all']['label'] ?? 'Unlock all AI features' }}</p>
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">{{ $featureAccess['all']['description'] ?? 'Turn every supported AI feature free.' }}</p>
                    <p class="text-xs text-slate-500 mt-3">Turning this off restores the normal per-feature pricing rules immediately.</p>
                </div>
                <span class="inline-flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-slate-900 px-4 py-3">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Enable</span>
                    <input type="checkbox" name="all" value="1" {{ !empty($featureAccess['all']['enabled']) ? 'checked' : '' }} class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
                </span>
            </div>
        </label>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @foreach ($featureCards as $featureKey => $feature)
            <label class="block rounded-2xl border {{ !empty($feature['effective_enabled']) ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900' }} p-5 transition-all hover:shadow-sm">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-sm font-bold text-slate-900 dark:text-white">{{ $feature['label'] }}</p>
                        <p class="text-xs text-slate-500 mt-2 leading-5">{{ $feature['description'] }}</p>
                        @if (!empty($feature['enabled']))
                        <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-3">Free for this feature.</p>
                        @elseif (!empty($feature['effective_enabled']) && $globalAccessEnabled)
                        <p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-3">Free because global unlock is enabled.</p>
                        @else
                        <p class="text-xs text-slate-400 mt-3">Uses the normal pricing rules.</p>
                        @endif
                    </div>
                    <input type="checkbox" name="{{ $featureKey }}" value="1" {{ !empty($feature['enabled']) ? 'checked' : '' }} class="mt-1 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
                </div>
            </label>
            @endforeach
        </div>

        <div class="flex justify-end">
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all">
                Save Free Access
            </button>
        </div>
    </form>
</div>
