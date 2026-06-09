<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    protected $apiKey;
    protected $baseUrl = 'https://api.openai.com/v1';

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
        
        if (!$this->apiKey) {
            throw new \Exception('OpenAI API key is not configured');
        }
    }

    public function generateImage($prompt, $size = '1024x1024')
    {
        try {
            Log::info("Generating image with DALL-E", ['prompt' => substr($prompt, 0, 100)]);
            
            $response = Http::timeout(120)->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/images/generations', [
                'model' => 'dall-e-3',
                'prompt' => $prompt,
                'n' => 1,
                'size' => $size,
                'quality' => 'standard',
            ]);

            if ($response->successful()) {
                $imageUrl = $response->json()['data'][0]['url'];
                Log::info("Image generated successfully", ['url' => $imageUrl]);
                return $imageUrl;
            }

            $errorBody = $response->body();
            Log::error("Image generation failed", [
                'status' => $response->status(),
                'body' => $errorBody
            ]);
            
            throw new \Exception('Image generation failed: ' . $errorBody);
        } catch (\Exception $e) {
            Log::error("Image generation exception", ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    // Generate 4 title suggestions based on template and personalization
    public function generateTitles($templateId, $childName, $age, $personalizationAnswers)
    {
        try {

            Log::info($personalizationAnswers);
            Log::info("Generating titles", [
                'template' => $templateId,
                'child' => $childName,
                'age' => $age
            ]);

            $template = $this->getTemplateConfig($templateId);
            
            $systemPrompt = "You are a creative children's book title generator. Create engaging, age-appropriate titles that inspire and excite children.";
            
            $userPrompt = "Generate 4 unique, creative titles for a children's story with these details:\n" .
                          "Template: {$template['title']}\n" .
                          "Theme: {$template['description']}\n" .
                          "Child's name: {$childName}\n" .
                          "Age: {$age}\n" .
                          "Personalization: " . json_encode($personalizationAnswers) . "\n\n" .
                          "Requirements:\n" .
                          "- Each title should be 3-7 words\n" .
                          "- Make them inspiring and age-appropriate\n" .
                          "- Include the child's name in 2 of the titles\n" .
                          "- Make them unique and memorable\n\n" .
                          "Return ONLY a JSON array of 4 title strings. No explanation, no markdown.\n" .
                          "Example: [\"Title One\", \"Title Two\", \"Title Three\", \"Title Four\"]";

            $response = Http::timeout(60)->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/chat/completions', [
                'model' => 'gpt-4',
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.9,
                'max_tokens' => 200,
            ]);

            if ($response->successful()) {
                $content = $response->json()['choices'][0]['message']['content'];
                Log::info("Titles generated", ['content' => $content]);
                
                $content = preg_replace('/```json\s*|\s*```/', '', $content);
                $content = trim($content);
                
                $titles = json_decode($content, true);
                
                if (json_last_error() !== JSON_ERROR_NONE || !is_array($titles) || count($titles) !== 4) {
                    throw new \Exception('Invalid titles format returned');
                }
                
                return $titles;
            }

            throw new \Exception('Title generation failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error("Title generation exception", ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    // Generate story pages based on age-appropriate content
    public function generateStoryPages($templateId, $childName, $age, $ageGroup, $personalizationAnswers)
    {
        try {
            Log::info("Generating story pages", [
                'template' => $templateId,
                'child' => $childName,
                'age' => $age,
                'ageGroup' => $ageGroup
            ]);
            
            $template = $this->getTemplateConfig($templateId);
            $systemPrompt = $this->buildSystemPrompt($ageGroup);
            $userPrompt = $this->buildUserPrompt($template, $childName, $age, $ageGroup, $personalizationAnswers);

            $response = Http::timeout(180)->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/chat/completions', [
                'model' => 'gpt-4',
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.8,
                'max_tokens' => 4000,
            ]);

            if ($response->successful()) {
                $content = $response->json()['choices'][0]['message']['content'];
                Log::info("Story content generated", ['content_length' => strlen($content)]);
                
                return $this->parseStoryPagesJson($content);
            }

            $errorBody = $response->body();
            Log::error("Story generation failed", [
                'status' => $response->status(),
                'body' => $errorBody
            ]);
            
            throw new \Exception('Story generation failed: ' . $errorBody);
        } catch (\Exception $e) {
            Log::error("Story generation exception", ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function buildSystemPrompt($ageGroup)
    {
        $complexityGuide = [
            'early' => 'Use simple sentences (5-10 words). Focus on concrete concepts. Use repetition. Vocabulary level: basic.',
            'middle' => 'Use moderate sentences (10-15 words). Introduce abstract concepts gently. Vocabulary level: intermediate.',
            'teen' => 'Use complex sentences (15-20 words). Explore deeper themes. Vocabulary level: advanced.',
        ];

        $complexity = $complexityGuide[$ageGroup] ?? $complexityGuide['middle'];

        return "You are a creative children's story writer specializing in personalized, educational narratives. " .
               "Create engaging stories that inspire children while teaching valuable life lessons. " .
               "Age-appropriate writing: {$complexity} " .
               "Always respond with valid JSON only, no additional text or markdown. " .
               "Do not include any preamble, explanation, or markdown code blocks. Just pure JSON array.";
    }

    private function buildUserPrompt($template, $childName, $age, $ageGroup, $personalizationAnswers)
    {
        $chapterStructure = $this->getChapterStructure();
        
        $prompt = "Create a personalized story for {$childName} (age {$age}) based on:\n\n";
        $prompt .= "TEMPLATE: {$template['title']}\n";
        $prompt .= "THEME: {$template['description']}\n";
        $prompt .= "SKILLS TO DEVELOP: " . implode(', ', $template['skills']) . "\n\n";
        $prompt .= "PERSONALIZATION ANSWERS:\n";
        
        foreach ($personalizationAnswers as $key => $value) {
            $prompt .= "- {$key}: {$value}\n";
        }
        
        $prompt .= "\n\nSTORY STRUCTURE:\n";
        $prompt .= "Create exactly 10 pages organized into 4 chapters:\n\n";
        
        foreach ($chapterStructure as $chapter) {
            $prompt .= "CHAPTER {$chapter['number']}: {$chapter['title']} ({$chapter['pages']} pages)\n";
            $prompt .= "Focus: {$chapter['focus']}\n\n";
        }
        
        $prompt .= "\nEach page must have:\n";
        $prompt .= "- chapter_number (1-4)\n";
        $prompt .= "- page_number (1-3 within chapter)\n";
        $prompt .= "- title (engaging page title)\n";
        $prompt .= "- narrative (2-4 sentences incorporating {$childName}'s personalization and age-appropriate language)\n";
        $prompt .= "- artwork_prompt (description for what {$childName} should upload/draw)\n";
        $prompt .= "- interaction_type ('mcq', 'text', 'chips', or 'toggle')\n";
        $prompt .= "- interaction_prompt (reflective question for {$childName})\n";
        $prompt .= "- interaction_options (array of 4 options for mcq/chips, 2 for toggle, null for text)\n\n";
        
        $prompt .= "CRITICAL REQUIREMENTS:\n";
        $prompt .= "1. Use {$childName}'s name throughout the story\n";
        $prompt .= "2. Make content appropriate for age {$age} ({$ageGroup} level)\n";
        $prompt .= "3. Connect to their personalization answers\n";
        $prompt .= "4. Create meaningful, relevant artwork prompts\n";
        $prompt .= "5. Ask thought-provoking, age-appropriate questions\n";
        $prompt .= "6. Follow the chapter structure exactly\n\n";
        
        $prompt .= "Return ONLY a JSON array of exactly 10 page objects. NO markdown, NO code blocks, NO explanation.\n";
        $prompt .= "Format: [{\"chapter_number\":1,\"page_number\":1,\"title\":\"...\",\"narrative\":\"...\",\"artwork_prompt\":\"...\",\"interaction_type\":\"mcq\",\"interaction_prompt\":\"...\",\"interaction_options\":[\"A\",\"B\",\"C\",\"D\"]}]";

        return $prompt;
    }

    private function parseStoryPagesJson($content)
    {
        try {
            Log::info("Parsing story JSON", ['raw_content' => substr($content, 0, 200)]);
            
            // Remove markdown code blocks if present
            $content = preg_replace('/```json\s*|\s*```/', '', $content);
            $content = trim($content);

            $decoded = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("JSON decode error", [
                    'error' => json_last_error_msg(),
                    'content' => $content
                ]);
                throw new \Exception('Invalid JSON response from OpenAI: ' . json_last_error_msg());
            }

            if (!is_array($decoded)) {
                throw new \Exception('Expected JSON array, got: ' . gettype($decoded));
            }

            if (count($decoded) !== 10) {
                Log::warning("Expected 10 pages, got " . count($decoded));
            }

            Log::info("Story pages parsed successfully", ['count' => count($decoded)]);

            return $decoded;
        } catch (\Exception $e) {
            Log::error("Failed to parse story JSON", ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function getTemplateConfig($templateId)
    {
        $templates = config('chapter_templates');
        
        foreach ($templates as $template) {
            if ($template['id'] === $templateId) {
                return $template;
            }
        }
        
        throw new \Exception("Template not found: {$templateId}");
    }

    private function getChapterStructure()
    {
        return [
            [
                'number' => 1,
                'title' => 'The Awakening',
                'pages' => 3,
                'focus' => 'Introduction and discovery'
            ],
            [
                'number' => 2,
                'title' => 'The Journey Begins',
                'pages' => 3,
                'focus' => 'Challenges and learning'
            ],
            [
                'number' => 3,
                'title' => 'The Path Forward',
                'pages' => 2,
                'focus' => 'Growth and decisions'
            ],
            [
                'number' => 4,
                'title' => 'The Return',
                'pages' => 2,
                'focus' => 'Reflection and action'
            ],
        ];
    }
}