<?php

namespace App\Jobs;

use App\Models\AIpreneurProduct;
use App\Models\AIpreneurBusiness;
use App\Models\GeniusProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateProductImageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 300;

    protected string $productId;

    public function __construct(string $productId)
    {
        $this->productId = $productId;
    }

    /**
     * Execute the job.
     * Generates product image using gpt-image-1 text-to-image generation.
     */
    public function handle(): void
    {
        Log::info("GenerateProductImageJob: ========== JOB STARTED ==========");
        Log::info("GenerateProductImageJob: Product ID: {$this->productId}");

        $product = AIpreneurProduct::find($this->productId);

        if (!$product) {
            Log::error("GenerateProductImageJob: Product not found for ID {$this->productId}");
            return;
        }

        // Get business for shop context
        $business = AIpreneurBusiness::where('student_id', $product->student_id)->first();
        $answers = $business?->questionnaire_answers ?? [];
        $passion = $answers['passion_category'] ?? 'general';
        $theme = $answers['shop_theme'] ?? 'colorful';
        $profile = GeniusProfile::find($product->student_id);
        $age = $profile?->age;

        try {
            // Build the prompt
            $prompt = $this->buildProductPrompt(
                $product->product_name,
                $product->description,
                $passion,
                $theme,
                $age
            );

            // Store the prompt for reproducibility
            $product->update(['image_prompt' => $prompt]);

            Log::info("GenerateProductImageJob: Generating image with prompt", [
                'product_name' => $product->product_name,
                'passion' => $passion,
            ]);

            // Call OpenAI gpt-image-1
            $response = $this->callGptImage1Generate($prompt);

            if (!$response['success']) {
                throw new \Exception("Image generation failed: " . ($response['error'] ?? 'Unknown error'));
            }

            // Save the image
            $timestamp = time();
            $filename = 'products/' . $this->productId . '_' . $timestamp . '.png';
            Storage::disk('public')->put($filename, $response['image_data']);
            $imageUrl = Storage::disk('public')->url($filename);

            // Update product with image URL
            $product->update([
                'image_url' => $imageUrl,
                'image_source' => 'ai_generated',
                'image_status' => 'completed',
                'image_error' => null,
            ]);

            Log::info("GenerateProductImageJob: ========== JOB COMPLETED ==========", [
                'image_url' => $imageUrl,
            ]);

        } catch (\Exception $e) {
            Log::error("GenerateProductImageJob: ========== JOB FAILED ==========", [
                'error' => $e->getMessage(),
            ]);

            $product->update([
                'image_status' => 'failed',
                'image_error' => $e->getMessage(),
            ]);

            if ($this->attempts() < $this->tries) {
                throw $e;
            }
        }
    }

    /**
     * Build prompt for product image generation.
     */
    protected function buildProductPrompt(string $productName, ?string $description, string $passion, string $theme, ?int $age = null): string
    {
        $passionDescriptions = [
            'ice_cream' => 'ice cream and frozen treats',
            'pets' => 'pet supplies and cute animals',
            'games' => 'gaming and toys',
            'bakery' => 'cakes, pastries, and baked goods',
            'cars' => 'automotive and toy vehicles',
            'drinks' => 'beverages and drinks',
            'art' => 'art supplies and crafts',
            'nature' => 'plants and nature items',
        ];

        $themeDescriptions = [
            'colorful' => 'bright, vibrant colors with rainbow elements',
            'modern' => 'sleek, modern look with clean lines',
            'cozy' => 'warm, natural aesthetic with earthy tones',
            'fancy' => 'elegant, premium look with gold accents',
            'cute' => 'kawaii, soft pastel colors with adorable style',
        ];

        $passionDesc = $passionDescriptions[$passion] ?? 'general retail';
        $themeDesc = $themeDescriptions[$theme] ?? 'colorful and appealing';
        $ageText = $age ? " Make it age-appropriate for a {$age}-year-old kid." : ' Make it kid-friendly and age-appropriate.';

        $descriptionText = $description ? " Description: {$description}." : '';

        return "Create a beautiful product image for a {$passionDesc} shop. "
            . "Product: {$productName}.{$descriptionText} "
            . "Style: 3D cartoon like Pixar/Disney, {$themeDesc}. "
            . $ageText . " "
            . "The product should look appealing and suitable for display on a retail shelf. "
            . "Clean white or gradient background, professional product photography style. "
            . "The product should be centered and well-lit, showing its best features. "
            . "Make it look fun, colorful, and attractive for a young audience. "
            . "High quality, detailed, vibrant colors.";
    }

    /**
     * Call gpt-image-1 for text-to-image generation.
     */
    protected function callGptImage1Generate(string $prompt): array
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            return ['success' => false, 'error' => 'OpenAI API key not configured'];
        }

        try {
            Log::info("GenerateProductImageJob: Calling gpt-image-1 generation API...");

            $response = Http::timeout(180)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post('https://api.openai.com/v1/images/generations', [
                    'model' => 'gpt-image-1',
                    'prompt' => $prompt,
                    'n' => 1,
                    'size' => '1024x1024',
                    'quality' => 'medium',
                ]);

            if ($response->failed()) {
                $errorBody = $response->json();
                $errorMessage = $errorBody['error']['message'] ?? $response->body();
                Log::error("GenerateProductImageJob: API failed", ['error' => $errorMessage]);
                return ['success' => false, 'error' => "OpenAI API Error: {$errorMessage}"];
            }

            $result = $response->json();

            if (isset($result['data'][0]['b64_json'])) {
                return [
                    'success' => true,
                    'image_data' => base64_decode($result['data'][0]['b64_json']),
                ];
            }

            if (isset($result['data'][0]['url'])) {
                $imageData = Http::timeout(60)->get($result['data'][0]['url'])->body();
                return ['success' => true, 'image_data' => $imageData];
            }

            return ['success' => false, 'error' => 'Invalid API response: Missing image data'];
        } catch (\Exception $e) {
            Log::error("GenerateProductImageJob: Exception", ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("GenerateProductImageJob: Final failure for {$this->productId}", [
            'error' => $exception->getMessage(),
        ]);

        $product = AIpreneurProduct::find($this->productId);
        if ($product) {
            $product->update([
                'image_status' => 'failed',
                'image_error' => 'Image generation failed after multiple attempts. Please try again later.',
            ]);
        }
    }
}
