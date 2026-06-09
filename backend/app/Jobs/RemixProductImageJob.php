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

class RemixProductImageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 300;

    protected string $productId;
    protected string $imagePath;
    protected ?string $promptHint;

    public function __construct(string $productId, string $imagePath, ?string $promptHint = null)
    {
        $this->productId = $productId;
        $this->imagePath = $imagePath;
        $this->promptHint = $promptHint;
    }

    public function handle(): void
    {
        Log::info("RemixProductImageJob: ========== JOB STARTED ==========", [
            'product_id' => $this->productId,
        ]);

        $product = AIpreneurProduct::find($this->productId);

        if (!$product) {
            Log::error("RemixProductImageJob: Product not found for ID {$this->productId}");
            $this->cleanupTempFile();
            return;
        }

        $business = AIpreneurBusiness::where('student_id', $product->student_id)->first();
        $answers = $business?->questionnaire_answers ?? [];
        $passion = $answers['passion_category'] ?? 'general';
        $theme = $answers['shop_theme'] ?? 'colorful';
        $profile = GeniusProfile::find($product->student_id);
        $age = $profile?->age;

        try {
            $prompt = $this->buildRemixPrompt(
                $product->product_name,
                $product->description,
                $passion,
                $theme,
                $this->promptHint,
                $age
            );

            $product->update(['image_prompt' => $prompt]);

            $response = $this->callGptImage1Edit($prompt, $this->imagePath);

            if (!$response['success']) {
                throw new \Exception("Image remix failed: " . ($response['error'] ?? 'Unknown error'));
            }

            $timestamp = time();
            $filename = 'products/' . $this->productId . '_remix_' . $timestamp . '.png';
            Storage::disk('public')->put($filename, $response['image_data']);
            $imageUrl = Storage::disk('public')->url($filename);

            $product->update([
                'image_url' => $imageUrl,
                'image_source' => 'ai_remix',
                'image_status' => 'completed',
                'image_error' => null,
            ]);

            Log::info("RemixProductImageJob: ========== JOB COMPLETED ==========", [
                'image_url' => $imageUrl,
            ]);
        } catch (\Exception $e) {
            Log::error("RemixProductImageJob: ========== JOB FAILED ==========", [
                'error' => $e->getMessage(),
            ]);

            $product->update([
                'image_status' => 'failed',
                'image_error' => $e->getMessage(),
            ]);

            if ($this->attempts() < $this->tries) {
                throw $e;
            }
        } finally {
            $this->cleanupTempFile();
        }
    }

    protected function buildRemixPrompt(string $productName, ?string $description, string $passion, string $theme, ?string $hint, ?int $age = null): string
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
        $descriptionText = $description ? " Description: {$description}." : '';
        $hintText = $hint ? " Special request: {$hint}." : '';
        $ageText = $age ? " Make it age-appropriate for a {$age}-year-old kid." : ' Make it kid-friendly and age-appropriate.';

        return "Remix the provided product image for a {$passionDesc} shop. "
            . "Product: {$productName}.{$descriptionText}{$hintText} "
            . "Style: 3D cartoon like Pixar/Disney, {$themeDesc}. "
            . $ageText . " "
            . "Keep the product recognizable, centered, and well-lit. "
            . "Clean white or gradient background, professional product photography style. "
            . "Make it fun, colorful, and attractive for a young audience.";
    }

    protected function callGptImage1Edit(string $prompt, string $imagePath): array
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            return ['success' => false, 'error' => 'OpenAI API key not configured'];
        }

        try {
            if (!file_exists($imagePath)) {
                return ['success' => false, 'error' => 'Input image not found'];
            }

            $response = Http::timeout(180)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                ])
                ->attach('image', file_get_contents($imagePath), 'input.png')
                ->post('https://api.openai.com/v1/images/edits', [
                    'model' => 'gpt-image-1',
                    'prompt' => $prompt,
                    'n' => 1,
                    'size' => '1024x1024',
                    'quality' => 'medium',
                ]);

            if ($response->failed()) {
                $errorBody = $response->json();
                $errorMessage = $errorBody['error']['message'] ?? $response->body();
                Log::error("RemixProductImageJob: API failed", ['error' => $errorMessage]);
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
            Log::error("RemixProductImageJob: Exception", ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function cleanupTempFile(): void
    {
        if (empty($this->imagePath) || !file_exists($this->imagePath)) {
            return;
        }

        $normalized = str_replace('\\', '/', $this->imagePath);
        $isTemp = str_contains($normalized, '/tmp/') || str_contains($normalized, '/storage/app/tmp/');

        if ($isTemp) {
            @unlink($this->imagePath);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("RemixProductImageJob: Final failure for {$this->productId}", [
            'error' => $exception->getMessage(),
        ]);

        $product = AIpreneurProduct::find($this->productId);
        if ($product) {
            $product->update([
                'image_status' => 'failed',
                'image_error' => 'Image remix failed after multiple attempts. Please try again later.',
            ]);
        }

        $this->cleanupTempFile();
    }
}
