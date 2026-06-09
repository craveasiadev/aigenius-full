<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Meet the Future {{ $storybook->name }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
    <div class="container mx-auto px-4 py-8" id="app">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-purple-600 mb-2">Meet the Future {{ $storybook->name }}</h1>
            <p class="text-gray-600">Your Interactive Storybook Adventure</p>
        </div>

        <!-- Page Indicator -->
        <div class="max-w-4xl mx-auto mb-6">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">Page <span id="current-page">1</span> of 10</span>
                <span class="text-sm text-gray-600" id="step-indicator">Story Introduction</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
                <div id="progress-bar" class="bg-purple-600 h-3 rounded-full transition-all duration-300" style="width: 1%"></div>
            </div>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Creating Your Story...</h2>
            <p class="text-gray-600">AI is writing your personalized adventure. This may take a minute.</p>
        </div>

        <!-- Main Content -->
        <div id="main-content" class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 hidden">
            <h2 class="text-3xl font-bold text-purple-600 mb-6 text-center" id="page-title"></h2>

            <!-- Step 1: Text Slide 1 -->
            <div id="step-text1" class="step-section text-center">
                <div class="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-8 mb-6 min-h-[200px] flex items-center justify-center">
                    <p class="text-2xl font-medium text-gray-800 leading-relaxed" id="text1-content"></p>
                </div>
                <button onclick="nextStep()" class="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200">
                    Continue →
                </button>
            </div>

            <!-- Step 2: Text Slide 2 -->
            <div id="step-text2" class="step-section text-center hidden">
                <div class="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-8 mb-6 min-h-[200px] flex items-center justify-center">
                    <p class="text-2xl font-medium text-gray-800 leading-relaxed" id="text2-content"></p>
                </div>
                <button onclick="nextStep()" class="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200">
                    Continue →
                </button>
            </div>

            <!-- Step 3: Text Slide 3 -->
            <div id="step-text3" class="step-section text-center hidden">
                <div class="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-8 mb-6 min-h-[200px] flex items-center justify-center">
                    <p class="text-2xl font-medium text-gray-800 leading-relaxed" id="text3-content"></p>
                </div>
                <button onclick="nextStep()" class="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200">
                    Continue →
                </button>
            </div>

            <!-- Step 4: Art Activity & Upload -->
            <div id="step-upload" class="step-section hidden">
                <div class="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
                    <h3 class="text-2xl font-bold text-yellow-800 mb-4 text-center">🎨 Art Activity Time!</h3>
                    <p class="text-lg text-gray-700 mb-6 text-center" id="art-activity"></p>
                    
                    <div class="mt-6">
                        <label class="block text-center text-sm font-medium text-gray-700 mb-3">Upload a photo of you with your creation!</label>
                        <input type="file" id="image-upload" accept="image/*" 
                               class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer">
                        <div id="image-preview" class="mt-4 hidden">
                            <img src="" alt="Preview" class="max-w-sm rounded-lg shadow-md mx-auto border-4 border-purple-300">
                        </div>
                    </div>
                </div>

                <button id="btn-submit-image" onclick="uploadImage()" class="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200" disabled>
                    Submit Photo & Continue
                </button>
            </div>

            <!-- Step 5: Quiz -->
            <div id="step-quiz" class="step-section hidden">
                <h3 class="text-2xl font-bold text-purple-600 mb-6 text-center">Learning Time! 📚</h3>

                <div class="space-y-6">
                    <!-- Question 1 -->
                    <div class="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                        <p class="mb-2"><span class="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold" id="q1-category"></span></p>
                        <p class="font-bold text-lg text-gray-800 mb-4" id="q1-text"></p>
                        <div class="space-y-3" id="q1-options"></div>
                    </div>

                    <!-- Question 2 -->
                    <div class="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                        <p class="mb-2"><span class="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-semibold" id="q2-category"></span></p>
                        <p class="font-bold text-lg text-gray-800 mb-4" id="q2-text"></p>
                        <div class="space-y-3" id="q2-options"></div>
                    </div>

                    <!-- Question 3 -->
                    <div class="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
                        <p class="mb-2"><span class="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold" id="q3-category"></span></p>
                        <p class="font-bold text-lg text-gray-800 mb-4" id="q3-text"></p>
                        <div class="space-y-3" id="q3-options"></div>
                    </div>
                </div>

                <button id="btn-submit-quiz" onclick="submitQuiz()" class="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200" disabled>
                    Submit Answers
                </button>
            </div>

            <!-- Step 6: Generated Image or Loading -->
            <div id="step-image" class="step-section hidden">
                <!-- Loading State -->
                <div id="image-loading" class="text-center">
                    <div class="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-8 mb-6">
                        <div class="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600 mx-auto mb-4"></div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">Creating Magic... ✨</h3>
                        <p class="text-gray-600">AI is transforming your artwork into a magical storybook scene!</p>
                    </div>
                </div>

                <!-- Generated Image -->
                <div id="image-result" class="hidden text-center">
                    <div class="mb-6">
                        <h3 class="text-2xl font-bold text-purple-600 mb-4">Your Magical Creation! ✨</h3>
                        <img id="generated-image" src="" alt="Generated Story Scene" class="max-w-2xl mx-auto rounded-lg shadow-xl border-4 border-purple-300">
                    </div>

                    <div class="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 mb-6">
                        <p class="text-lg text-gray-800 leading-relaxed" id="text4-content"></p>
                    </div>

                    <button id="btn-next-page" onclick="nextPage()" class="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200">
                        Next Page →
                    </button>
                    <button id="btn-finish" onclick="finishStory()" class="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200 hidden">
                        Finish Story 🎉
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const storybookId = {{ $storybook->id }};
        let currentPage = {{ $storybook->current_page }};
        let currentStepIndex = 0; // 0: text1, 1: text2, 2: text3, 3: upload, 4: quiz, 5: image
        let pagesContent = null;
        let currentPageData = null;
        let selectedAnswers = [null, null, null];

        const stepNames = ['text1', 'text2', 'text3', 'upload', 'quiz', 'image'];
        const stepLabels = ['Story Introduction', 'Story Continues', 'Story Builds', 'Art Activity', 'Learning Time', 'Story Conclusion'];

        // FIXED: Helper function to convert storage path to URL
        function storageUrl(path) {
            if (!path) return null;
            // Remove 'public/' prefix if exists and prepend with correct base URL
            const cleanPath = path.replace(/^public\//, '');
            return '{{ url("storage") }}/' + cleanPath;
        }

        // Check generation status
        function checkGeneration() {
            fetch(`/storybook/${storybookId}/check-generation`)
                .then(res => res.json())
                .then(data => {
                    if (data.content_ready) {
                        pagesContent = data.pages_content;
                        document.getElementById('loading-state').classList.add('hidden');
                        document.getElementById('main-content').classList.remove('hidden');
                        loadPage(currentPage);
                    } else {
                        setTimeout(checkGeneration, 3000);
                    }
                });
        }

        // Load page content
        function loadPage(page) {
            currentPageData = pagesContent[`page_${page}`];
            if (!currentPageData) return;

            currentStepIndex = 0;
            
            // Update page title and number
            document.getElementById('page-title').textContent = currentPageData.title;
            document.getElementById('current-page').textContent = page;

            // Load text content
            document.getElementById('text1-content').textContent = currentPageData.text1;
            document.getElementById('text2-content').textContent = currentPageData.text2;
            document.getElementById('text3-content').textContent = currentPageData.text3;
            document.getElementById('art-activity').textContent = currentPageData.art_activity;
            document.getElementById('text4-content').textContent = currentPageData.text4;

            // Load quiz
            loadQuiz(currentPageData);

            // Reset state
            selectedAnswers = [null, null, null];
            document.getElementById('image-upload').value = '';
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('btn-submit-image').disabled = true;

            showStep(0);
            updateProgress();
        }

        // Show specific step
        function showStep(index) {
            currentStepIndex = index;
            
            // Hide all steps
            document.querySelectorAll('.step-section').forEach(el => el.classList.add('hidden'));
            
            // Show current step
            document.getElementById(`step-${stepNames[index]}`).classList.remove('hidden');
            
            // Update step indicator
            document.getElementById('step-indicator').textContent = stepLabels[index];
            
            updateProgress();
        }

        // Next step function
        function nextStep() {
            if (currentStepIndex < 5) {
                showStep(currentStepIndex + 1);
            }
        }

        // Handle image upload preview
        document.getElementById('image-upload').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('image-preview');
                    preview.querySelector('img').src = e.target.result;
                    preview.classList.remove('hidden');
                    document.getElementById('btn-submit-image').disabled = false;
                };
                reader.readAsDataURL(file);
            }
        });

        // Upload image function
        function uploadImage() {
            const formData = new FormData();
            formData.append('image', document.getElementById('image-upload').files[0]);
            formData.append('page', currentPage);

            const btn = document.getElementById('btn-submit-image');
            btn.disabled = true;
            btn.textContent = 'Uploading...';

            fetch(`/storybook/${storybookId}/upload-image`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Immediately move to quiz - don't wait for image generation
                    nextStep(); // Move to quiz
                }
            })
            .catch(error => {
                console.error('Upload failed:', error);
                btn.disabled = false;
                btn.textContent = 'Submit Photo & Continue';
                alert('Upload failed. Please try again.');
            });
        }

        // Load quiz
        function loadQuiz(pageData) {
            const questions = [pageData.question1, pageData.question2, pageData.question3];

            questions.forEach((q, qIndex) => {
                document.getElementById(`q${qIndex + 1}-category`).textContent = q.category;
                document.getElementById(`q${qIndex + 1}-text`).textContent = q.question;
                
                const optionsDiv = document.getElementById(`q${qIndex + 1}-options`);
                optionsDiv.innerHTML = '';
                
                q.options.forEach((option, optIndex) => {
                    const optionLetter = String.fromCharCode(65 + optIndex);
                    const label = document.createElement('label');
                    label.className = 'flex items-center p-4 bg-white rounded-lg cursor-pointer hover:bg-gray-50 border-2 border-transparent transition duration-200';
                    label.innerHTML = `
                        <input type="radio" name="question${qIndex + 1}" value="${optionLetter}" class="mr-3 w-5 h-5">
                        <span class="font-bold text-purple-600 mr-2">${optionLetter}.</span>
                        <span class="text-gray-800">${option}</span>
                    `;
                    optionsDiv.appendChild(label);

                    label.querySelector('input').addEventListener('change', function() {
                        selectedAnswers[qIndex] = this.value;
                        
                        // Visual feedback
                        optionsDiv.querySelectorAll('label').forEach(l => {
                            l.classList.remove('border-purple-500', 'bg-purple-50');
                        });
                        label.classList.add('border-purple-500', 'bg-purple-50');
                        
                        checkQuizComplete();
                    });
                });
            });
        }

        // Check if quiz is complete
        function checkQuizComplete() {
            const complete = selectedAnswers.every(a => a !== null);
            document.getElementById('btn-submit-quiz').disabled = !complete;
        }

        // Submit quiz
        function submitQuiz() {
            const btn = document.getElementById('btn-submit-quiz');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            fetch(`/storybook/${storybookId}/submit-quiz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({
                    page: currentPage,
                    answers: selectedAnswers
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    nextStep(); // Move to image step
                    checkImageGeneration(); // Start checking for generated image
                }
            });
        }

        // FIXED: Check if image is generated
        function checkImageGeneration() {
            const checkInterval = setInterval(() => {
                fetch(`/storybook/${storybookId}/check-image?page=${currentPage}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'completed' && data.image_path) {
                            clearInterval(checkInterval);
                            
                            // Hide loading, show result
                            document.getElementById('image-loading').classList.add('hidden');
                            document.getElementById('image-result').classList.remove('hidden');
                            
                            // FIXED: Convert path to URL using helper function
                            document.getElementById('generated-image').src = storageUrl(data.image_path);

                            // Show appropriate button
                            if (currentPage === 10) {
                                document.getElementById('btn-next-page').classList.add('hidden');
                                document.getElementById('btn-finish').classList.remove('hidden');
                            }
                        } else if (data.status === 'failed') {
                            clearInterval(checkInterval);
                            
                            // Show error message
                            document.getElementById('image-loading').innerHTML = `
                                <div class="bg-red-100 border-2 border-red-300 rounded-lg p-8 mb-6">
                                    <h3 class="text-2xl font-bold text-red-800 mb-2">Oops! 😕</h3>
                                    <p class="text-red-700 mb-4">We couldn't generate your magical image. But your story continues!</p>
                                    <button onclick="skipToNextPage()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                                        Continue Story →
                                    </button>
                                </div>
                            `;
                        }
                        // If status is 'generating', keep checking
                    })
                    .catch(error => {
                        console.error('Check failed:', error);
                    });
            }, 3000); // Check every 3 seconds
        }

        // Next page
        function nextPage() {
            if (currentPage < 10) {
                currentPage++;
                loadPage(currentPage);
            }
        }

        // Skip to next page (when image generation fails)
        function skipToNextPage() {
            if (currentPage < 10) {
                currentPage++;
                loadPage(currentPage);
            } else {
                finishStory();
            }
        }

        // Finish story
        function finishStory() {
            alert('🎉 Congratulations! You completed your amazing storybook adventure!');
            window.location.href = '/';
        }

        // Update progress bar
        function updateProgress() {
            const totalSteps = 60; // 10 pages × 6 steps each
            const completedSteps = (currentPage - 1) * 6 + currentStepIndex;
            const percentage = (completedSteps / totalSteps) * 100;
            document.getElementById('progress-bar').style.width = Math.max(1, percentage) + '%';
        }

        // Start
        checkGeneration();
    </script>
</body>
</html>