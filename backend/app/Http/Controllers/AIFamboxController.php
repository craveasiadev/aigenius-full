<?php

namespace App\Http\Controllers;

use App\Models\FamboxSession;
use App\Jobs\GenerateAIFamboxJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Arr;

class AIFamboxController extends Controller
{
    const THEMES = [
        'Pixar-like 3D Classroom Pop' => 'glossy bright 3D, colorful classroom background, confetti sparkles, high-key studio light.',
        'DreamWorks-like City Adventure' => 'vibrant 3D, lively street background, punchy colors, sunny cinematic glow.',
        'Disney Storybook Fairytale' => 'painted fairytale village/castle background, radiant warm light, rich saturated pigments.',
        'Anime Cel-Shaded Neon Day' => 'clean cel shading, bright anime city background, saturated palette, glossy highlights.',
        'Chibi Pastel Wonderland' => 'chibi proportions, super cute candy-pastel town background, bright soft lighting, sparkles.',
        'Caricature Magazine Cover' => 'fun caricature look, bold colorful graphic background like a cover layout (no text).',
        'Comic Book Pop Ink' => 'bold outlines + halftone, action-style city background, vibrant primary colors, punchy contrast.',
        'Watercolor Splash Portrait' => 'vivid watercolor washes, paint splashes framing the subject, matching watercolor scene background.',
        'Oil Painting Bright Gallery' => 'luminous oil-paint style, vibrant brush strokes, bright museum/gallery-like background.',
        'Gouache Illustration Cozy Cafe' => 'matte gouache look, warm cheerful cafe background, high saturation, clean shapes.',
        'Colored Pencil Rainbow Sketch' => 'colored pencil texture, bright playful shading, notebook-style illustrated background scene.',
        'Pastel Chalk Mural World' => 'chalk pastel mural texture, joyful playground/city mural background, extra bright tones.',
        'Pop Art Explosion' => 'bold color blocks, comic dots, energetic shapes background, super vibrant poster look (no text).',
        'Retro 90s Cartoon Room' => 'thick outlines, saturated colors, nostalgic cartoon bedroom/classroom background.',
        'Classic Toon TV Show' => 'smooth cel animation style, exaggerated cheerful background set, bright studio lighting.',
        'Kawaii Sticker Pack Style' => 'super clean cute style, sticker-like outlines, adorable themed background with icons.',
        'Studio Ghibli-Inspired Painting' => 'soft painterly look but still vibrant, whimsical town/sky background, warm sunlight glow.',
        'Vaporwave Neon Arcade' => 'bright neon gradients, arcade background, glow bloom, high contrast, happy energetic mood.',
        'Fantasy Book Cover Bright' => 'heroic painterly vibe, magical kingdom background, radiant light beams, saturated colors.',
        'Glass Prism Glow (not stained-glass)' => 'glossy “prismatic glass” illustration style, rainbow light refractions, vibrant abstract background.'
    ];

    public function index()
    {
        return view('aifambox.index');
    }

    public function upload(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // 10MB max
        ]);

        $file = $request->file('image');
        $path = $file->store('originals/fambox', 'public');

        // Pick initial random theme
        $themeKey = array_rand(self::THEMES);
        $themePrompt = $themeKey . ' — ' . self::THEMES[$themeKey];

        $session = FamboxSession::create([
            'original_image_path' => $path,
            'theme' => $themePrompt,
            'status' => 'uploaded'
        ]);

        GenerateAIFamboxJob::dispatch($session);

        return redirect()->route('aifambox.preview', ['session_id' => $session->session_id]);
    }

    public function status($sessionId)
    {
        $session = FamboxSession::where('session_id', $sessionId)->firstOrFail();

        return response()->json([
            'status' => $session->status,
            'generated_image' => $session->generated_image_path ? Storage::url($session->generated_image_path) : null,
            'theme' => $session->theme
        ]);
    }

    public function preview($sessionId)
    {
        $session = FamboxSession::where('session_id', $sessionId)->firstOrFail();
        return view('aifambox.preview', compact('session'));
    }

    public function regenerate($sessionId)
    {
        $session = FamboxSession::where('session_id', $sessionId)->firstOrFail();

        // Pick NEW random theme
        $themeKey = array_rand(self::THEMES);
        $themePrompt = $themeKey . ' — ' . self::THEMES[$themeKey];

        $session->update([
            'theme' => $themePrompt,
            'status' => 'processing',
            'generated_image_path' => null // Clear previous
        ]);

        GenerateAIFamboxJob::dispatch($session);

        return response()->json([
            'success' => true,
            'session_id' => $session->session_id
        ]);
    }
    public function gallery()
    {
        $sessions = FamboxSession::where('status', 'completed')
            ->orderBy('created_at', 'desc')
            ->get();
        return view('aifambox.gallery', compact('sessions'));
    }
}
