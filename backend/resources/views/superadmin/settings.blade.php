@extends('superadmin.layout')

@section('title', 'System Settings')
@section('header', 'Settings')

@section('content')
<!-- Account Settings -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">Account Settings</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your personal details and password.</p>
    </div>
    <form method="post" action="{{ route('superadmin.settings.account') }}" class="p-6">
        @csrf
        @method('PUT')
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                <input type="text" name="name" value="{{ $superadmin->name }}" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input type="email" name="email" value="{{ $superadmin->email }}" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                <input type="password" name="current_password" placeholder="Required to change password" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                <input type="password" name="new_password" placeholder="Leave empty to keep current" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                <input type="password" name="new_password_confirmation" placeholder="Confirm new password" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
            </div>
        </div>
        <div class="flex justify-end mt-6">
            <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5">
                Update Account
            </button>
        </div>
    </form>
</div>

<!-- OpenAI Usage -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">OpenAI API Usage</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor API token consumption and estimated costs.</p>
    </div>
    <div class="p-6">
        <!-- Usage Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Today</p>
                <p class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ number_format($openaiStats['today_calls'] ?? 0) }} calls</p>
                <p class="text-xs text-slate-500 mt-1">{{ number_format($openaiStats['today_tokens'] ?? 0) }} tokens</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">This Month</p>
                <p class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ number_format($openaiStats['month_calls'] ?? 0) }} calls</p>
                <p class="text-xs text-slate-500 mt-1">{{ number_format($openaiStats['month_tokens'] ?? 0) }} tokens</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">All Time</p>
                <p class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ number_format($openaiStats['total_calls'] ?? 0) }} calls</p>
                <p class="text-xs text-slate-500 mt-1">{{ number_format($openaiStats['total_tokens'] ?? 0) }} tokens</p>
            </div>
            <div class="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4">
                <p class="text-xs font-medium text-indigo-500 dark:text-indigo-400 uppercase">Est. Cost</p>
                <p class="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">${{ number_format($openaiStats['total_cost'] ?? 0, 4) }}</p>
                <p class="text-xs text-indigo-500 mt-1">USD total</p>
            </div>
        </div>

        <!-- Usage by Service -->
        @if (!empty($openaiStats['by_service']))
        <div class="mb-6">
            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">By Service</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                @foreach ($openaiStats['by_service'] as $service)
                <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 capitalize">{{ str_replace('_', ' ', $service->service) }}</p>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ number_format($service->count) }}</p>
                    <p class="text-xs text-slate-500">{{ number_format($service->tokens) }} tokens</p>
                </div>
                @endforeach
            </div>
        </div>
        @endif

        <!-- Recent Usage Log -->
        @if (isset($openaiLogs) && $openaiLogs->count())
        <div>
            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Recent Usage</h4>
            <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table class="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                        <tr>
                            <th class="px-4 py-3">Service</th>
                            <th class="px-4 py-3">Model</th>
                            <th class="px-4 py-3">Purpose</th>
                            <th class="px-4 py-3">Tokens</th>
                            <th class="px-4 py-3">Cost</th>
                            <th class="px-4 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        @foreach ($openaiLogs as $log)
                        <tr>
                            <td class="px-4 py-2.5 capitalize">{{ str_replace('_', ' ', $log->service) }}</td>
                            <td class="px-4 py-2.5 font-mono">{{ $log->model }}</td>
                            <td class="px-4 py-2.5 capitalize">{{ str_replace('_', ' ', $log->purpose) }}</td>
                            <td class="px-4 py-2.5 font-mono">{{ number_format($log->total_tokens) }}</td>
                            <td class="px-4 py-2.5 font-mono">${{ number_format($log->estimated_cost_usd, 4) }}</td>
                            <td class="px-4 py-2.5">{{ $log->created_at->format('d M, h:i A') }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
        @else
        <p class="text-sm text-slate-500 text-center py-4">No OpenAI usage recorded yet.</p>
        @endif
    </div>
</div>

<!-- System Configuration -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">System Configuration</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage global system parameters. JSON values must be valid.</p>
        </div>
        <button type="submit" form="settings-form" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save All Changes
        </button>
    </div>

    <form id="settings-form" method="post" action="{{ route('superadmin.settings.update') }}">
        @csrf
        @method('PUT')

        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    <tr>
                        <th class="px-6 py-4 w-1/6">Category</th>
                        <th class="px-6 py-4 w-1/6">Key</th>
                        <th class="px-6 py-4 w-1/6">Type</th>
                        <th class="px-6 py-4 w-1/4">Description</th>
                        <th class="px-6 py-4 w-1/3">Value</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    @forelse ($settings as $config)
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="px-6 py-4 font-medium text-slate-900 dark:text-white capitalize">{{ $config->category }}</td>
                        <td class="px-6 py-4 font-mono text-xs">{{ $config->config_key }}</td>
                        <td class="px-6 py-4">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase border border-slate-200 dark:border-slate-700">
                                {{ $config->data_type }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-xs">{{ $config->description }}</td>
                        <td class="px-6 py-4">
                            @php
                            $current = $config->config_value;
                            $display = is_array($current) ? json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) : $current;
                            @endphp
                            @if ($config->data_type === 'boolean')
                            <select name="settings[{{ $config->config_key }}]" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
                                <option value="1" {{ $display ? 'selected' : '' }}>True</option>
                                <option value="0" {{ !$display ? 'selected' : '' }}>False</option>
                            </select>
                            @elseif ($config->data_type === 'json' || strlen($display) > 50)
                            <textarea rows="4" name="settings[{{ $config->config_key }}]" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">{{ $display }}</textarea>
                            @else
                            <input type="text" name="settings[{{ $config->config_key }}]" value="{{ $display }}" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow">
                            @endif
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center text-slate-500">No system settings found.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="p-4 border-t border-slate-100 dark:border-slate-800">
            {{ $settings->links() }}
        </div>
    </form>
</div>
@endsection