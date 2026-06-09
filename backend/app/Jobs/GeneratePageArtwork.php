<?php

namespace App\Jobs;

use App\Models\Page;
use App\Models\ImageGenerationJob;
use App\Services\OpenAIService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GeneratePageArtwork implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $page;
    protected $userArtworkUrl;
    public $timeout = 300;
    public $tries = 3;

    public function __construct(Page $page, $userArtworkUrl)
    {
        $this->page = $page;
        $this->userArtworkUrl = $userArtworkUrl;
    }

    public function handle(OpenAIService $openAIService)
    {
        try {
            $jobId = Str::uuid()->toString();
            
            // Create job record
            $imageJob = ImageGenerationJob::create([
                'job_id' => $jobId,
                'imageable_id' => $this->page->id,
                'imageable_type' => Page::class,
                'type' => 'artwork',
                'prompt' => $this->buildArtworkPrompt(),
                'status' => 'processing',
            ]);

            Log::info("Generating artwork for page {$this->page->id}");

            // Generate image with OpenAI
            $imageUrl = $openAIService->generateImage($this->buildArtworkPrompt());

            // Download and store the image
            $artworkPath = $this->downloadAndStoreImage($imageUrl, 'artworks');
            $finalUrl = Storage::url($artworkPath);

            // Update page
            $this->page->update([
                'artwork_url' => $finalUrl,
            ]);

            // Update job record
            $imageJob->update([
                'status' => 'completed',
                'result_url' => $finalUrl,
            ]);

            Log::info("Artwork generated successfully for page {$this->page->id}");

        } catch (\Exception $e) {
            Log::error("Artwork generation failed for page {$this->page->id}", [
                'error' => $e->getMessage()
            ]);

            if (isset($imageJob)) {
                $imageJob->update([
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ]);
            }

            throw $e;
        }
    }

    private function buildArtworkPrompt()
    {
        $chapter = $this->page->chapter->load(['child', 'personalization']);
        $personalization = $chapter->personalization;

        $prompt = "Create a children's book illustration for this scene: {$this->page->narrative}. ";
        $prompt .= "Enhance the uploaded artwork/photo to fit this narrative. ";
        $prompt .= "Style: whimsical, colorful, magical realism suitable for age {$chapter->child->age}. ";
        
        if ($personalization && isset($personalization->answers)) {
            $answers = $personalization->answers;
            $prompt .= "Story themes: " . json_encode($answers) . ". ";
        }
        
        $prompt .= "Make it engaging and age-appropriate. Focus on: {$this->page->artwork_prompt}";

        return $prompt;
    }

    private function downloadAndStoreImage($url, $folder)
    {
        try {
            $contents = file_get_contents($url);
            $filename = Str::uuid() . '.png';
            $path = "$folder/$filename";
            
            Storage::disk('public')->put($path, $contents);
            
            Log::info("Image stored successfully", ['path' => $path]);
            
            return $path;
        } catch (\Exception $e) {
            Log::error("Failed to download/store image", [
                'url' => $url,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
}