<?php

namespace App\Jobs;

use App\Models\Storybook;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class GenerateStorybookImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300; // 5 minutes timeout
    public $tries = 2; // Retry once if fails

    protected $storybookId;
    protected $page;
    protected $imagePath;

    public function __construct($storybookId, $page, $imagePath)
    {
        $this->storybookId = $storybookId;
        $this->page = $page;
        $this->imagePath = $imagePath;
    }

    public function handle(): void
    {
        $storybook = Storybook::find($this->storybookId);
        
        if (!$storybook) {
            Log::error("Storybook not found: {$this->storybookId}");
            return;
        }

        $pageContent = $storybook->pages_content["page_{$this->page}"] ?? null;
        
        if (!$pageContent) {
            Log::error("Page content not found for page {$this->page}");
            return;
        }

        try {
            // Get the full path to the uploaded image
            $fullPath = storage_path('app/public/' . $this->imagePath);
            
            if (!file_exists($fullPath)) {
                throw new \Exception("Uploaded image file not found: {$fullPath}");
            }
            
            $prompt = "Transform this into a magical storybook scene for '{$pageContent['title']}'. Show {$storybook->name} (age {$storybook->age}) with their art creation: {$pageContent['art_activity']}. Make it vibrant, whimsical, child-friendly, and inspiring. The child looks proud and happy.";

            // Convert uploaded image to PNG for OpenAI API
            $imageData = file_get_contents($fullPath);
            $image = imagecreatefromstring($imageData);
            
            if ($image === false) {
                throw new \Exception('Failed to read uploaded image');
            }
            
            // Convert to PNG for OpenAI API
            ob_start();
            imagepng($image);
            $pngData = ob_get_clean();
            imagedestroy($image);

            Log::info("Starting image generation for storybook {$this->storybookId}, page {$this->page}");

            // Use gpt-image-1 model for image editing with longer timeout
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
            ])
            ->timeout(180) // 3 minutes timeout
            ->attach('image', $pngData, 'artwork.png')
            ->post('https://api.openai.com/v1/images/edits', [
                'model' => 'gpt-image-1',
                'prompt' => $prompt,
                'size' => '1024x1024',
            ]);

            if ($response->failed()) {
                $errorBody = $response->body();
                $errorJson = json_decode($errorBody, true);
                $errorMessage = $errorJson['error']['message'] ?? $errorBody;
                Log::error("Image generation API failed: {$errorMessage}");
                throw new \Exception("OpenAI API Error: {$errorMessage}");
            }

            $result = $response->json();

            if (!isset($result['data'][0]['b64_json'])) {
                throw new \Exception('Invalid API response: Missing image data.');
            }

            // Convert the response from PNG to WebP for storage
            $generatedImageData = base64_decode($result['data'][0]['b64_json']);
            $generatedImage = imagecreatefromstring($generatedImageData);
            
            if ($generatedImage === false) {
                throw new \Exception('Failed to process generated image');
            }
            
            // Convert to WebP for storage
            ob_start();
            imagewebp($generatedImage, null, 85); // 85 quality
            $webpData = ob_get_clean();
            imagedestroy($generatedImage);
            
            // Save WebP to storage
            $generatedPath = "storybooks/{$this->storybookId}/generated/page_{$this->page}.webp";
            Storage::disk('public')->put($generatedPath, $webpData);
            
            // FIXED: Store only the path, not the full URL
            // Update progress with generated image path (not URL)
            $storybook->updatePageProgress($this->page, [
                'generated_image_path' => $generatedPath, // Store path only
                'image_generation_status' => 'completed'
            ]);

            Log::info("Image generation completed successfully for storybook {$this->storybookId}, page {$this->page}");
            
        } catch (\Exception $e) {
            Log::error("Image generation failed for storybook {$this->storybookId}, page {$this->page}: " . $e->getMessage());
            
            // Mark as failed in progress
            $storybook->updatePageProgress($this->page, [
                'image_generation_status' => 'failed',
                'image_generation_error' => $e->getMessage()
            ]);
            
            throw $e; // Re-throw to trigger retry if within tries limit
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("Image generation job failed permanently for storybook {$this->storybookId}, page {$this->page}: " . $exception->getMessage());
        
        $storybook = Storybook::find($this->storybookId);
        if ($storybook) {
            $storybook->updatePageProgress($this->page, [
                'image_generation_status' => 'failed',
                'image_generation_error' => 'Generation failed after retries'
            ]);
        }
    }
}