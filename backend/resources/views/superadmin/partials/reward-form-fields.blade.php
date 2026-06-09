@php
    $isAlpine = ($prefix ?? '') === 'x-';
@endphp

<div class="space-y-5">
    {{-- Image Upload Section --}}
    <div class="md:col-span-2" x-data="imageDropzone('{{ $isAlpine ? 'edit' : 'add' }}')">
        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reward Image</label>
        <input type="hidden" name="image_url" :value="imageUrl" />

        {{-- Image Preview --}}
        <template x-if="imageUrl">
            <div class="mb-3 relative inline-block group">
                <img :src="imageUrl" class="w-40 h-32 object-cover rounded-xl border-2 border-indigo-200 dark:border-indigo-700 shadow-sm" />
                <button type="button" @click="removeImage()" class="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm shadow-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </template>

        {{-- Dropzone --}}
        <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop($event)"
            @click="$refs.fileInput.click()"
            :class="isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 ring-2 ring-indigo-500/20'
                : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500'"
            class="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
        >
            <input type="file" x-ref="fileInput" @change="handleFileSelect($event)" accept="image/*" class="hidden" />

            <template x-if="isUploading">
                <div class="flex flex-col items-center gap-3">
                    <svg class="w-10 h-10 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    <p class="text-sm text-indigo-600 font-medium">Uploading image...</p>
                </div>
            </template>

            <template x-if="!isUploading">
                <div class="flex flex-col items-center gap-3">
                    <div class="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                        <svg class="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm text-slate-600 dark:text-slate-400"><span class="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
                        <p class="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                </div>
            </template>

            <template x-if="uploadError">
                <p class="text-sm text-red-500 mt-3 flex items-center justify-center gap-1" x-text="uploadError">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </p>
            </template>
        </div>
    </div>

    {{-- Form Grid --}}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        {{-- Name --}}
        <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Reward Name
                <span class="text-red-500">*</span>
            </label>
            @if ($isAlpine)
                <input type="text" name="name" x-model="editItem.name" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="e.g., Theme Park Family Pass">
            @else
                <input type="text" name="name" value="{{ old('name') }}" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="e.g., Theme Park Family Pass">
            @endif
        </div>

        {{-- Category --}}
        <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Category</label>
            <div class="relative">
                @if ($isAlpine)
                    <select name="category" x-model="editItem.category" 
                        class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 appearance-none transition-all">
                @else
                    <select name="category" 
                        class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 appearance-none transition-all">
                @endif
                    @php
                        $categories = [
                            'theme_park' => 'Theme Park',
                            'food' => 'Food & Dining',
                            'beauty' => 'Beauty & Wellness',
                            'health' => 'Health & Fitness',
                            'travel' => 'Travel & Leisure',
                            'more' => 'Other',
                        ];
                    @endphp
                    @foreach($categories as $value => $label)
                        <option value="{{ $value }}">{{ $label }}</option>
                    @endforeach
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </div>
        </div>

        {{-- Type --}}
        <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reward Type</label>
            <div class="relative">
                @if ($isAlpine)
                    <select name="type" x-model="editItem.type" 
                        class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 appearance-none transition-all">
                @else
                    <select name="type" 
                        class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 appearance-none transition-all">
                @endif
                    @php
                        $types = [
                            'ticket' => 'Ticket',
                            'voucher' => 'Voucher',
                            'merch' => 'Merchandise',
                        ];
                    @endphp
                    @foreach($types as $value => $label)
                        <option value="{{ $value }}">{{ $label }}</option>
                    @endforeach
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </div>
        </div>

        {{-- Price --}}
        <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                    </svg>
                    Price (Tokens)
                    <span class="text-red-500">*</span>
                </span>
            </label>
            @if ($isAlpine)
                <input type="number" min="1" step="1" name="price_coins" x-model="editItem.price_coins" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="100">
            @else
                <input type="number" min="1" step="1" name="price_coins" value="{{ old('price_coins', 100) }}" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="100">
            @endif
        </div>

        {{-- Stock --}}
        <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                    Stock Quantity
                    <span class="text-red-500">*</span>
                </span>
            </label>
            @if ($isAlpine)
                <input type="number" min="0" step="1" name="stock" x-model="editItem.stock" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="10">
            @else
                <input type="number" min="0" step="1" name="stock" value="{{ old('stock', 10) }}" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="10">
            @endif
        </div>

        {{-- Partner --}}
        <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Partner / Brand
                </span>
            </label>
            @if ($isAlpine)
                <input type="text" name="partner" x-model="editItem.partner" 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="e.g., Universal Studios">
            @else
                <input type="text" name="partner" value="{{ old('partner') }}" 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="e.g., Universal Studios">
            @endif
        </div>

        {{-- Sort Order --}}
        <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    Sort Order
                </span>
            </label>
            @if ($isAlpine)
                <input type="number" min="0" step="1" name="sort_order" x-model="editItem.sort_order" 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="0">
            @else
                <input type="number" min="0" step="1" name="sort_order" value="{{ old('sort_order', 0) }}" 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all"
                    placeholder="0">
            @endif
            <p class="text-xs text-slate-500 mt-1">Lower numbers appear first</p>
        </div>

        {{-- Description --}}
        <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Description
                <span class="text-red-500">*</span>
            </label>
            @if ($isAlpine)
                <textarea name="description" rows="3" x-model="editItem.description" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all resize-none"
                    placeholder="Brief description of the reward..."></textarea>
            @else
                <textarea name="description" rows="3" required 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all resize-none"
                    placeholder="Brief description of the reward...">{{ old('description') }}</textarea>
            @endif
        </div>

        {{-- Details --}}
        <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span class="flex items-center gap-1.5">
                    Additional Details
                    <span class="text-xs font-normal text-slate-400">(Optional)</span>
                </span>
            </label>
            @if ($isAlpine)
                <textarea name="details" rows="3" x-model="editItem.details" 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all resize-none"
                    placeholder="Terms, conditions, or additional information..."></textarea>
            @else
                <textarea name="details" rows="3" 
                    class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-4 py-3 transition-all resize-none"
                    placeholder="Terms, conditions, or additional information...">{{ old('details') }}</textarea>
            @endif
        </div>

        {{-- Active Checkbox --}}
        <div class="md:col-span-2">
            <label class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div class="flex items-center h-5">
                    @if ($isAlpine)
                        <input type="checkbox" name="is_active" value="1" x-model="editItem.is_active" id="is_active_{{ $isAlpine ? 'edit' : 'add' }}" 
                            class="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0">
                    @else
                        <input type="checkbox" name="is_active" value="1" checked id="is_active_{{ $isAlpine ? 'edit' : 'add' }}" 
                            class="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0">
                    @endif
                </div>
                <div class="flex-1">
                    <label for="is_active_{{ $isAlpine ? 'edit' : 'add' }}" class="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Active</label>
                    <p class="text-xs text-slate-500 mt-0.5">Make this reward visible and available for students to redeem</p>
                </div>
                <div class="flex-shrink-0">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                        Visible
                    </span>
                </div>
            </label>
        </div>
    </div>
</div>
