<?php

namespace App\Jobs;

use App\Models\FamboxSession;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class GenerateAIFamboxJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;
    public $tries = 2;

    protected $session;

    public function __construct(FamboxSession $session)
    {
        $this->session = $session;
    }

    public function handle()
    {
        try {
            $this->session->update(['status' => 'processing']);

            // Get original image
            if (!$this->session->original_image_path) {
                throw new \Exception("No original image found.");
            }

            $imageContent = Storage::disk('public')->get($this->session->original_image_path);

            // 1. Resize/Compress Logic (PHP GD)
            $image = imagecreatefromstring($imageContent);
            if ($image === false) {
                throw new \Exception('Failed to read image file');
            }

            // Get dimensions
            $width = imagesx($image);
            $height = imagesy($image);

            // OpenAI Edits requires square images < 4MB
            $targetSize = 1024;

            // Calculate new dimensions maintaining aspect ratio
            $ratio = $width / $height;
            if ($ratio > 1) {
                $newWidth = $targetSize;
                $newHeight = $targetSize / $ratio;
            } else {
                $newHeight = $targetSize;
                $newWidth = $targetSize * $ratio;
            }

            // Create circular/square canvas
            $canvas = imagecreatetruecolor($targetSize, $targetSize);

            // Fill with transparency
            imagealphablending($canvas, false);
            $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            imagefilledrectangle($canvas, 0, 0, $targetSize, $targetSize, $transparent);
            imagesavealpha($canvas, true);
            imagealphablending($canvas, true);

            // Create temporary resized image
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagealphablending($resized, false);
            imagesavealpha($resized, true); // preserve alpha of original if any
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

            // Copy resized onto center of canvas
            $dstX = ($targetSize - $newWidth) / 2;
            $dstY = ($targetSize - $newHeight) / 2;

            imagecopy($canvas, $resized, $dstX, $dstY, 0, 0, $newWidth, $newHeight);

            // Save to buffer as PNG
            ob_start();
            imagepng($canvas);
            $pngData = ob_get_clean();

            imagedestroy($image);
            imagedestroy($resized);
            imagedestroy($canvas);

            // 2. Prepare Prompt
            // Header (constant)
            $header = "Use the reference image for identity/likeness and match it strictly: same facial features, face shape, eyes, nose, lips, skin tone, hairstyle, age, pose — do not beautify, do not change ethnicity, do not change facial structure. Only change expression to a natural smile and looking at the camera. Cartoonic 3D / stylized art. Background must match the same theme + art style. Ultra colorful, cheerful, happy vibe, high saturation, bright high-key lighting, strong color contrast, vibrant color bounce, soft glow, crisp details, no dull lighting.";

            // Selected Theme
            $themePrompt = $this->session->theme;
            $negativePrompt = " Avoid: dull colors, low saturation, flat lighting, gloomy, face drift, different person, beautified face, changed ethnicity, altered facial structure, text, watermark, blur, extra fingers, deformed hands.";

            $fullPrompt = $header . " " . $themePrompt . $negativePrompt;

            // 3. Call OpenAI
            $response = Http::timeout(120)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . config('services.openai.api_key'),
                ])
                ->attach('image', $pngData, 'artwork.png')
                ->post('https://api.openai.com/v1/images/edits', [
                    'model' => 'gpt-image-1',
                    'prompt' => $fullPrompt,
                    'n' => 1,
                    'size' => '1024x1024',
                ]);

            if ($response->failed()) {
                $errorBody = $response->body();
                $errorJson = json_decode($errorBody, true);
                $errorMessage = $errorJson['error']['message'] ?? $errorBody;
                throw new \Exception("OpenAI API Error: {$errorMessage}");
            }

            $result = $response->json();

            if (!isset($result['data'][0]['b64_json'])) {
                throw new \Exception('Invalid API response: Missing image data.');
            }

            $generatedImageData = base64_decode($result['data'][0]['b64_json']);

            $filename = 'fambox_gen_' . time() . '_' . uniqid() . '.png';
            $path = 'generated/fambox/' . $filename;
            Storage::disk('public')->put($path, $generatedImageData);

            $this->session->update([
                'generated_image_path' => $path,
                'status' => 'completed'
            ]);
        } catch (\Exception $e) {
            Log::error("Fambox generation failed: " . $e->getMessage());
            $this->session->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);
            throw $e;
        }
    }
}