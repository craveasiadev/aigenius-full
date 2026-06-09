<!doctype html>
<html lang="en" class="h-full bg-slate-50 dark:bg-slate-950">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Superadmin Login | Artventure</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>

<body class="h-full font-sans antialiased text-slate-600 dark:text-slate-400 flex items-center justify-center p-4">
    @if (session('superadmin_login_debug_message'))
    <script>
        window.addEventListener('DOMContentLoaded', function() {
            alert(@json(session('superadmin_login_debug_message')));
        });
    </script>
    @endif

    <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-purple-500/30">
                <span class="text-white font-bold text-[9px] leading-none uppercase tracking-tight text-center px-1">Superadmin</span>
            </div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Super Admin</h1>
            <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm">Sign in to manage the Artventure platform.</p>
        </div>

        <form method="post" action="{{ route('superadmin.login.submit') }}" class="space-y-6">
            @csrf

            @if ($errors->any())
            <div class="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {{ $errors->first() }}
            </div>
            @endif

            <div>
                <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus class="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow outline-none">
            </div>

            <div>
                <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
                <input id="password" type="password" name="password" required class="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow outline-none">
            </div>

            <button type="submit" class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5">
                Sign In to Dashboard
            </button>
        </form>

        <div class="mt-8 text-center">
            <a href="/" class="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Return to Homepage</a>
        </div>
    </div>
</body>

</html>
