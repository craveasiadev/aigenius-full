@extends('superadmin.layout')

@section('title', ($mode === 'create' ? 'New' : 'Edit') . ' Workshop')
@section('header', $mode === 'create' ? 'New workshop' : 'Edit workshop')

@section('content')
<div class="max-w-2xl space-y-6">
    @if ($errors->any())
        <div class="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
            <ul class="list-disc pl-5 space-y-0.5">
                @foreach ($errors->all() as $err)
                    <li>{{ $err }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form
        method="post"
        action="{{ $mode === 'create' ? route('superadmin.event-workshops.store') : route('superadmin.event-workshops.update', $shop->id) }}"
        enctype="multipart/form-data"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5"
    >
        @csrf
        @if ($mode === 'edit') @method('PUT') @endif

        <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Shop name</label>
            <input
                type="text"
                name="name"
                required
                maxlength="120"
                value="{{ old('name', $shop->name) }}"
                placeholder="Zus Coffee"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
            <p class="text-xs text-slate-400 mt-1">Appears on the globe carousel label.</p>
        </div>

        <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Sponsoring company</label>
            <input
                type="text"
                name="company_name"
                required
                maxlength="160"
                value="{{ old('company_name', $shop->company_name) }}"
                placeholder="Zus Holdings Sdn Bhd"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
            <p class="text-xs text-slate-400 mt-1">Legal / brand entity behind the workshop.</p>
        </div>

        <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Business nature</label>
            <textarea
                name="business_nature"
                maxlength="2000"
                rows="3"
                placeholder="One sentence — shown to scanners + students."
                class="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >{{ old('business_nature', $shop->business_nature) }}</textarea>
        </div>

        <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Modules</label>
            <input
                type="text"
                name="modules"
                value="{{ old('modules', is_array($shop->modules) ? implode(', ', $shop->modules) : '') }}"
                placeholder="cafe, marketing"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
            <p class="text-xs text-slate-400 mt-1">Comma-separated business modules this shop unlocks.</p>
        </div>

        <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Shop image</label>
            <div class="flex items-start gap-4">
                <div class="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                    @if ($shop->shop_image_path)
                        <img src="{{ $shop->shop_image_url }}" alt="" class="w-full h-full object-contain">
                    @else
                        <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    @endif
                </div>
                <div class="flex-1">
                    <input
                        type="file"
                        name="shop_image"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        @if ($mode === 'create') required @endif
                        class="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 dark:file:bg-indigo-500/10 file:text-indigo-700 dark:file:text-indigo-300 file:font-semibold hover:file:bg-indigo-100"
                    >
                    <p class="text-xs text-slate-400 mt-2 leading-snug">
                        JPG / PNG / WebP, max 8 MB. Server resizes to 1280 px and re-encodes
                        at JPEG q=85 (about 90% smaller than the original).
                    </p>
                    @if ($mode === 'edit')
                        <p class="text-xs text-slate-400 mt-1">Leave empty to keep the existing image.</p>
                    @endif
                </div>
            </div>
        </div>

        <label class="flex items-center gap-3 cursor-pointer">
            <input
                type="checkbox"
                name="is_active"
                value="1"
                @checked(old('is_active', $shop->is_active ?? true))
                class="w-4 h-4 accent-indigo-500"
            >
            <span class="text-sm text-slate-700 dark:text-slate-300">Live — staff can scan students into this shop right now.</span>
        </label>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <a href="{{ route('superadmin.event-workshops.index') }}" class="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</a>
            <button type="submit" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm">
                {{ $mode === 'create' ? 'Create workshop' : 'Save changes' }}
            </button>
        </div>
    </form>
</div>
@endsection
