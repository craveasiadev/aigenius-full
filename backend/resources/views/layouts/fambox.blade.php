<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>AI Fambox - WonderStar</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">

    <!-- Tailwind CSS (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Outfit', 'ui-sans-serif', 'system-ui'],
                    },
                    colors: {
                        // Inherit standard colors + custom if needed
                    }
                }
            }
        }
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    {{-- @vite(['resources/css/app.css', 'resources/js/app.js']) --}}

    <style>
        body {
            font-family: 'Outfit', sans-serif;
        }

        .glass {
            background: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }

        .glass-dark {
            background: rgba(20, 20, 20, 0.6);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-gradient {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
            transition: all 0.3s ease;
        }

        .btn-gradient:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -10px rgba(168, 85, 247, 0.6);
        }

        .animate-float {
            animation: float 8s ease-in-out infinite;
        }

        .animate-float-delayed {
            animation: float 8s ease-in-out infinite 4s;
        }

        @keyframes float {
            0% {
                transform: translateY(0px);
            }

            50% {
                transform: translateY(-20px);
            }

            100% {
                transform: translateY(0px);
            }
        }
    </style>
</head>

<body class="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen text-slate-800 antialiased selection:bg-purple-500 selection:text-white overflow-x-hidden relative">

    <!-- Lively Background Elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-purple-400/20 rounded-full blur-[100px] animate-float"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-pink-400/20 rounded-full blur-[100px] animate-float-delayed"></div>
        <div class="absolute top-[30%] left-[30%] w-[30vw] h-[30vw] bg-yellow-300/20 rounded-full blur-[80px] animate-pulse"></div>
    </div>

    <div class="relative z-10 w-full min-h-screen flex flex-col">
        <nav class="w-full px-6 py-4 flex justify-between items-center glass sticky top-0 z-50">
            <div class="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600">
                AI Fambox
            </div>
            <div class="text-sm font-semibold text-slate-500">
                Powered by WonderStar
            </div>
        </nav>

        <main class="flex-grow">
            @yield('content')
        </main>

        <footer class="w-full py-6 text-center text-slate-400 text-sm">
            &copy; {{ date('Y') }} WonderStar AI Fambox
        </footer>
    </div>

    @stack('scripts')
</body>

</html>