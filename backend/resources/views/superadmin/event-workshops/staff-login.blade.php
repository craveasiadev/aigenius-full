<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workshop Staff — Sign in</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: linear-gradient(135deg, #1e1b4b 0%, #0a0a1a 100%); }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center px-4 text-white">
    <div class="w-full max-w-sm bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div class="text-center mb-6">
            <div class="inline-flex w-12 h-12 rounded-2xl bg-violet-600 items-center justify-center mb-3">
                <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 5.602a17.075 17.075 0 01-.71 1.18M15 7a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
            </div>
            <h1 class="text-xl font-extrabold">Workshop Scanner</h1>
            <p class="text-xs text-slate-400 mt-1">Sign in with the credentials your event manager gave you.</p>
        </div>

        @if ($errors->any())
            <div class="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs mb-3">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="post" action="{{ route('staff-event.login.submit') }}" class="space-y-3">
            @csrf
            <div>
                <label class="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Email</label>
                <input
                    type="email"
                    name="email"
                    required
                    value="{{ old('email') }}"
                    class="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/50"
                >
            </div>
            <div>
                <label class="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Password</label>
                <input
                    type="password"
                    name="password"
                    required
                    class="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/50"
                >
            </div>
            <button type="submit" class="w-full min-h-[48px] rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-extrabold shadow-md">
                Sign in
            </button>
        </form>
    </div>
</body>
</html>
