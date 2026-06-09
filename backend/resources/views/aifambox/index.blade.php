@extends('layouts.fambox')

@section('content')
<div class="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[80vh]">
    <div class="text-center max-w-2xl mb-12 animate-fade-in-up">
        <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
            Magical Family <br>
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">Portraits in Seconds</span>
        </h1>
        <p class="text-xl text-slate-600 mb-8">
            Snap a photo and let our AI transform it into a whimsical masterpiece inspired by your favorite animated worlds.
        </p>

        <form action="{{ route('aifambox.upload') }}" method="POST" enctype="multipart/form-data" id="uploadForm" class="w-full max-w-md mx-auto">
            @csrf

            <!-- Hidden File Input -->
            <input type="file" name="image" id="imageInput" accept="image/*" class="hidden" required onchange="handleFileSelect(event)">

            <!-- Selection State -->
            <div id="selectionState" class="flex flex-col gap-4">
                <button type="button" onclick="openCamera()" class="group relative w-full overflow-hidden rounded-3xl bg-white p-6 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl border-2 border-indigo-100 hover:border-indigo-500">
                    <div class="flex items-center gap-6">
                        <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-8 w-8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                            </svg>
                        </div>
                        <div class="text-left">
                            <h3 class="text-xl font-bold text-slate-800">Snap Photo</h3>
                            <p class="text-sm text-slate-500">Take a new photo with camera</p>
                        </div>
                    </div>
                </button>

                <button type="button" onclick="triggerFileUpload()" class="group relative w-full overflow-hidden rounded-3xl bg-white p-6 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl border-2 border-dashed border-slate-200 hover:border-slate-400">
                    <div class="flex items-center gap-6">
                        <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-8 w-8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <div class="text-left">
                            <h3 class="text-xl font-bold text-slate-800">Upload File</h3>
                            <p class="text-sm text-slate-500">Choose from gallery or files</p>
                        </div>
                    </div>
                </button>
            </div>

            <!-- Preview State -->
            <div id="previewState" class="hidden">
                <div class="relative group cursor-pointer transition-all duration-300 transform hover:scale-105">
                    <div class="glass rounded-3xl p-2 border-2 border-purple-300 group-hover:border-purple-500 transition-colors flex flex-col items-center justify-center min-h-[300px] shadow-xl bg-white">
                        <div class="w-full h-full relative rounded-2xl overflow-hidden bg-black/5">
                            <img id="imagePreview" class="w-full h-full object-cover" />
                            <!-- Retake Overlay -->
                            <button type="button" onclick="resetSelection()" class="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/70 transition-all z-10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <button type="submit" id="submitBtn" class="mt-8 w-full py-4 text-xl font-bold text-white rounded-2xl btn-gradient shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]">
                    Generate Magic ✨
                </button>
            </div>
        </form>
    </div>

    <!-- Theme Ticker / Marquee -->
    <div class="w-full overflow-hidden whitespace-nowrap opacity-60 mt-12">
        <div class="inline-block animate-marquee">
            @foreach(App\Http\Controllers\AIFamboxController::THEMES as $name => $desc)
            <span class="inline-block px-4 py-2 mx-2 bg-white/40 rounded-full text-xs font-semibold text-indigo-900 border border-white/50 backdrop-blur-sm">{{ $name }}</span>
            @endforeach
            @foreach(App\Http\Controllers\AIFamboxController::THEMES as $name => $desc)
            <span class="inline-block px-4 py-2 mx-2 bg-white/40 rounded-full text-xs font-semibold text-indigo-900 border border-white/50 backdrop-blur-sm">{{ $name }}</span>
            @endforeach
        </div>
    </div>
</div>

<!-- Camera Overlay (Native UI feel) -->
<div id="cameraOverlay" class="fixed inset-0 z-[100] bg-black hidden flex-col">
    <!-- Camera Header -->
    <div class="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button type="button" onclick="closeCamera()" class="p-2 text-white rounded-full bg-black/20 backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <div class="text-white font-semibold tracking-wider">PHOTO</div>
        <div class="w-10"></div> <!-- Spacer for center alignment -->
    </div>

    <!-- Viewfinder -->
    <video id="cameraVideo" autoplay playsinline class="flex-1 w-full h-full object-cover bg-black"></video>
    <canvas id="cameraCanvas" class="hidden"></canvas>

    <!-- Camera Controls -->
    <div class="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 flex justify-between items-center">
        <!-- Gallery/Placeholder (Left) -->
        <button type="button" onclick="triggerFileUploadFromCamera()" class="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
        </button>

        <!-- Shutter Button (Center) -->
        <button type="button" onclick="takePhoto()" class="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm relative transition-transform active:scale-95 group">
            <div class="absolute inset-2 rounded-full bg-white group-active:scale-90 transition-transform"></div>
        </button>

        <!-- Switch Camera (Right) -->
        <button type="button" onclick="switchCamera()" class="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
        </button>
    </div>
</div>

<div id="loadingOverlay" class="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center hidden">
    <div class="w-24 h-24 mb-6 relative">
        <div class="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center text-4xl">✨</div>
    </div>
    <h2 class="text-2xl font-bold text-slate-800 mb-2">Creating Magic...</h2>
    <p class="text-slate-500 animate-pulse">Compressing & Generating</p>
</div>

@push('scripts')
<script>
    // --- State Management ---
    let currentStream = null;
    let facingMode = 'environment'; // Default to rear camera

    // --- Upload Handlers ---
    function triggerFileUpload() {
        document.getElementById('imageInput').click();
    }

    function triggerFileUploadFromCamera() {
        closeCamera();
        triggerFileUpload();
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            displayPreview(file);
        }
    }

    function displayPreview(fileOrBlob) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').src = e.target.result;

            // Switch views
            document.getElementById('selectionState').classList.add('hidden');
            document.getElementById('previewState').classList.remove('hidden');

            // Ensure data is in the input for form submission
            // If it came from camera (Blob), we need to put it into the input
            if (fileOrBlob instanceof Blob && !(fileOrBlob instanceof File)) {
                // Convert Blob to File (optional, but good for details)
                const file = new File([fileOrBlob], "camera-snap.jpg", {
                    type: "image/jpeg"
                });
                placeFileInInput(file);
            } else if (fileOrBlob instanceof File) {
                // If it came from input change, it's already there. 
                // But check if we need to manually set it (e.g. valid file provided from elsewhere)
            }
        }
        reader.readAsDataURL(fileOrBlob);
    }

    function placeFileInInput(file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        document.getElementById('imageInput').files = dataTransfer.files;
    }

    function resetSelection() {
        document.getElementById('imageInput').value = '';
        document.getElementById('selectionState').classList.remove('hidden');
        document.getElementById('previewState').classList.add('hidden');
    }

    // --- Camera Handlers ---
    async function openCamera() {
        document.getElementById('cameraOverlay').classList.remove('hidden');
        document.getElementById('cameraOverlay').classList.add('flex');
        await startCameraStream();
    }

    function closeCamera() {
        stopCameraStream();
        document.getElementById('cameraOverlay').classList.add('hidden');
        document.getElementById('cameraOverlay').classList.remove('flex');
    }

    async function startCameraStream() {
        if (currentStream) {
            stopCameraStream();
        }

        const constraints = {
            video: {
                facingMode: facingMode,
                width: {
                    ideal: 1920
                }, // Try for high res
                height: {
                    ideal: 1080
                }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            currentStream = stream;
            document.getElementById('cameraVideo').srcObject = stream;
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert("Could not access camera. Please ensure permissions are granted.");
            closeCamera();
        }
    }

    function stopCameraStream() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }

    async function switchCamera() {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        await startCameraStream();
    }

    function takePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');

        // Match canvas size to video actual size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        // Flip horizontally if using front camera for natural mirror feel (optional, but standard for selfies)
        // Usually preview is mirrored, capture is not. Let's keep it simple (WYSWYG).
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob(function(blob) {
            if (blob) {
                // If mirrored, we captured mirrored.
                displayPreview(blob);
                closeCamera();
            }
        }, 'image/jpeg', 0.95);
    }

    // Mirror the video preview for user facing camera
    const videoEl = document.getElementById('cameraVideo');
    videoEl.addEventListener('loadedmetadata', () => {
        if (facingMode === 'user') {
            videoEl.style.transform = 'scaleX(-1)';
        } else {
            videoEl.style.transform = 'none';
        }
    });

    // --- Form Handlers ---
    document.getElementById('uploadForm').addEventListener('submit', function() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    });
</script>
<style>
    .animate-marquee {
        animation: marquee 40s linear infinite;
    }

    @keyframes marquee {
        0% {
            transform: translateX(0);
        }

        100% {
            transform: translateX(-50%);
        }
    }

    .btn-gradient {
        background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    }

    .glass {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
    }
</style>
@endpush
@endsection