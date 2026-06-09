<?php

namespace App\Jobs;

use App\Models\AIpreneurMarketingAsset;
use App\Models\GeniusProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GenerateMarketingAssetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 300;

    protected string $assetId;
    protected string $inputImagePath;
    protected ?string $promptHint;

    public function __construct(string $assetId, string $inputImagePath, ?string $promptHint = null)
    {
        $this->assetId = $assetId;
        $this->inputImagePath = $inputImagePath;
        $this->promptHint = $promptHint;
    }

    public function handle(): void
    {
        $shouldCleanup = true;
        $asset = null;

        try {
            Log::info('GenerateMarketingAssetJob: ========== JOB STARTED ==========', [
                'asset_id' => $this->assetId,
            ]);

            $asset = AIpreneurMarketingAsset::find($this->assetId);

            if (!$asset) {
                Log::error('GenerateMarketingAssetJob: Asset not found', [
                    'asset_id' => $this->assetId,
                ]);
                return;
            }

            $profile = GeniusProfile::find($asset->student_id);
            $age = $profile?->age;
            $existingConfig = is_array($asset->asset_config) ? $asset->asset_config : [];
            $hint = $this->promptHint ?? ($existingConfig['prompt_hint'] ?? null);

            $prompt = $this->buildMarketingAssetPrompt($asset->asset_type, $hint, $age);
            $response = $this->callGptImage1Edit($prompt, $this->inputImagePath);

            if (!$response['success']) {
                throw new \Exception($response['error'] ?? 'Image generation failed.');
            }

            Storage::disk('public')->makeDirectory('marketing-assets');
            $filename = $asset->asset_type . '_' . $asset->student_id . '_' . time() . '_' . Str::random(6) . '.png';
            Storage::disk('public')->put('marketing-assets/' . $filename, $response['image_data']);

            $config = is_array($asset->asset_config) ? $asset->asset_config : [];
            $config['prompt_hint'] = $hint;
            $config['generation_status'] = 'completed';
            unset($config['generation_error']);

            $asset->update([
                'asset_url' => url('/storage/marketing-assets/' . $filename),
                'asset_config' => $config,
            ]);

            Log::info('GenerateMarketingAssetJob: ========== JOB COMPLETED ==========', [
                'asset_id' => $this->assetId,
                'filename' => $filename,
            ]);
        } catch (\Exception $e) {
            Log::error('GenerateMarketingAssetJob: ========== JOB FAILED ==========', [
                'asset_id' => $this->assetId,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
                'tries' => $this->tries,
            ]);

            if ($asset) {
                $config = is_array($asset->asset_config) ? $asset->asset_config : [];
                $config['generation_status'] = 'failed';
                $config['generation_error'] = $e->getMessage();
                $asset->update(['asset_config' => $config]);
            }

            if ($this->attempts() < $this->tries) {
                $shouldCleanup = false;
                throw $e;
            }
        } finally {
            if ($shouldCleanup) {
                $this->cleanupTempFile();
            }
        }
    }

    protected function buildMarketingAssetPrompt(string $assetType, ?string $hint, ?int $age = null): string
    {
        $hintText = $hint ? " Special request: {$hint}." : '';
        $ageText = $age ? " Make it age-appropriate for a {$age}-year-old kid." : ' Make it kid-friendly and age-appropriate.';

        $base = 'Remix the provided image into a bright, playful marketing design. '
            . 'Keep the main subject clear and centered. Add clean space for text overlays.'
            . $hintText
            . $ageText . ' ';

        if ($assetType === 'banner') {
            return $base . 'Style: wide website banner, horizontal layout, bold and cheerful, easy to read.';
        }

        if ($assetType === 'billboard') {
            return $base . 'Style: large outdoor billboard, high contrast, simple layout, bold attention-grabbing look.';
        }

        if ($assetType === 'social_post') {
            return $base . 'Style: square social post, vibrant colors, fun stickers or sparkles, short text space.';
        }

        if ($assetType === 'poster') {
            $posterStyles = [
                'Style: retro cinema poster with dramatic lighting and classic movie poster composition.',
                'Style: neon glow poster with electric colors and glowing outlines.',
                'Style: comic book poster with bold outlines and action energy.',
                'Style: watercolor art poster with soft painted textures and dreamy gradients.',
                'Style: kawaii cute poster with rounded shapes and pastel sparkle details.',
                'Style: space galaxy poster with stars, nebula lighting, and epic sci-fi mood.',
                'Style: graffiti street art poster with spray textures and bold urban colors.',
                'Style: pixel art retro game poster with nostalgic arcade style.',
            ];
            $randomStyle = $posterStyles[array_rand($posterStyles)];

            return $base
                . $randomStyle . ' '
                . 'TV-fit requirements: 16:9 horizontal composition, keep important content inside safe margins, '
                . 'high readability from distance, bold headline area, no tiny text, no edge-cropping.';
        }

        return $base . 'Style: flyer, clean layout, friendly icons, short text space for promotions.';
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
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function cleanupTempFile(): void
    {
        if (empty($this->inputImagePath) || !file_exists($this->inputImagePath)) {
            return;
        }

        $normalized = str_replace('\\', '/', $this->inputImagePath);
        $isTemp = str_contains($normalized, '/tmp/');

        if ($isTemp) {
            @unlink($this->inputImagePath);
        }
    }
}
