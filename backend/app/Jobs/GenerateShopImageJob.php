<?php

namespace App\Jobs;

use App\Models\GeniusProfile;
use App\Models\AIpreneurBusiness;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateShopImageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 600;

    protected string $studentId;

    public function __construct(string $studentId)
    {
        $this->studentId = $studentId;
    }

    /**
     * Execute the job.
     * Generates TWO images using gpt-image-1:
     * 1. Shop with scene (using student's selfie for the kid character)
     * 2. Shop only (same shop extracted from scene, no background, no person)
     * Both have the SAME shop and SAME kid appearance (based on selfie).
     */
    public function handle(): void
    {
        Log::info("GenerateShopImageJob: ========== JOB STARTED (v5 - selfie based, same person) ==========");
        Log::info("GenerateShopImageJob: Student ID: {$this->studentId}");

        $profile = GeniusProfile::find($this->studentId);

        if (!$profile) {
            Log::error("GenerateShopImageJob: Profile not found for student {$this->studentId}");
            return;
        }

        $business = $profile->business;

        if (!$business) {
            Log::error("GenerateShopImageJob: Business not found for student {$this->studentId}");
            return;
        }

        $shopOnlyUrl = null;
        $sceneUrl = null;

        try {
            // Get questionnaire answers
            $answers = $business->questionnaire_answers ?? [];
            $passion = $answers['passion_category'] ?? 'general';
            $theme = $answers['shop_theme'] ?? 'colorful';
            $colors = $answers['color_palette'] ?? ['blue', 'yellow'];
            $shopName = $answers['shop_name'] ?? $profile->aipreneur_shop_name ?? 'My Shop';
            $usp = $answers['unique_selling_point'] ?? 'creativity';

            $colorString = is_array($colors) ? implode(', ', $colors) : $colors;
            $timestamp = time();

            Log::info("GenerateShopImageJob: Starting generation", [
                'passion' => $passion,
                'theme' => $theme,
                'colors' => $colorString,
                'shopName' => $shopName,
                'selfie_url' => $profile->selfie_url,
            ]);

            // ============================================
            // STEP 1: Generate Scene Image (shop + kid from selfie + background)
            // Uses student's selfie so the kid looks like them
            // ============================================
            $scenePrompt = $this->buildScenePrompt($passion, $theme, $colorString, $shopName, $usp);

            Log::info("GenerateShopImageJob: [1/2] Generating scene image...");

            // Get selfie image data
            $selfieData = $this->getSelfieImageData($profile->selfie_url);

            if ($selfieData) {
                // Use selfie as reference - kid will look like the student
                Log::info("GenerateShopImageJob: Using selfie as reference for kid character");
                $sceneResponse = $this->callGptImage1Edit($selfieData, $scenePrompt);
            } else {
                // Fallback: generate without selfie reference
                Log::warning("GenerateShopImageJob: No selfie found, generating generic kid");
                $sceneResponse = $this->callGptImage1Generate($scenePrompt);
            }

            if (!$sceneResponse['success']) {
                throw new \Exception("Scene image failed: " . ($sceneResponse['error'] ?? 'Unknown error'));
            }

            $sceneImageData = $sceneResponse['image_data'];
            $sceneFilename = 'shops/' . $this->studentId . '_scene_' . $timestamp . '.png';
            Storage::disk('public')->put($sceneFilename, $sceneImageData);
            $sceneUrl = Storage::disk('public')->url($sceneFilename);

            Log::info("GenerateShopImageJob: [1/2] Scene image saved", ['url' => $sceneUrl]);

            // ============================================
            // STEP 2: Extract Shop Only from Scene (remove background & person)
            // Uses the generated scene so shop looks exactly the same
            // ============================================
            Log::info("GenerateShopImageJob: [2/2] Extracting shop-only from scene...");

            $shopOnlyPrompt = $this->buildShopOnlyFromScenePrompt($passion, $theme, $colorString, $shopName);

            $shopOnlyResponse = $this->callGptImage1EditTransparent($sceneImageData, $shopOnlyPrompt);

            if (!$shopOnlyResponse['success']) {
                throw new \Exception("Shop-only image failed: " . ($shopOnlyResponse['error'] ?? 'Unknown error'));
            }

            $shopOnlyFilename = 'shops/' . $this->studentId . '_shop_' . $timestamp . '.png';
            Storage::disk('public')->put($shopOnlyFilename, $shopOnlyResponse['image_data']);
            $shopOnlyUrl = Storage::disk('public')->url($shopOnlyFilename);

            Log::info("GenerateShopImageJob: [2/2] Shop-only image saved", ['url' => $shopOnlyUrl]);

            // ============================================
            // Update database with both URLs
            // ============================================
            $business->update([
                'shop_image_url' => $shopOnlyUrl,
                'shop_scene_image_url' => $sceneUrl,
                'shop_image_status' => 'completed',
                'shop_image_error' => null,
            ]);

            Log::info("GenerateShopImageJob: Database updated with both URLs", [
                'shop_image_url' => $shopOnlyUrl,
                'shop_scene_image_url' => $sceneUrl,
            ]);

            $profile->update([
                'aipreneur_onboarding_completed' => true,
                'onboarding_stage' => 'completed',
            ]);

            Log::info("GenerateShopImageJob: ========== JOB COMPLETED SUCCESSFULLY ==========");
        } catch (\Exception $e) {
            Log::error("GenerateShopImageJob: ========== JOB FAILED ==========", [
                'error' => $e->getMessage(),
                'scene_generated' => $sceneUrl !== null,
                'shop_only_generated' => $shopOnlyUrl !== null,
            ]);

            $business->update([
                'shop_image_status' => 'failed',
                'shop_image_error' => $e->getMessage(),
            ]);

            if ($this->attempts() < $this->tries) {
                throw $e;
            }
        }
    }

    /**
     * Get selfie image data from URL or storage.
     */
    protected function getSelfieImageData(?string $selfieUrl): ?string
    {
        if (!$selfieUrl) {
            return null;
        }

        try {
            // Check if it's a local storage URL
            if (str_contains($selfieUrl, '/storage/')) {
                $path = preg_replace('/.*\/storage\//', '', $selfieUrl);
                Log::info("GenerateShopImageJob: Looking for selfie at path: {$path}");
                if (Storage::disk('public')->exists($path)) {
                    return Storage::disk('public')->get($path);
                }
            }

            // Try to fetch from URL
            $response = Http::timeout(30)->get($selfieUrl);
            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Exception $e) {
            Log::warning("GenerateShopImageJob: Could not fetch selfie", [
                'url' => $selfieUrl,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Build prompt for scene image (shop + kid + background).
     * When used with selfie, the kid will look like the student.
     */
    protected function buildScenePrompt(string $passion, string $theme, string $colors, string $shopName, string $usp): string
    {
        $passionDescriptions = [
            'ice_cream' => 'an ice cream and frozen treats shop',
            'pets' => 'a pet shop with cute animals',
            'games' => 'a gaming and toys shop',
            'bakery' => 'a bakery with delicious cakes and pastries',
            'cars' => 'an automotive and toy cars shop',
            'drinks' => 'a beverage and drinks shop',
            'art' => 'an art supplies and crafts shop',
            'nature' => 'a nature and plants shop',
        ];

        $themeDescriptions = [
            'colorful' => 'bright, colorful, and playful with rainbow elements',
            'modern' => 'sleek, modern, and futuristic with clean lines',
            'cozy' => 'warm, cozy, and natural with wooden elements and plants',
            'fancy' => 'elegant, fancy, and sparkly with gold accents',
            'cute' => 'cute, soft, and sweet with pastel colors and round shapes',
        ];

        $passionDesc = $passionDescriptions[$passion] ?? 'a general retail shop';
        $themeDesc = $themeDescriptions[$theme] ?? 'colorful and fun';

        // Prompt that preserves the kid's appearance from the selfie
        return "Use the reference image for identity/likeness and match it strictly: same facial features, face shape, eyes, nose, lips, skin tone, hairstyle, age - do not beautify, do not change ethnicity, do not change facial structure. "
            . "Create a vibrant 3D cartoon scene of {$passionDesc} storefront. "
            . "The person from the reference photo is standing proudly outside as the shop owner. "
            . "The shop exterior should be {$themeDesc}. "
            . "Use these colors prominently: {$colors}. "
            . "The shop has a beautiful large signboard that clearly shows the name '{$shopName}'. "
            . "The person should look happy, confident, and welcoming. "
            . "Style: 3D cartoon animation like Pixar/Disney, bright and cheerful. "
            . "Include a beautiful background scene with sky, clouds, sidewalk, and decorative elements. "
            . "Ultra colorful, cheerful, happy vibe, high saturation, bright lighting. "
            . "Avoid: dull colors, face drift, different person, beautified face, changed ethnicity.";
    }

    /**
     * Build prompt for extracting shop-only from scene image.
     */
    protected function buildShopOnlyFromScenePrompt(string $passion, string $theme, string $colors, string $shopName): string
    {
        $passionDescriptions = [
            'ice_cream' => 'ice cream shop',
            'pets' => 'pet shop',
            'games' => 'gaming shop',
            'bakery' => 'bakery shop',
            'cars' => 'car shop',
            'drinks' => 'drinks shop',
            'art' => 'art shop',
            'nature' => 'nature shop',
        ];

        $passionDesc = $passionDescriptions[$passion] ?? 'shop';

        return "Extract ONLY the {$passionDesc} building from this image. "
            . "Keep the EXACT same shop design, colors, style, and signboard '{$shopName}'. "
            . "REMOVE completely: the person/kid, all people, background sky, clouds, ground, pavement, trees, plants, all environment, shadows. "
            . "OUTPUT: The shop building ONLY, isolated on a COMPLETELY TRANSPARENT background (alpha channel, no color). "
            . "The shop must look EXACTLY the same as in the original - same windows, door, signboard, colors, decorations. "
            . "Create a PNG cutout with transparent background - NOT white, NOT checkered, just pure transparency. "
            . "The building should float with no ground, no shadow, just the building asset ready to be placed on any background.";
    }

    /**
     * Call gpt-image-1 for generation (text-to-image) - fallback when no selfie.
     */
    protected function callGptImage1Generate(string $prompt): array
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            return ['success' => false, 'error' => 'OpenAI API key not configured'];
        }

        try {
            Log::info("GenerateShopImageJob: Calling gpt-image-1 generation API...");

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
                Log::error("GenerateShopImageJob: Generation API failed", ['error' => $errorMessage]);
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
            Log::error("GenerateShopImageJob: Generation exception", ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Call gpt-image-1 for editing (image-to-image).
     * Used both for:
     * 1. Creating scene from selfie (kid looks like student)
     * 2. Extracting shop from scene (same shop design)
     */
    protected function callGptImage1Edit(string $inputImageData, string $prompt): array
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            return ['success' => false, 'error' => 'OpenAI API key not configured'];
        }

        try {
            Log::info("GenerateShopImageJob: Calling gpt-image-1 edit API...");

            // Prepare the image - ensure it's PNG format and proper size
            $pngData = $this->prepareImageForApi($inputImageData);

            // Call OpenAI Edit API
            $response = Http::timeout(180)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                ])
                ->attach('image', $pngData, 'input.png')
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
                Log::error("GenerateShopImageJob: Edit API failed", ['error' => $errorMessage]);
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
            Log::error("GenerateShopImageJob: Edit exception", ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Call gpt-image-1 for editing with TRANSPARENT background.
     * Used specifically for shop-only extraction where we need PNG with alpha channel.
     */
    protected function callGptImage1EditTransparent(string $inputImageData, string $prompt): array
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            return ['success' => false, 'error' => 'OpenAI API key not configured'];
        }

        try {
            Log::info("GenerateShopImageJob: Calling gpt-image-1 edit API with TRANSPARENT background...");

            // Prepare the image - ensure it's PNG format and proper size
            $pngData = $this->prepareImageForApi($inputImageData);

            // Call OpenAI Edit API with transparency parameters
            $response = Http::timeout(180)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                ])
                ->attach('image', $pngData, 'input.png')
                ->post('https://api.openai.com/v1/images/edits', [
                    'model' => 'gpt-image-1',
                    'prompt' => $prompt,
                    'n' => 1,
                    'size' => '1024x1024',
                    'quality' => 'medium',
                    'background' => 'transparent',  // Request transparent background
                    'output_format' => 'png',       // PNG format preserves alpha channel
                ]);

            if ($response->failed()) {
                $errorBody = $response->json();
                $errorMessage = $errorBody['error']['message'] ?? $response->body();
                Log::error("GenerateShopImageJob: Transparent Edit API failed", ['error' => $errorMessage]);
                return ['success' => false, 'error' => "OpenAI API Error: {$errorMessage}"];
            }

            $result = $response->json();

            Log::info("GenerateShopImageJob: Transparent edit response received", [
                'has_b64_json' => isset($result['data'][0]['b64_json']),
                'has_url' => isset($result['data'][0]['url']),
            ]);

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
            Log::error("GenerateShopImageJob: Transparent Edit exception", ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Prepare image for OpenAI API - resize to 1024x1024 square PNG.
     */
    protected function prepareImageForApi(string $imageData): string
    {
        $image = imagecreatefromstring($imageData);
        if ($image === false) {
            throw new \Exception('Failed to read image');
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $targetSize = 1024;

        // Calculate scaling to fit in square
        $ratio = $width / $height;
        if ($ratio > 1) {
            $newWidth = $targetSize;
            $newHeight = (int)($targetSize / $ratio);
        } else {
            $newHeight = $targetSize;
            $newWidth = (int)($targetSize * $ratio);
        }

        // Create canvas with transparency
        $canvas = imagecreatetruecolor($targetSize, $targetSize);
        imagealphablending($canvas, false);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefilledrectangle($canvas, 0, 0, $targetSize, $targetSize, $transparent);
        imagesavealpha($canvas, true);
        imagealphablending($canvas, true);

        // Center the image
        $dstX = (int)(($targetSize - $newWidth) / 2);
        $dstY = (int)(($targetSize - $newHeight) / 2);

        // Resize
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        // Copy to canvas
        imagecopy($canvas, $resized, $dstX, $dstY, 0, 0, $newWidth, $newHeight);

        // Output PNG
        ob_start();
        imagepng($canvas);
        $pngData = ob_get_clean();

        imagedestroy($image);
        imagedestroy($resized);
        imagedestroy($canvas);

        return $pngData;
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("GenerateShopImageJob: Final failure for {$this->studentId}", [
            'error' => $exception->getMessage(),
        ]);

        $business = AIpreneurBusiness::where('student_id', $this->studentId)->first();
        if ($business) {
            $business->update([
                'shop_image_status' => 'failed',
                'shop_image_error' => 'Image generation failed after multiple attempts. Please try again later.',
            ]);
        }
    }
}
