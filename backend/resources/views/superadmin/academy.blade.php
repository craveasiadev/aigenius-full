@extends('superadmin.layout')

@section('title', 'Academy')
@section('header', 'Academy Management')

@section('content')
<div x-data="{
    addClassOpen: false,
    editClassOpen: false, editClass: null,
    addSlotOpen: false, slotClassId: null,
    editSlotOpen: false, editSlot: null,
    bookingDetail: false, booking: null, newStatus: '',
    expandedClass: null
}">

<!-- Classes -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Classes</h3>
            <p class="text-sm text-slate-500 mt-1">{{ $classes->count() }} classes total</p>
        </div>
        <button @click="addClassOpen = true" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Class
        </button>
    </div>
    <div class="divide-y divide-slate-100 dark:divide-slate-800">
        @forelse ($classes as $class)
        <div>
            <div class="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                 @click="expandedClass = expandedClass === '{{ $class->id }}' ? null : '{{ $class->id }}'">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div>
                        <p class="font-medium text-slate-900 dark:text-white">{{ $class->title }}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-xs text-slate-500">{{ $class->category }}</span>
                            <span class="text-xs text-slate-400">&middot;</span>
                            <span class="text-xs text-slate-500">{{ $class->level }}</span>
                            <span class="text-xs text-slate-400">&middot;</span>
                            <span class="text-xs text-slate-500">{{ $class->duration_minutes }}min</span>
                            <span class="text-xs text-slate-400">&middot;</span>
                            <span class="text-xs font-mono text-slate-700 dark:text-slate-300">RM {{ number_format($class->price, 2) }}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {{ $class->is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }}">
                        {{ $class->is_active ? 'Active' : 'Inactive' }}
                    </span>
                    <span class="text-xs text-slate-500">{{ $class->slots->count() }} slots</span>
                    <svg class="w-4 h-4 text-slate-400 transition-transform" :class="expandedClass === '{{ $class->id }}' ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                </div>
            </div>
            <!-- Expanded Slots -->
            <div x-show="expandedClass === '{{ $class->id }}'" x-cloak x-transition class="bg-slate-50/50 dark:bg-slate-800/30 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">Time Slots</h4>
                    <div class="flex items-center gap-2">
                        <button @click.stop="slotClassId = '{{ $class->id }}'; addSlotOpen = true" class="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors">Add Slot</button>
                        <button @click.stop="editClass = {
                            id: '{{ $class->id }}',
                            title: '{{ addslashes($class->title) }}',
                            category: '{{ $class->category }}',
                            description: '{{ addslashes($class->description ?? '') }}',
                            level: '{{ $class->level }}',
                            price: {{ $class->price }},
                            duration_minutes: {{ $class->duration_minutes }},
                            is_active: {{ $class->is_active ? 'true' : 'false' }}
                        }; editClassOpen = true" class="text-xs px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors">Edit Class</button>
                        @if ($class->slots->every(fn($s) => $s->bookings->isEmpty()))
                        <form method="post" action="{{ route('superadmin.classes.delete', $class->id) }}" onsubmit="return confirm('Delete this class?')" class="inline-block">
                            @csrf @method('DELETE')
                            <button type="submit" class="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors">Delete</button>
                        </form>
                        @endif
                    </div>
                </div>
                @if ($class->slots->isNotEmpty())
                <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table class="w-full text-xs text-slate-600 dark:text-slate-400">
                        <thead class="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th class="px-4 py-2 text-left">Start</th>
                                <th class="px-4 py-2 text-left">End</th>
                                <th class="px-4 py-2 text-left">Location</th>
                                <th class="px-4 py-2 text-center">Capacity</th>
                                <th class="px-4 py-2 text-center">Booked</th>
                                <th class="px-4 py-2 text-center">Status</th>
                                <th class="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            @foreach ($class->slots as $slot)
                            <tr class="hover:bg-white dark:hover:bg-slate-900/50">
                                <td class="px-4 py-2">{{ $slot->start_time->format('d M Y, h:i A') }}</td>
                                <td class="px-4 py-2">{{ $slot->end_time->format('h:i A') }}</td>
                                <td class="px-4 py-2">{{ $slot->location ?? '-' }}</td>
                                <td class="px-4 py-2 text-center">{{ $slot->capacity }}</td>
                                <td class="px-4 py-2 text-center font-medium {{ $slot->booked_count >= $slot->capacity ? 'text-red-600' : 'text-emerald-600' }}">{{ $slot->booked_count }}</td>
                                <td class="px-4 py-2 text-center">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize {{ $slot->status === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }}">{{ $slot->status }}</span>
                                </td>
                                <td class="px-4 py-2 text-right">
                                    <div class="flex items-center justify-end gap-1">
                                        <button @click.stop="editSlot = {
                                            id: '{{ $slot->id }}',
                                            start_time: '{{ $slot->start_time->format('Y-m-d\TH:i') }}',
                                            end_time: '{{ $slot->end_time->format('Y-m-d\TH:i') }}',
                                            capacity: {{ $slot->capacity }},
                                            location: '{{ addslashes($slot->location ?? '') }}',
                                            status: '{{ $slot->status }}'
                                        }; editSlotOpen = true" class="p-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded transition-colors" title="Edit">
                                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        @if ($slot->bookings->isEmpty())
                                        <form method="post" action="{{ route('superadmin.slots.delete', $slot->id) }}" onsubmit="return confirm('Delete this slot?')" class="inline-block">
                                            @csrf @method('DELETE')
                                            <button type="submit" class="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded transition-colors" title="Delete">
                                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </form>
                                        @endif
                                    </div>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
                @else
                <p class="text-sm text-slate-500 text-center py-4">No slots created yet.</p>
                @endif
            </div>
        </div>
        @empty
        <div class="px-6 py-12 text-center text-slate-500">No classes found.</div>
        @endforelse
    </div>
</div>

<!-- All Bookings -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 class="font-bold text-slate-800 dark:text-white text-lg">All Bookings</h3>
        <p class="text-sm text-slate-500 mt-1">{{ $bookings->total() }} bookings total</p>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                    <th class="px-6 py-4">Order ID</th>
                    <th class="px-6 py-4">Student</th>
                    <th class="px-6 py-4">Class</th>
                    <th class="px-6 py-4">Amount</th>
                    <th class="px-6 py-4">Payment</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4">Date</th>
                    <th class="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($bookings as $b)
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    @click="booking = {
                        order_id: '{{ $b->order_id }}',
                        student: '{{ $b->student?->genius_name ?? '-' }}',
                        parent_name: '{{ $b->parent?->name ?? '-' }}',
                        parent_email: '{{ $b->parent?->email ?? '' }}',
                        class_title: '{{ $b->slot?->course?->title ?? '-' }}',
                        slot_time: '{{ $b->slot ? $b->slot->start_time->format('d M Y, h:i A') : '-' }}',
                        amount: {{ (float) $b->amount }},
                        payment_method: '{{ $b->payment_method ?? '-' }}',
                        payment_status: '{{ $b->payment_status }}',
                        status: '{{ $b->status }}',
                        paid_at: '{{ $b->paid_at ? $b->paid_at->format('d M Y, h:i A') : '-' }}'
                    }; newStatus = '{{ $b->payment_status }}'; bookingDetail = true">
                    <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">{{ $b->order_id }}</td>
                    <td class="px-6 py-4">{{ $b->student?->genius_name ?? '-' }}</td>
                    <td class="px-6 py-4 text-xs">{{ $b->slot?->course?->title ?? '-' }}</td>
                    <td class="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">RM {{ number_format((float) $b->amount, 2) }}</td>
                    <td class="px-6 py-4 text-xs">{{ $b->payment_method ?? '-' }}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize {{ in_array($b->payment_status, ['completed', 'pay_later']) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' }}">
                            {{ str_replace('_', ' ', $b->payment_status) }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-xs text-slate-500">{{ $b->created_at?->format('d M Y') }}</td>
                    <td class="px-6 py-4"><svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></td>
                </tr>
                @empty
                <tr><td colspan="8" class="px-6 py-12 text-center text-slate-500">No bookings found.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="p-4 border-t border-slate-100 dark:border-slate-800">{{ $bookings->links() }}</div>
</div>

<!-- Add Class Modal -->
<div x-show="addClassOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="addClassOpen = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="addClassOpen = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Add New Class</h3>
            <button @click="addClassOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form method="post" action="{{ route('superadmin.classes.store') }}" class="p-6 space-y-4">
            @csrf
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label><input type="text" name="title" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label><input type="text" name="category" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Level</label><select name="level" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
            </div>
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label><textarea name="description" rows="3" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></textarea></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price (RM)</label><input type="number" step="0.01" name="price" value="0" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (min)</label><input type="number" name="duration_minutes" value="60" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            </div>
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cover Image URL</label><input type="url" name="cover_image_url" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            <div class="flex justify-end pt-2"><button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">Create Class</button></div>
        </form>
    </div>
</div>

<!-- Edit Class Modal -->
<div x-show="editClassOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="editClassOpen = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="editClassOpen = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Edit Class</h3>
            <button @click="editClassOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form method="post" :action="'/superadmin/academy/classes/' + editClass?.id" class="p-6 space-y-4">
            @csrf @method('PUT')
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label><input type="text" name="title" :value="editClass?.title" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label><input type="text" name="category" :value="editClass?.category" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Level</label><select name="level" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"><option :selected="editClass?.level === 'Beginner'">Beginner</option><option :selected="editClass?.level === 'Intermediate'">Intermediate</option><option :selected="editClass?.level === 'Advanced'">Advanced</option></select></div>
            </div>
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label><textarea name="description" rows="3" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" x-text="editClass?.description"></textarea></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price (RM)</label><input type="number" step="0.01" name="price" :value="editClass?.price" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (min)</label><input type="number" name="duration_minutes" :value="editClass?.duration_minutes" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            </div>
            <div class="flex items-center gap-2"><input type="checkbox" name="is_active" value="1" :checked="editClass?.is_active" class="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"><label class="text-sm text-slate-700 dark:text-slate-300">Active</label></div>
            <div class="flex justify-end pt-2"><button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">Update Class</button></div>
        </form>
    </div>
</div>

<!-- Add Slot Modal -->
<div x-show="addSlotOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="addSlotOpen = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="addSlotOpen = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Add Time Slot</h3>
            <button @click="addSlotOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form method="post" :action="'/superadmin/academy/classes/' + slotClassId + '/slots'" class="p-6 space-y-4">
            @csrf
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label><input type="datetime-local" name="start_time" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label><input type="datetime-local" name="end_time" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Capacity</label><input type="number" name="capacity" value="20" min="1" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label><input type="text" name="location" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            </div>
            <div class="flex justify-end pt-2"><button type="submit" class="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">Add Slot</button></div>
        </form>
    </div>
</div>

<!-- Edit Slot Modal -->
<div x-show="editSlotOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="editSlotOpen = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="editSlotOpen = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Edit Time Slot</h3>
            <button @click="editSlotOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form method="post" :action="'/superadmin/academy/slots/' + editSlot?.id" class="p-6 space-y-4">
            @csrf @method('PUT')
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label><input type="datetime-local" name="start_time" :value="editSlot?.start_time" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label><input type="datetime-local" name="end_time" :value="editSlot?.end_time" required class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
            <div class="grid grid-cols-3 gap-4">
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Capacity</label><input type="number" name="capacity" :value="editSlot?.capacity" min="1" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label><input type="text" name="location" :value="editSlot?.location" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></div>
                <div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select name="status" x-model="editSlot.status" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"><option value="open">Open</option><option value="full">Full</option><option value="closed">Closed</option></select></div>
            </div>
            <div class="flex justify-end pt-2"><button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">Update Slot</button></div>
        </form>
    </div>
</div>

<!-- Booking Detail Modal -->
<div x-show="bookingDetail" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.escape.window="bookingDetail = false">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="bookingDetail = false"></div>
    <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg" x-transition>
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-800 dark:text-white text-lg">Booking Details</h3>
            <button @click="bookingDetail = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div class="p-6 space-y-4" x-show="booking">
            <div class="grid grid-cols-2 gap-4">
                <div><p class="text-xs text-slate-500 uppercase mb-1">Order ID</p><p class="text-sm font-mono text-slate-900 dark:text-white" x-text="booking?.order_id"></p></div>
                <div><p class="text-xs text-slate-500 uppercase mb-1">Student</p><p class="text-sm text-slate-900 dark:text-white" x-text="booking?.student"></p></div>
                <div><p class="text-xs text-slate-500 uppercase mb-1">Parent</p><p class="text-sm text-slate-900 dark:text-white" x-text="booking?.parent_name"></p><p class="text-xs text-slate-500" x-text="booking?.parent_email"></p></div>
                <div><p class="text-xs text-slate-500 uppercase mb-1">Class</p><p class="text-sm text-slate-900 dark:text-white" x-text="booking?.class_title"></p></div>
                <div><p class="text-xs text-slate-500 uppercase mb-1">Amount</p><p class="text-sm font-mono font-bold text-slate-900 dark:text-white">RM <span x-text="booking ? parseFloat(booking.amount).toFixed(2) : '0.00'"></span></p></div>
                <div><p class="text-xs text-slate-500 uppercase mb-1">Payment</p><p class="text-sm text-slate-900 dark:text-white uppercase" x-text="booking?.payment_method"></p></div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p class="text-xs font-medium text-slate-500 uppercase mb-2">Update Payment Status</p>
                <form method="post" action="{{ route('superadmin.order.status') }}" class="flex items-end gap-3">
                    @csrf @method('PUT')
                    <input type="hidden" name="order_id" :value="booking?.order_id">
                    <input type="hidden" name="source" value="workshop">
                    <div class="flex-1">
                        <select name="status" x-model="newStatus" class="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="pay_later">Pay Later</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button type="submit" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">Update</button>
                </form>
            </div>
        </div>
    </div>
</div>

</div>
@endsection