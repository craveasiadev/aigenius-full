@extends('layouts.fambox')

@section('content')
<div class="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">

    <!-- Processing State -->
    <div id="processingState" class="text-center {{ $session->status === 'completed' ? 'hidden' : '' }}">
        <div class="w-32 h-32 mb-8 relative mx-auto">
            <div class="absolute inset-0 rounded-full border-8 border-indigo-100"></div>
            <div class="absolute inset-0 rounded-full border-8 border-t-indigo-500 animate-spin"></div>
            <div class="absolute inset-0 flex items-center justify-center text-5xl">🎨</div>
        </div>
        <h2 class="text-3xl font-bold text-slate-800 mb-2">Painting your Portrait...</h2>
        <p class="text-slate-500 text-lg animate-pulse" id="statusText">Applying artistic style: <br><span class="font-semibold text-indigo-600">{{ $session->theme }}</span></p>
    </div>

    <!-- Error State -->
    <div id="errorState" class="hidden text-center max-w-md mx-auto">
        <div class="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-12 h-12">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008h-.008v-.008z" />
            </svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Oops! Something went wrong.</h2>
        <p class="text-slate-500 mb-6" id="errorText">We couldn't generate your image.</p>
        <a href="{{ route('aifambox.index') }}" class="inline-block px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition">Try Again</a>
    </div>

    <!-- Result State -->
    <div id="resultState" class="w-full max-w-6xl mx-auto {{ $session->status === 'completed' ? '' : 'hidden' }}">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <!-- Image Side -->
            <div class="relative group">
                <div class="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                <div class="relative glass rounded-3xl p-2 overflow-hidden shadow-2xl h-[500px] w-full select-none"
                    id="previewContainer"
                    onmousedown="startPreviewDrag(event)"
                    ontouchstart="startPreviewDrag(event)">
                    <!-- Original Image (Background) -->
                    <img id="previewOriginal" src="{{ Storage::url($session->original_image_path) }}" class="absolute inset-0 w-full h-full object-cover filter grayscale pointer-events-none">

                    <!-- Generated Image (Overlay) -->
                    <div id="previewOverlay" class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" style="width: 50%;">
                        <img id="generatedImage" src="{{ $session->generated_image_path ? Storage::url($session->generated_image_path) : '' }}" class="absolute inset-0 w-full h-full object-cover pointer-events-none" style="width: 100%; max-width: none;">
                    </div>

                    <!-- Slider Handle -->
                    <div id="previewSliderHandle" class="absolute inset-y-0 bg-white w-1 cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none" style="left: 50%;">
                        <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-center space-x-4">
                    <button onclick="regenerateImage()" class="flex items-center space-x-2 px-6 py-3 bg-white/80 hover:bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 backdrop-blur-sm border border-indigo-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span>Regenerate (Random Style)</span>
                    </button>
                    <!-- Download/Share could go here -->
                </div>

                <p class="mt-4 text-center text-sm text-slate-500 font-medium">
                    Current Style: <span id="currentTheme" class="text-indigo-600">{{ $session->theme }}</span>
                </p>
            </div>

            <!-- Print Options Side -->
            <div class="pl-0 lg:pl-12">
                <h2 class="text-4xl font-extrabold text-slate-800 mb-2">Print Your Memory</h2>
                <p class="text-slate-500 mb-8 text-lg">Select a size for your premium acrylic block print.</p>

                <div class="grid grid-cols-2 gap-4">
                    <!-- Sizes -->
                    <button class="print-option group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left" onclick="selectPrint('4x6')">
                        <div class="text-sm text-slate-400 font-bold mb-1">STANDARD</div>
                        <div class="text-2xl font-bold text-slate-800">4" x 6"</div>
                        <div class="text-indigo-500 font-semibold mt-2 group-hover:text-indigo-600">RM 5</div>
                        <div class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-indigo-500 flex items-center justify-center">
                            <div class="w-3 h-3 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition"></div>
                        </div>
                    </button>
                    <button class="print-option group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left" onclick="selectPrint('6x6')">
                        <div class="text-sm text-slate-400 font-bold mb-1">SMALL</div>
                        <div class="text-2xl font-bold text-slate-800">6" x 6"</div>
                        <div class="text-indigo-500 font-semibold mt-2 group-hover:text-indigo-600">RM 10</div>
                        <div class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-indigo-500 flex items-center justify-center">
                            <div class="w-3 h-3 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition"></div>
                        </div>
                    </button>

                    <button class="print-option group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left" onclick="selectPrint('12x12')">
                        <div class="text-sm text-slate-400 font-bold mb-1">MEDIUM</div>
                        <div class="text-2xl font-bold text-slate-800">12" x 12"</div>
                        <div class="text-indigo-500 font-semibold mt-2 group-hover:text-indigo-600">RM 25</div>
                        <div class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-indigo-500 flex items-center justify-center">
                            <div class="w-3 h-3 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition"></div>
                        </div>
                    </button>

                    <button class="print-option group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left" onclick="selectPrint('18x18')">
                        <div class="text-sm text-slate-400 font-bold mb-1">LARGE</div>
                        <div class="text-2xl font-bold text-slate-800">18" x 18"</div>
                        <div class="text-indigo-500 font-semibold mt-2 group-hover:text-indigo-600">RM 45</div>
                        <div class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-indigo-500 flex items-center justify-center">
                            <div class="w-3 h-3 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition"></div>
                        </div>
                    </button>

                    <button class="print-option group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left" onclick="selectPrint('24x24')">
                        <div class="text-sm text-slate-400 font-bold mb-1">EXTRA LARGE</div>
                        <div class="text-2xl font-bold text-slate-800">24" x 24"</div>
                        <div class="text-indigo-500 font-semibold mt-2 group-hover:text-indigo-600">RM 75</div>
                        <div class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-indigo-500 flex items-center justify-center">
                            <div class="w-3 h-3 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition"></div>
                        </div>
                    </button>
                </div>

                <div class="mt-8">
                    <button onclick="checkoutPrint()" class="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-900 transition flex items-center justify-center space-x-2">
                        <span>Checkout Print</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </button>
                </div>
            </div>



            <!-- Share & QR -->
            <div id="shareSection" class="mt-8 pt-8 border-t border-slate-200 {{ $session->status === 'completed' ? '' : 'hidden' }}">
                <h3 class="text-xl font-bold text-slate-800 mb-4">Share Your Masterpiece</h3>
                <div class="flex gap-4">
                    <button onclick="copyLink()" class="flex-1 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Link
                    </button>
                    <button onclick="toggleQR()" class="flex-1 py-3 bg-pink-50 text-pink-700 font-bold rounded-xl hover:bg-pink-100 transition flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Show QR
                    </button>
                </div>
            </div>

            <!-- QR Modal -->
            <div id="qrModal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/50 backdrop-blur-sm" onclick="toggleQR()">
                <div class="bg-white p-8 rounded-2xl shadow-2xl text-center" onclick="event.stopPropagation()">
                    <h3 class="text-2xl font-bold text-slate-800 mb-4">Scan to View</h3>
                    <div id="qrCodeContainer" class="bg-white p-2 rounded-xl border-4 border-indigo-100 mx-auto w-64 h-64 flex items-center justify-center"></div>
                    <p class="text-slate-500 mt-4 text-sm">Scan this code to view on your device</p>
                    <button onclick="toggleQR()" class="mt-6 px-6 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-semibold">Close</button>
                </div>
            </div>

            <!-- Gallery Link -->
            <div class="mt-4 text-center">
                <a href="{{ route('aifambox.gallery') }}" class="text-indigo-600 hover:text-indigo-800 font-medium underline">View All Portraits (Gallery)</a>
            </div>
        </div>
    </div>

</div>

@push('scripts')
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
    const sessionId = "{{ $session->session_id }}";
    let isProcessing = @json($session -> status !== 'completed' && $session -> status !== 'failed');

    if (isProcessing) {
        startPolling();
    }

    function startPolling() {
        if (window.pollInterval) clearInterval(window.pollInterval);

        window.pollInterval = setInterval(() => {
            fetch(`{{ route('aifambox.status', 'SESSION_ID') }}`.replace('SESSION_ID', sessionId))
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'completed') {
                        clearInterval(window.pollInterval);
                        document.getElementById('processingState').classList.add('hidden');
                        document.getElementById('resultState').classList.remove('hidden');
                        document.getElementById('generatedImage').src = data.generated_image;
                        document.getElementById('currentTheme').innerText = data.theme;
                    } else if (data.status === 'failed') {
                        clearInterval(window.pollInterval);
                        document.getElementById('processingState').classList.add('hidden');
                        document.getElementById('errorState').classList.remove('hidden');
                    }
                })
                .catch(err => console.error(err));
        }, 2000);
    }

    function regenerateImage() {
        document.getElementById('resultState').classList.add('hidden');
        document.getElementById('processingState').classList.remove('hidden');

        fetch(`{{ route('aifambox.regenerate', 'SESSION_ID') }}`.replace('SESSION_ID', sessionId), {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        }).then(() => {
            startPolling();
        });
    }

    let selectedSize = null;

    window.selectPrint = function(size) {
        selectedSize = size;

        // Visual selection logic
        document.querySelectorAll('.print-option').forEach(el => {
            el.classList.remove('ring-4', 'ring-indigo-300', 'border-indigo-500');
            el.querySelector('.absolute .w-3').classList.remove('opacity-100');
            el.querySelector('.absolute .w-3').classList.add('opacity-0');
        });

        // Event target might be a child, find the button
        const btn = event.currentTarget.closest('button');
        if (btn) {
            btn.classList.add('ring-4', 'ring-indigo-300', 'border-indigo-500');
            btn.querySelector('.absolute .w-3').classList.remove('opacity-0');
            btn.querySelector('.absolute .w-3').classList.add('opacity-100');
        }

        console.log('Selected size:', size);
    }

    window.checkoutPrint = async function() {
        if (!selectedSize) {
            alert('Please select a print size first!');
            return;
        }

        if (typeof window.jspdf === 'undefined') {
            alert('PDF Library not loaded. Please refresh.');
            return;
        }

        const {
            jsPDF
        } = window.jspdf;
        const img = document.getElementById('generatedImage');

        // Map sizes to mm (1 inch = 25.4mm)
        const sizes = {
            '4x6': [101.6, 152.4],
            '6x6': 152.4,
            '12x12': 304.8,
            '18x18': 457.2,
            '24x24': 609.6
        };

        let dim = sizes[selectedSize];
        let format = Array.isArray(dim) ? dim : [dim, dim]; // Support array (strip) or single (square)

        // Create PDF with custom size
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: format
        });

        const frameWidth = Array.isArray(dim) ? dim[0] : dim;
        const frameHeight = Array.isArray(dim) ? dim[1] : dim;

        try {
            if (selectedSize === '4x6') {
                // --- Modern Frame Design for 4x6 ---

                // 1. Background Color (Soft Modern Slate/Indigo Tint)
                doc.setFillColor(248, 250, 252); // Slate-50 background
                doc.rect(0, 0, frameWidth, frameHeight, 'F');

                // 2. Layout Calculations
                const padding = 3; // 12mm side padding
                const imgWidth = frameWidth - (padding * 2);
                const imgHeight = imgWidth; // Square
                const x = padding;
                const y = 3; // Top margin

                // 3. White Matting/Border Effect (Optional, adds depth)
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(x - 1, y - 1, imgWidth + 2, imgHeight + 2, 1, 1, 'F');

                // 4. Add Image (Square, Top)
                doc.addImage(img, 'PNG', x, y, imgWidth, imgHeight);

                // 5. Watermark (Bottom Area)
                const textCenterY = y + imgHeight + ((frameHeight - (y + imgHeight)) / 2);

                // Main Watermark
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.setTextColor(71, 85, 105); // Slate-600
                const text = "AI FAMBOX";
                const textX = (frameWidth - doc.getTextWidth(text)) / 2;
                doc.text(text, textX, textCenterY);

                // Subtitle / Brand Accent
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); // Slate-400
                const subText = "MEMORIES REIMAGINED";
                const subTextX = (frameWidth - doc.getTextWidth(subText)) / 2;
                doc.text(subText, subTextX, textCenterY + 5);

            } else {
                // Default: Full Bleed for other sizes
                doc.addImage(img, 'PNG', 0, 0, frameWidth, frameHeight);
            }

            doc.save(`fambox_print_${selectedSize}.pdf`);
        } catch (e) {
            console.error(e);
            alert('Error creating PDF. Ensure image is fully loaded.');
        }
    }

    // Share Functions
    window.copyLink = function() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }

    window.toggleQR = function() {
        const modal = document.getElementById('qrModal');
        const container = document.getElementById('qrCodeContainer');

        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            // Generate QR if empty
            if (container.innerHTML === '') {
                new QRCode(container, {
                    text: window.location.href,
                    width: 200,
                    height: 200
                });
            }
        } else {
            modal.classList.add('hidden');
        }
    }

    // Drag Slider Logic
    let isDraggingPreview = false;

    function startPreviewDrag(e) {
        isDraggingPreview = true;
        updatePreviewSlider(e); // Update immediately on click
    }

    window.addEventListener('mouseup', () => {
        isDraggingPreview = false;
    });
    window.addEventListener('touchend', () => {
        isDraggingPreview = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingPreview) return;
        updatePreviewSlider(e);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDraggingPreview) return;
        updatePreviewSlider(e);
    }, {
        passive: false
    });

    window.updatePreviewSlider = function(e) {
        const containerIndex = document.getElementById('previewContainer');
        if (!containerIndex) return;

        const container = containerIndex.getBoundingClientRect();
        // Use clientX from touch or mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        // Check if inside bounds primarily (improves UX) or clamp
        let x = clientX - container.left;

        // Clamp
        if (x < 0) x = 0;
        if (x > container.width) x = container.width;

        const percentage = (x / container.width) * 100;

        document.getElementById('previewOverlay').style.width = `${percentage}%`;
        document.getElementById('previewSliderHandle').style.left = `${percentage}%`;
    }
</script>
@endpush
@endsection