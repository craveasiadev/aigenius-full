<?php

namespace App\Jobs;

use App\Models\Chapter;
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

class GenerateCoverImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $chapter;
    public $timeout = 300;
    public $tries = 3;

    public function __construct(Chapter $chapter)
    {
        $this->chapter = $chapter;
    }

    public function handle(OpenAIService $openAIService)
    {
        try {
            $jobId = Str::uuid()->toString();
            
            // Create job record
            $imageJob = ImageGenerationJob::create([
                'job_id' => $jobId,
                'imageable_id' => $this->chapter->id,
                'imageable_type' => Chapter::class,
                'type' => 'cover',
                'prompt' => $this->buildCoverPrompt(),
                'status' => 'processing',
            ]);

            Log::info("Generating cover for chapter {$this->chapter->id}");

            // Generate image with OpenAI
            $imageUrl = $openAIService->generateImage($this->buildCoverPrompt());

            // Download and store the image
            $coverPath = $this->downloadAndStoreImage($imageUrl, 'covers');
            $finalUrl = Storage::url($coverPath);

            // Update chapter
            $this->chapter->update([
                'cover_preview_url' => $finalUrl,
            ]);

            // Update job record
            $imageJob->update([
                'status' => 'completed',
                'result_url' => $finalUrl,
            ]);

            Log::info("Cover generated successfully for chapter {$this->chapter->id}");

        } catch (\Exception $e) {
            Log::error("Cover generation failed for chapter {$this->chapter->id}", [
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

    private function buildCoverPrompt()
    {
        $chapter = $this->chapter->load(['child', 'personalization']);
        $personalization = $chapter->personalization;
        $template = $this->getTemplateConfig($chapter->template_id);

        $prompt = "Create a magical, whimsical book cover illustration for a children's story titled '{$chapter->title}'. ";
        $prompt .= "Theme: {$template['description']}. ";
        $prompt .= "The cover should feature a child character (age {$chapter->child->age}, {$chapter->child->gender}). ";
        
        if ($personalization && isset($personalization->answers)) {
            $answers = $personalization->answers;
            $prompt .= "Story elements: " . json_encode($answers) . ". ";
        }
        
        $prompt .= "Style: vibrant, dreamy, fantasy illustration with soft lighting, age-appropriate for {$chapter->child->age} year old. ";
        $prompt .= "Make it enchanting and inspiring for young readers. No text on the cover.";

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

    private function getTemplateConfig($templateId)
    {
        $templates = config('chapter_templates');
        
        foreach ($templates as $template) {
            if ($template['id'] === $templateId) {
                return $template;
            }
        }
        
        return ['description' => 'An adventure story'];
    }
}