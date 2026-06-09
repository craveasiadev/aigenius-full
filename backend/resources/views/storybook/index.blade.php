<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Your Storybook</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-100 to-blue-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <h1 class="text-4xl font-bold text-center mb-2 text-purple-600">Create Your Storybook Adventure</h1>
            <p class="text-center text-gray-600 mb-8">Tell us about yourself and we'll create a personalized story just for you!</p>

            @if ($errors->any())
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form action="{{ route('storybook.store') }}" method="POST" class="space-y-6">
                @csrf

                <div>
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                    <input type="text" id="name" name="name" required 
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="Enter your name" value="{{ old('name') }}">
                </div>

                <div>
                    <label for="age" class="block text-sm font-medium text-gray-700 mb-2">Your Age</label>
                    <input type="number" id="age" name="age" required min="5" max="17"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="5-17 years" value="{{ old('age') }}">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <div class="flex gap-4">
                        <label class="flex items-center">
                            <input type="radio" name="gender" value="male" required class="mr-2" {{ old('gender') == 'male' ? 'checked' : '' }}>
                            <span>Male</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="gender" value="female" required class="mr-2" {{ old('gender') == 'female' ? 'checked' : '' }}>
                            <span>Female</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="gender" value="other" required class="mr-2" {{ old('gender') == 'other' ? 'checked' : '' }}>
                            <span>Other</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label for="ambition" class="block text-sm font-medium text-gray-700 mb-2">What do you want to be when you grow up?</label>
                    <input type="text" id="ambition" name="ambition" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="e.g., Astronaut, Doctor, Artist" value="{{ old('ambition') }}">
                </div>

                <div>
                    <label for="interest" class="block text-sm font-medium text-gray-700 mb-2">What do you like? (hobbies, interests)</label>
                    <textarea id="interest" name="interest" required rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="e.g., Gaming, Travelling, Reading, Sports">{{ old('interest') }}</textarea>
                </div>

                <button type="submit" 
                        class="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200">
                    Generate My Storybook
                </button>
            </form>
        </div>
    </div>
</body>
</html>