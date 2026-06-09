<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AIpreneurPricingService;
use Illuminate\Http\JsonResponse;

class AIpreneurPricingController extends Controller
{
    public function catalog(AIpreneurPricingService $pricingService): JsonResponse
    {
        return response()->json([
            'success' => true,
            ...$pricingService->getPricingCatalog(),
        ]);
    }
}
