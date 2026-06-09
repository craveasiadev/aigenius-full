<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Workshop Scanner</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <style>
        body { background: #0a0a1a; color: white; min-height: 100vh; }
        #scanner-container { width: 100%; aspect-ratio: 1; max-width: 360px; margin: 0 auto; background: #000; border-radius: 16px; overflow: hidden; }
    </style>
</head>
<body class="font-sans antialiased" x-data="scannerApp()">
    <header class="sticky top-0 z-30 bg-slate-950/85 backdrop-blur border-b border-white/5">
        <div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
                <h1 class="font-extrabold text-base sm:text-lg leading-tight">Workshop Scanner</h1>
                <p class="text-[11px] text-slate-400 leading-tight">
                    Hi, {{ auth()->user()->name ?? 'Staff' }} —
                    scan a student's AIpreneur QR pass to add your shop to their globe.
                </p>
            </div>
            <form method="post" action="{{ route('staff-event.logout') }}">
                @csrf
                <button type="submit" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80">Sign out</button>
            </form>
        </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-6 space-y-5">
        @if ($errors->any())
            <div class="rounded-xl px-4 py-3 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm">
                {{ $errors->first() }}
            </div>
        @endif

        {{-- Shop picker --}}
        <section>
            <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Scanning for</p>
            @if ($shops->isEmpty())
                <p class="text-amber-300 text-sm">No active workshops available for your account.</p>
            @else
                <div class="flex flex-wrap gap-2">
                    @foreach ($shops as $shop)
                        <button
                            type="button"
                            @click="selectedShopId = '{{ $shop->id }}'"
                            :class="selectedShopId === '{{ $shop->id }}'
                                ? 'bg-violet-600 border-violet-500 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                            class="px-3 py-2 rounded-xl text-xs font-bold border transition-colors"
                        >
                            {{ $shop->name }}
                        </button>
                    @endforeach
                </div>
                <template x-for="shop in shops" :key="shop.id">
                    <p x-show="selectedShopId === shop.id" class="text-[11px] text-slate-500 mt-2" x-text="shop.businessNature"></p>
                </template>
            @endif
        </section>

        {{-- Camera --}}
        <section class="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-semibold">Camera</p>
                <template x-if="cameraActive">
                    <button type="button" @click="stopCamera()" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-bold border border-rose-500/30">
                        Stop
                    </button>
                </template>
                <template x-if="!cameraActive">
                    <button type="button" @click="startCamera()" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                        Start camera
                    </button>
                </template>
            </div>

            <div id="scanner-container" class="relative">
                <div x-show="!cameraActive" class="absolute inset-0 flex items-center justify-center px-6 text-center">
                    <p class="text-xs text-slate-400">Tap "Start camera" to begin scanning.</p>
                </div>
            </div>

            <p x-show="cameraError" x-text="cameraError" class="mt-3 text-xs text-rose-300"></p>
            <p x-show="banner" x-text="banner" class="mt-3 text-xs text-amber-300"></p>
        </section>

        {{-- Recent unlocks --}}
        <section x-show="recent.length > 0">
            <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Recent unlocks</p>
            <ul class="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
                <template x-for="entry in recent" :key="entry.id">
                    <li class="px-4 py-2.5 flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-sm font-semibold truncate" x-text="entry.studentName || 'Student'"></p>
                            <p class="text-[11px] text-slate-400 truncate">
                                <span x-text="entry.shopName"></span> · <span x-text="entry.time"></span>
                            </p>
                        </div>
                        <span class="text-emerald-400 text-xs font-bold">✓ unlocked</span>
                    </li>
                </template>
            </ul>
        </section>
    </main>

    {{-- Confirmation modal --}}
    <div x-show="pending" x-transition.opacity class="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-slate-950/85 backdrop-blur" @click="dismissPending()">
        <div @click.stop class="w-full max-w-sm rounded-3xl bg-white text-slate-900 p-6 shadow-2xl">
            <p class="text-[10px] uppercase tracking-widest font-bold text-violet-600">Confirm unlock</p>
            <h2 class="mt-1 text-xl font-extrabold" x-text="pending?.payload?.name || 'Student'"></h2>
            <p class="text-xs text-slate-500 font-mono break-all mt-1" x-text="pending?.payload?.studentId"></p>

            <div class="my-5 rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
                <img :src="selectedShop?.shopImageUrl" alt="" class="w-14 h-14 object-contain">
                <div class="min-w-0">
                    <p class="text-sm font-extrabold" x-text="selectedShop?.name"></p>
                    <p class="text-[11px] text-slate-500" x-text="selectedShop?.companyName"></p>
                </div>
            </div>

            <button type="button" @click="confirmUnlock()" :disabled="confirming" class="w-full min-h-[46px] rounded-2xl bg-violet-600 text-white text-sm font-extrabold shadow-md disabled:opacity-60">
                <span x-text="confirming ? 'Unlocking…' : 'Unlock ' + (selectedShop?.name || '')"></span>
            </button>
        </div>
    </div>

    <script>
        function scannerApp() {
            return {
                shops: @json($shopsForJs),
                selectedShopId: @json(optional($shops->first())->id),
                cameraActive: false,
                cameraError: '',
                banner: '',
                pending: null,
                confirming: false,
                recent: [],
                _scanner: null,
                _lastDecoded: '',

                get selectedShop() {
                    return this.shops.find(s => s.id === this.selectedShopId);
                },

                async startCamera() {
                    this.cameraError = '';
                    this.banner = '';
                    try {
                        if (this._scanner) { try { await this._scanner.stop(); } catch (e) {} this._scanner = null; }
                        const Scanner = window.Html5Qrcode;
                        const scanner = new Scanner('scanner-container');
                        this._scanner = scanner;
                        await scanner.start(
                            { facingMode: 'environment' },
                            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
                            (decoded) => this.handleDecoded(decoded),
                            () => {}
                        );
                        this.cameraActive = true;
                    } catch (e) {
                        console.error(e);
                        this.cameraError = (e && e.message && e.message.includes('Permission'))
                            ? 'Camera permission denied. Allow access and try again.'
                            : 'Could not access the camera.';
                    }
                },
                async stopCamera() {
                    if (this._scanner) { try { await this._scanner.stop(); } catch (e) {} this._scanner = null; }
                    this.cameraActive = false;
                },
                handleDecoded(raw) {
                    if (raw === this._lastDecoded) return;
                    let parsed;
                    try { parsed = JSON.parse(raw); } catch (e) { /* not our QR */ }
                    if (!parsed || parsed.kind !== 'aipreneur-student' || !parsed.studentId) {
                        this.banner = "That QR isn't an AIpreneur student pass.";
                        return;
                    }
                    this._lastDecoded = raw;
                    this.banner = '';
                    this.pending = { payload: parsed };
                },
                dismissPending() {
                    this.pending = null;
                    this._lastDecoded = '';
                },
                async confirmUnlock() {
                    if (!this.pending || !this.selectedShop) return;
                    this.confirming = true;
                    try {
                        const res = await fetch('{{ url('/api/workshop-shops') }}/' + this.selectedShop.id + '/unlock', {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                            },
                            body: JSON.stringify({ studentId: this.pending.payload.studentId }),
                        });
                        if (!res.ok) throw new Error('Unlock failed (' + res.status + ')');
                        const data = await res.json();
                        const now = new Date();
                        this.recent.unshift({
                            id: data.unlock.id,
                            studentName: this.pending.payload.name || 'Student',
                            shopName: this.selectedShop.name,
                            time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                        });
                        if (this.recent.length > 20) this.recent.length = 20;
                        this.banner = '';
                    } catch (e) {
                        console.error(e);
                        this.banner = 'Could not record unlock — try again.';
                    } finally {
                        this.confirming = false;
                        this.pending = null;
                        this._lastDecoded = '';
                    }
                },
            };
        }
    </script>
</body>
</html>
