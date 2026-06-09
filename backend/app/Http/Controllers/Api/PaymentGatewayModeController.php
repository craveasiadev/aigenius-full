<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentGatewayModeService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentGatewayModeController extends Controller
{
    public function __construct(private readonly PaymentGatewayModeService $modeService)
    {
    }

    public function show(Request $request)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $mode = $this->modeService->getMode();

        return response()->json([
            'success' => true,
            'mode' => $mode,
            'provider' => $mode === PaymentGatewayModeService::MODE_SANDBOX ? 'toyyibpay' : 'fiuu',
            'allowed_modes' => $this->modeService->allowedModes(),
        ]);
    }

    public function update(Request $request)
    {
        $user = $this->ensureMaster($request);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'mode' => ['required', 'string', Rule::in($this->modeService->allowedModes())],
        ]);

        $mode = $this->modeService->setMode($validated['mode'], $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Payment gateway mode updated.',
            'mode' => $mode,
            'provider' => $mode === PaymentGatewayModeService::MODE_SANDBOX ? 'toyyibpay' : 'fiuu',
        ]);
    }

    private function ensureMaster(Request $request)
    {
        $user = $request->user();

        return ($user && $user->role === 'master') ? $user : null;
    }
}

