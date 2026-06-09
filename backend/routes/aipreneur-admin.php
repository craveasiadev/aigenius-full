<?php

use App\Http\Controllers\Api\AIpreneurAdminController;
use App\Http\Controllers\Api\PaymentGatewayModeController;
use Illuminate\Support\Facades\Route;

Route::prefix('aipreneur/admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard', [AIpreneurAdminController::class, 'getDashboardOverview']);
    Route::get('/members', [AIpreneurAdminController::class, 'getMembers']);
    Route::get('/academy', [AIpreneurAdminController::class, 'getAcademyOverview']);
    Route::post('/classes', [AIpreneurAdminController::class, 'createClass']);
    Route::put('/classes/{classId}', [AIpreneurAdminController::class, 'updateClass']);
    Route::delete('/classes/{classId}', [AIpreneurAdminController::class, 'deleteClass']);
    Route::post('/classes/{classId}/slots', [AIpreneurAdminController::class, 'createSlot']);
    Route::put('/slots/{slotId}', [AIpreneurAdminController::class, 'updateSlot']);
    Route::delete('/slots/{slotId}', [AIpreneurAdminController::class, 'deleteSlot']);
    Route::post('/bookings/lookup', [AIpreneurAdminController::class, 'lookupBooking']);
    Route::post('/bookings/check-in', [AIpreneurAdminController::class, 'checkInBooking']);
    Route::get('/payment-gateway/mode', [PaymentGatewayModeController::class, 'show']);
    Route::put('/payment-gateway/mode', [PaymentGatewayModeController::class, 'update']);
    Route::post('/payment-gateway/mode', [PaymentGatewayModeController::class, 'update']);
});
