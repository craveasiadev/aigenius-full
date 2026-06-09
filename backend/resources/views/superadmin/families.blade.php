@extends('superadmin.layout')

@section('title', 'Parents & Kids')
@section('header', 'Families')

@section('content')
<div x-data="{ kidModal: false, kid: null }">

<!-- Parents -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 flex flex-col" x-data="{ expanded: null }">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">Parents</h3>
        <span class="text-xs text-slate-500">{{ $parents->total() }} total</span>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                    <th class="px-6 py-4">Parent Name</th>
                    <th class="px-6 py-4">Email</th>
                    <th class="px-6 py-4">Phone</th>
                    <th class="px-6 py-4">Children</th>
                    <th class="px-6 py-4">Joined Date</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($parents as $parent)
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    @click="expanded = expanded === '{{ $parent->id }}' ? null : '{{ $parent->id }}'">
                    <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                {{ substr($parent->name, 0, 2) }}
                            </div>
                            {{ $parent->name }}
                        </div>
                    </td>
                    <td class="px-6 py-4">{{ $parent->email }}</td>
                    <td class="px-6 py-4 text-xs">{{ $parent->phone_number ?? '-' }}</td>
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-900 dark:text-white">{{ $parent->genius_profiles_count }} child(ren)</span>
                    </td>
                    <td class="px-6 py-4 text-xs text-slate-500">{{ optional($parent->created_at)->format('d M Y') }}</td>
                    <td class="px-6 py-4">
                        <svg class="w-4 h-4 text-slate-400 transition-transform" :class="expanded === '{{ $parent->id }}' ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </td>
                </tr>
                <!-- Expandable Children Panel -->
                <tr x-show="expanded === '{{ $parent->id }}'" x-cloak x-transition>
                    <td colspan="6" class="px-6 py-0 bg-slate-50/50 dark:bg-slate-800/30">
                        <div class="py-4">
                            @if ($parent->geniusProfiles->isNotEmpty())
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                @foreach ($parent->geniusProfiles as $child)
                                <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                                     @click.stop="kid = {
                                        genius_name: '{{ addslashes($child->genius_name) }}',
                                        genius_id: '{{ $child->genius_id }}',
                                        age: {{ $child->age ?? 'null' }},
                                        gender: '{{ $child->gender ?? '-' }}',
                                        profile_picture: '{{ $child->profile_picture_url ?? '' }}',
                                        passion: '{{ $child->passion_category ?? '-' }}',
                                        shop_name: '{{ addslashes($child->aipreneur_shop_name ?? '-') }}',
                                        onboarding: {{ $child->aipreneur_onboarding_completed ? 'true' : 'false' }},
                                        xp: {{ (int) ($child->rewards?->xp ?? 0) }},
                                        level: {{ (int) ($child->rewards?->level ?? 1) }},
                                        coins: {{ (int) ($child->rewards?->coins ?? 0) }},
                                        ai_tokens: {{ (int) ($child->rewards?->ai_tokens ?? 0) }},
                                        stars: {{ (int) ($child->rewards?->stars ?? 0) }},
                                        current_streak: {{ (int) ($child->rewards?->current_streak ?? 0) }},
                                        longest_streak: {{ (int) ($child->rewards?->longest_streak ?? 0) }},
                                        badges: {{ json_encode($child->rewards?->badges ?? []) }},
                                        total_sales: {{ (float) ($child->business?->total_sales ?? 0) }},
                                        total_profit: {{ (float) ($child->business?->total_profit ?? 0) }},
                                        total_costs: {{ (float) ($child->business?->total_costs ?? 0) }},
                                        shop_launched: {{ ($child->business?->shop_launched ?? false) ? 'true' : 'false' }},
                                        shop_theme: '{{ $child->business?->shop_theme ?? '-' }}',
                                        module_product: {{ (int) ($child->business?->module_product_progress ?? 0) }},
                                        module_decorate: {{ (int) ($child->business?->module_decorate_progress ?? 0) }},
                                        module_operation: {{ (int) ($child->business?->module_operation_progress ?? 0) }},
                                        module_marketing: {{ (int) ($child->business?->module_marketing_progress ?? 0) }},
                                        module_innovation: {{ (int) ($child->business?->module_innovation_progress ?? 0) }},
                                        module_csr: {{ (int) ($child->business?->module_csr_progress ?? 0) }},
                                        store_visitors: {{ (int) ($child->business?->store_visitors ?? 0) }},
                                        store_likes: {{ (int) ($child->business?->store_likes ?? 0) }},
                                        store_rating: {{ (float) ($child->business?->store_rating ?? 0) }},
                                        charity_pct: {{ (int) ($child->business?->charity_percentage ?? 0) }},
                                        total_donated: {{ (float) ($child->business?->total_donated ?? 0) }},
                                        impact_points: {{ (int) ($child->business?->impact_points ?? 0) }}
                                     }; kidModal = true">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                            {{ substr($child->genius_name, 0, 1) }}
                                        </div>
                                        <div>
                                            <p class="font-medium text-slate-900 dark:text-white">{{ $child->genius_name }}</p>
                                            <p class="text-xs text-slate-500">{{ $child->genius_id }} &middot; Age {{ $child->age ?? '-' }}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3 text-xs">
                                        <span class="text-purple-600 dark:text-purple-400 font-medium">{{ (int) ($child->rewards?->xp ?? 0) }} XP</span>
                                        <span class="text-amber-600 dark:text-amber-400">{{ (int) ($child->rewards?->coins ?? 0) }} Coins</span>
                                        <span class="text-emerald-600 dark:text-emerald-400">Lv {{ (int) ($child->rewards?->level ?? 1) }}</span>
                                    </div>
                                </div>
                                @endforeach
                            </div>
                            @else
                            <p class="text-sm text-slate-500">No children registered.</p>
                            @endif
                        </div>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">No parent records found.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
        {{ $parents->links() }}
    </div>
</div>

<!-- Kids -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">Kids</h3>
        <span class="text-xs text-slate-500">{{ $kids->total() }} total</span>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                    <th class="px-6 py-4">Kid</th>
                    <th class="px-6 py-4">Genius ID</th>
                    <th class="px-6 py-4">Parent</th>
                    <th class="px-6 py-4">Progress</th>
                    <th class="px-6 py-4">Business</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($kids as $kid)
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    @click="kid = {
                        genius_name: '{{ addslashes($kid->genius_name) }}',
                        genius_id: '{{ $kid->genius_id }}',
                        age: {{ $kid->age ?? 'null' }},
                        gender: '{{ $kid->gender ?? '-' }}',
                        profile_picture: '{{ $kid->profile_picture_url ?? '' }}',
                        passion: '{{ $kid->passion_category ?? '-' }}',
                        shop_name: '{{ addslashes($kid->aipreneur_shop_name ?? '-') }}',
                        onboarding: {{ $kid->aipreneur_onboarding_completed ? 'true' : 'false' }},
                        xp: {{ (int) ($kid->rewards?->xp ?? 0) }},
                        level: {{ (int) ($kid->rewards?->level ?? 1) }},
                        coins: {{ (int) ($kid->rewards?->coins ?? 0) }},
                        ai_tokens: {{ (int) ($kid->rewards?->ai_tokens ?? 0) }},
                        stars: {{ (int) ($kid->rewards?->stars ?? 0) }},
                        current_streak: {{ (int) ($kid->rewards?->current_streak ?? 0) }},
                        longest_streak: {{ (int) ($kid->rewards?->longest_streak ?? 0) }},
                        badges: {{ json_encode($kid->rewards?->badges ?? []) }},
                        total_sales: {{ (float) ($kid->business?->total_sales ?? 0) }},
                        total_profit: {{ (float) ($kid->business?->total_profit ?? 0) }},
                        total_costs: {{ (float) ($kid->business?->total_costs ?? 0) }},
                        shop_launched: {{ ($kid->business?->shop_launched ?? false) ? 'true' : 'false' }},
                        shop_theme: '{{ $kid->business?->shop_theme ?? '-' }}',
                        module_product: {{ (int) ($kid->business?->module_product_progress ?? 0) }},
                        module_decorate: {{ (int) ($kid->business?->module_decorate_progress ?? 0) }},
                        module_operation: {{ (int) ($kid->business?->module_operation_progress ?? 0) }},
                        module_marketing: {{ (int) ($kid->business?->module_marketing_progress ?? 0) }},
                        module_innovation: {{ (int) ($kid->business?->module_innovation_progress ?? 0) }},
                        module_csr: {{ (int) ($kid->business?->module_csr_progress ?? 0) }},
                        store_visitors: {{ (int) ($kid->business?->store_visitors ?? 0) }},
                        store_likes: {{ (int) ($kid->business?->store_likes ?? 0) }},
                        store_rating: {{ (float) ($kid->business?->store_rating ?? 0) }},
                        charity_pct: {{ (int) ($kid->business?->charity_percentage ?? 0) }},
                        total_donated: {{ (float) ($kid->business?->total_donated ?? 0) }},
                        impact_points: {{ (int) ($kid->business?->impact_points ?? 0) }},
                        products_count: {{ $kid->products_count ?? 0 }},
                        staff_count: {{ $kid->staff_count ?? 0 }},
                        campaigns_count: {{ $kid->campaigns_count ?? 0 }},
                        parent_name: '{{ addslashes($kid->parent?->name ?? '-') }}',
                        parent_email: '{{ $kid->parent?->email ?? '' }}'
                    }; kidModal = true">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                {{ substr($kid->genius_name, 0, 1) }}
                            </div>
                            <div>
                                <div class="font-medium text-slate-900 dark:text-white">{{ $kid->genius_name }}</div>
                                <div class="text-xs text-slate-500">Age: {{ $kid->age ?? '-' }}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 font-mono text-xs">{{ $kid->genius_id }}</td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-slate-900 dark:text-white">{{ $kid->parent?->name ?? '-' }}</span>
                            <span class="text-xs text-slate-500">{{ $kid->parent?->email ?? '' }}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col gap-1">
                            <span class="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                                {{ (int) ($kid->rewards?->xp ?? 0) }} XP &middot; Lv {{ (int) ($kid->rewards?->level ?? 1) }}
                            </span>
                            <span class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                {{ (int) ($kid->rewards?->coins ?? 0) }} Coins
                            </span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-xs text-slate-500">Sales: <span class="text-slate-700 dark:text-slate-300 font-mono">RM {{ number_format((float) ($kid->business?->total_sales ?? 0), 2) }}</span></span>
                            <span class="text-xs text-slate-500">Profit: <span class="text-slate-700 dark:text-slate-300 font-mono">RM {{ number_format((float) ($kid->business?->total_profit ?? 0), 2) }}</span></span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">No kid records found.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
        {{ $kids->links() }}
    </div>
</div>

<!-- Kid Detail Modal -->
<div x-show="kidModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="kidModal = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="kidModal = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto" x-show="kidModal" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-lg font-bold text-white shadow-sm">
                    <span x-text="kid?.genius_name?.charAt(0) || '?'"></span>
                </div>
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-white text-lg" x-text="kid?.genius_name"></h3>
                    <p class="text-xs text-slate-500" x-text="kid?.genius_id"></p>
                </div>
            </div>
            <button @click="kidModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <div class="p-6 space-y-6" x-show="kid">

            <!-- Profile -->
            <div>
                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Profile</h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><p class="text-xs text-slate-500 mb-1">Age</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid?.age || '-'"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Gender</p><p class="text-sm font-medium text-slate-900 dark:text-white capitalize" x-text="kid?.gender"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Passion</p><p class="text-sm font-medium text-slate-900 dark:text-white capitalize" x-text="kid?.passion?.replace('_', ' ')"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Onboarding</p><p class="text-sm font-medium" :class="kid?.onboarding ? 'text-emerald-600' : 'text-amber-600'" x-text="kid?.onboarding ? 'Completed' : 'In Progress'"></p></div>
                </div>
            </div>

            <!-- Parent -->
            <div>
                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Parent</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div><p class="text-xs text-slate-500 mb-1">Name</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid?.parent_name || '-'"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Email</p><p class="text-sm text-slate-900 dark:text-white" x-text="kid?.parent_email || '-'"></p></div>
                </div>
            </div>

            <!-- Rewards -->
            <div>
                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Rewards & Progress</h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 text-center">
                        <p class="text-2xl font-bold text-purple-600 dark:text-purple-400" x-text="kid?.xp"></p>
                        <p class="text-xs text-purple-500">XP</p>
                    </div>
                    <div class="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 text-center">
                        <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400" x-text="kid?.level"></p>
                        <p class="text-xs text-indigo-500">Level</p>
                    </div>
                    <div class="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center">
                        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400" x-text="kid?.coins"></p>
                        <p class="text-xs text-amber-500">Coins</p>
                    </div>
                    <div class="bg-sky-50 dark:bg-sky-500/10 rounded-xl p-3 text-center">
                        <p class="text-2xl font-bold text-sky-600 dark:text-sky-400" x-text="kid?.ai_tokens"></p>
                        <p class="text-xs text-sky-500">AI Tokens</p>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-4 mt-3">
                    <div><p class="text-xs text-slate-500 mb-1">Stars</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid?.stars"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Current Streak</p><p class="text-sm font-medium text-slate-900 dark:text-white"><span x-text="kid?.current_streak"></span> days</p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Longest Streak</p><p class="text-sm font-medium text-slate-900 dark:text-white"><span x-text="kid?.longest_streak"></span> days</p></div>
                </div>
            </div>

            <!-- Business -->
            <div>
                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Business</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div><p class="text-xs text-slate-500 mb-1">Shop Name</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid?.shop_name"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Theme</p><p class="text-sm font-medium text-slate-900 dark:text-white capitalize" x-text="kid?.shop_theme?.replace('_', ' ')"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Launched</p><p class="text-sm font-medium" :class="kid?.shop_launched ? 'text-emerald-600' : 'text-amber-600'" x-text="kid?.shop_launched ? 'Yes' : 'No'"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Total Sales</p><p class="text-sm font-mono font-bold text-slate-900 dark:text-white">RM <span x-text="kid ? parseFloat(kid.total_sales).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Total Profit</p><p class="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">RM <span x-text="kid ? parseFloat(kid.total_profit).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Total Costs</p><p class="text-sm font-mono text-slate-600 dark:text-slate-400">RM <span x-text="kid ? parseFloat(kid.total_costs).toFixed(2) : '0.00'"></span></p></div>
                </div>
                <div class="grid grid-cols-3 gap-4 mt-3">
                    <div><p class="text-xs text-slate-500 mb-1">Visitors</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid?.store_visitors"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Likes</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid?.store_likes"></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Rating</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid ? parseFloat(kid.store_rating).toFixed(1) : '0.0'"></p></div>
                </div>
            </div>

            <!-- Module Progress -->
            <div>
                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Module Progress</h4>
                <div class="space-y-2">
                    <template x-for="mod in [
                        { name: 'Product', key: 'module_product', color: 'bg-pink-500' },
                        { name: 'Decorate', key: 'module_decorate', color: 'bg-purple-500' },
                        { name: 'Operation', key: 'module_operation', color: 'bg-blue-500' },
                        { name: 'Marketing', key: 'module_marketing', color: 'bg-emerald-500' },
                        { name: 'Innovation', key: 'module_innovation', color: 'bg-amber-500' },
                        { name: 'CSR', key: 'module_csr', color: 'bg-teal-500' }
                    ]">
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-slate-500 w-20" x-text="mod.name"></span>
                            <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div class="h-full rounded-full transition-all" :class="mod.color" :style="'width: ' + (kid?.[mod.key] || 0) + '%'"></div>
                            </div>
                            <span class="text-xs font-mono text-slate-600 dark:text-slate-400 w-10 text-right" x-text="(kid?.[mod.key] || 0) + '%'"></span>
                        </div>
                    </template>
                </div>
            </div>

            <!-- CSR -->
            <div>
                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Social Impact</h4>
                <div class="grid grid-cols-3 gap-4">
                    <div><p class="text-xs text-slate-500 mb-1">Charity %</p><p class="text-sm font-medium text-slate-900 dark:text-white"><span x-text="kid?.charity_pct"></span>%</p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Total Donated</p><p class="text-sm font-mono text-slate-900 dark:text-white">RM <span x-text="kid ? parseFloat(kid.total_donated).toFixed(2) : '0.00'"></span></p></div>
                    <div><p class="text-xs text-slate-500 mb-1">Impact Points</p><p class="text-sm font-medium text-slate-900 dark:text-white" x-text="kid?.impact_points"></p></div>
                </div>
            </div>

            <!-- Shop Link -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                <a :href="'/s/aipreneur/shop/' + kid?.genius_id" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Visit Shop
                </a>
            </div>
        </div>
    </div>
</div>

</div>
@endsection