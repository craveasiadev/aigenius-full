@extends('layouts.fambox')

@section('content')
<div class="container mx-auto px-4 py-8 min-h-screen">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
            Fambox Gallery
        </h1>
        <a href="{{ route('aifambox.index') }}" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold shadow-lg">
            + New Portrait
        </a>
    </div>

    @if($sessions->isEmpty())
    <div class="text-center py-20">
        <div class="text-6xl mb-4">🖼️</div>
        <h2 class="text-2xl font-bold text-slate-700">No portraits yet!</h2>
        <p class="text-slate-500 mb-6">Create your first AI masterpiece today.</p>
    </div>
    @else
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        @foreach($sessions as $session)
        <div onclick="openModal('{{ $session->session_id }}', '{{ Storage::url($session->original_image_path) }}', '{{ Storage::url($session->generated_image_path) }}', '{{ $session->theme }}')"
            class="cursor-pointer group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
            <img src="{{ Storage::url($session->generated_image_path) }}" alt="Generated Portrait" class="w-full h-80 object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-6">
                <p class="text-white font-bold text-lg">{{ $session->theme }}</p>
                <p class="text-indigo-200 text-sm">{{ $session->created_at->format('M d, Y') }}</p>
            </div>
        </div>
        @endforeach
    </div>
    @endif
</div>

<!-- Modal -->
<div id="galleryModal" class="fixed inset-0 z-50 hidden overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        <!-- Backdrop -->
        <div class="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" onclick="closeModal()"></div>

        <!-- Content -->
        <div class="relative inline-block w-full max-w-4xl p-6 overflow-hidden text-left align-bottom transition-all transform bg-white shadow-2xl rounded-2xl sm:my-8 sm:align-middle glass">

            <div class="absolute top-4 right-4 cursor-pointer z-10 p-2 bg-white/50 rounded-full hover:bg-white" onclick="closeModal()">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>

            <h3 class="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span id="modalTheme">Theme Name</span>
                <a id="modalLink" href="#" class="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition">View Details</a>
            </h3>

            <!-- Comparison View -->
            <div class="relative w-full aspect-square md:aspect-video rounded-xl overflow-hidden mb-6 bg-slate-100 group select-none"
                id="modalSliderContainer"
                onmousedown="startModalDrag(event)"
                ontouchstart="startModalDrag(event)">
                <img id="modalOriginal" src="" class="absolute inset-0 w-full h-full object-contain pointer-events-none" style="filter: grayscale(100%);">

                <!-- Overlay Wrapper (Clipped) -->
                <div id="modalOverlay" class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" style="width: 50%;">
                    <img id="modalGenerated" src="" class="absolute inset-0 w-full h-full object-contain pointer-events-none" style="width: 100%; max-width: none;">
                </div>
                <!-- Slider Handle -->
                <div id="sliderHandle" class="absolute inset-y-0 bg-white w-1 cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none" style="left: 50%;">
                    <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="absolute bottom-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none">ORIGINAL</div>
            <div class="absolute bottom-4 right-4 bg-indigo-600/80 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none">AI GENERATED</div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button onclick="printImage('modalOriginal')" class="px-6 py-3 bg-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-300 transition flex items-center gap-2 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Original
            </button>
            <button onclick="printImage('modalGenerated')" class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition flex items-center gap-2 justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print AI Art
            </button>
        </div>

    </div>
</div>
</div>

@push('scripts')
<script>
    function openModal(id, originalUrl, generatedUrl, theme) {
        document.getElementById('modalTheme').innerText = theme;
        document.getElementById('modalOriginal').src = originalUrl;
        document.getElementById('modalGenerated').src = generatedUrl;
        document.getElementById('modalLink').href = `/aifambox/preview/${id}`;

        // Reset slider
        document.getElementById('modalOverlay').style.width = '50%';
        document.getElementById('sliderHandle').style.left = '50%';

        // Show modal
        document.getElementById('galleryModal').classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('galleryModal').classList.add('hidden');
    }

    // Close on escape
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape") {
            closeModal();
        }
    });

    function updateSlider(e) {
        const containerIndex = document.getElementById('modalSliderContainer');
        if (!containerIndex) return;

        const container = containerIndex.getBoundingClientRect();
        // Use clientX from touch or mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        let x = clientX - container.left;

        // Clamp
        if (x < 0) x = 0;
        if (x > container.width) x = container.width;

        const percentage = (x / container.width) * 100;

        document.getElementById('modalOverlay').style.width = `${percentage}%`;
        document.getElementById('sliderHandle').style.left = `${percentage}%`;
    }

    // Drag Logic for Modal
    let isDraggingModal = false;

    function startModalDrag(e) {
        isDraggingModal = true;
        updateSlider(e);
    }

    window.addEventListener('mouseup', () => {
        isDraggingModal = false;
    });
    window.addEventListener('touchend', () => {
        isDraggingModal = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingModal) return;
        updateSlider(e);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDraggingModal) return;
        updateSlider(e);
    }, {
        passive: false
    });

    // Reuse print logic - simplified for gallery (opens browser print for image)
    function printImage(elementId) {
        const src = document.getElementById(elementId).src;
        const win = window.open('');
        win.document.write(`<img src="${src}" style="width:100%; max-width:800px; margin:auto; display:block;" onload="window.print();window.close()" />`);
        win.document.close();
    }
</script>
@endpush
@endsection