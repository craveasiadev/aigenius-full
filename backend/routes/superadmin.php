<?php

use App\Http\Controllers\SuperAdmin\SuperAdminController;
use App\Http\Controllers\SuperAdmin\PaymentModeController;
use App\Http\Controllers\SuperAdmin\EventWorkshopController;
use App\Http\Controllers\StaffEventController;
use Illuminate\Support\Facades\Route;

Route::prefix('superadmin')->group(function () {
    Route::get('/login', [SuperAdminController::class, 'showLogin'])->name('superadmin.login');
    Route::post('/login', [SuperAdminController::class, 'login'])->name('superadmin.login.submit');
    Route::post('/logout', [SuperAdminController::class, 'logout'])->name('superadmin.logout');

    Route::middleware('superadmin.session')->group(function () {
        // Dashboard
        Route::get('/', [SuperAdminController::class, 'dashboard'])->name('superadmin.dashboard');

        // Finance
        Route::get('/finance', [SuperAdminController::class, 'finance'])->name('superadmin.finance');
        Route::get('/finance/export', [SuperAdminController::class, 'exportFinance'])->name('superadmin.finance.export');
        Route::put('/finance/status', [SuperAdminController::class, 'updateOrderStatus'])->name('superadmin.order.status');

        // Orders
        Route::get('/orders', [SuperAdminController::class, 'orders'])->name('superadmin.orders');

        // Families
        Route::get('/families', [SuperAdminController::class, 'families'])->name('superadmin.families');

        // Admins
        Route::get('/admins', [SuperAdminController::class, 'admins'])->name('superadmin.admins');
        Route::post('/admins', [SuperAdminController::class, 'storeAdmin'])->name('superadmin.admins.store');
        Route::put('/admins/{adminId}', [SuperAdminController::class, 'updateAdmin'])->name('superadmin.admins.update');
        Route::delete('/admins/{adminId}', [SuperAdminController::class, 'deleteAdmin'])->name('superadmin.admins.delete');

        // Rewards Management
        Route::get('/rewards', [SuperAdminController::class, 'rewards'])->name('superadmin.rewards');
        Route::post('/rewards', [SuperAdminController::class, 'storeRewardItem'])->name('superadmin.rewards.store');
        Route::put('/rewards/{itemId}', [SuperAdminController::class, 'updateRewardItem'])->name('superadmin.rewards.update');
        Route::delete('/rewards/{itemId}', [SuperAdminController::class, 'deleteRewardItem'])->name('superadmin.rewards.delete');
        Route::post('/rewards/upload-image', [SuperAdminController::class, 'uploadRewardImage'])->name('superadmin.rewards.upload-image');

        // AIpreneur Pricing Management
        Route::get('/pricing', [SuperAdminController::class, 'pricing'])->name('superadmin.pricing');
        Route::post('/pricing/packages', [SuperAdminController::class, 'storePricingPackage'])->name('superadmin.pricing.packages.store');
        Route::put('/pricing/packages/{packageId}', [SuperAdminController::class, 'updatePricingPackage'])->name('superadmin.pricing.packages.update');
        Route::delete('/pricing/packages/{packageId}', [SuperAdminController::class, 'deletePricingPackage'])->name('superadmin.pricing.packages.delete');
        Route::post('/pricing/rules', [SuperAdminController::class, 'storePricingRule'])->name('superadmin.pricing.rules.store');
        Route::put('/pricing/rules/{ruleId}', [SuperAdminController::class, 'updatePricingRule'])->name('superadmin.pricing.rules.update');
        Route::delete('/pricing/rules/{ruleId}', [SuperAdminController::class, 'deletePricingRule'])->name('superadmin.pricing.rules.delete');
        Route::put('/pricing/economy', [SuperAdminController::class, 'updatePricingEconomySettings'])->name('superadmin.pricing.economy.update');
        Route::put('/pricing/free-access', [SuperAdminController::class, 'updatePricingFeatureAccess'])->name('superadmin.pricing.free-access.update');
        Route::post('/pricing/preset', [SuperAdminController::class, 'applyPricingPreset'])->name('superadmin.pricing.preset.apply');
        Route::post('/pricing/popularity-ranges', [SuperAdminController::class, 'storePopularityRange'])->name('superadmin.pricing.popularity-ranges.store');
        Route::put('/pricing/popularity-ranges/{rangeId}', [SuperAdminController::class, 'updatePopularityRange'])->name('superadmin.pricing.popularity-ranges.update');
        Route::delete('/pricing/popularity-ranges/{rangeId}', [SuperAdminController::class, 'deletePopularityRange'])->name('superadmin.pricing.popularity-ranges.delete');

        // Settings
        Route::get('/settings', [SuperAdminController::class, 'settings'])->name('superadmin.settings');
        Route::put('/settings', [SuperAdminController::class, 'updateSettings'])->name('superadmin.settings.update');
        Route::put('/settings/account', [SuperAdminController::class, 'updateAccount'])->name('superadmin.settings.account');

        // Academy
        Route::get('/academy', [SuperAdminController::class, 'academy'])->name('superadmin.academy');
        Route::post('/academy/classes', [SuperAdminController::class, 'storeClass'])->name('superadmin.classes.store');
        Route::put('/academy/classes/{classId}', [SuperAdminController::class, 'updateClass'])->name('superadmin.classes.update');
        Route::delete('/academy/classes/{classId}', [SuperAdminController::class, 'deleteClass'])->name('superadmin.classes.delete');
        Route::post('/academy/classes/{classId}/slots', [SuperAdminController::class, 'storeSlot'])->name('superadmin.slots.store');
        Route::put('/academy/slots/{slotId}', [SuperAdminController::class, 'updateSlot'])->name('superadmin.slots.update');
        Route::delete('/academy/slots/{slotId}', [SuperAdminController::class, 'deleteSlot'])->name('superadmin.slots.delete');

        // ── Event Workshops ─────────────────────────────────────
        Route::get   ('/event-workshops',                 [EventWorkshopController::class, 'index'])->name('superadmin.event-workshops.index');
        Route::get   ('/event-workshops/create',          [EventWorkshopController::class, 'create'])->name('superadmin.event-workshops.create');
        Route::post  ('/event-workshops',                 [EventWorkshopController::class, 'store'])->name('superadmin.event-workshops.store');
        Route::get   ('/event-workshops/{id}/edit',       [EventWorkshopController::class, 'edit'])->name('superadmin.event-workshops.edit');
        Route::put   ('/event-workshops/{id}',            [EventWorkshopController::class, 'update'])->name('superadmin.event-workshops.update');
        Route::delete('/event-workshops/{id}',            [EventWorkshopController::class, 'destroy'])->name('superadmin.event-workshops.destroy');
        Route::put   ('/event-workshops/{id}/toggle',     [EventWorkshopController::class, 'toggleActive'])->name('superadmin.event-workshops.toggle');
        Route::get   ('/event-workshops/{id}/scans',      [EventWorkshopController::class, 'scans'])->name('superadmin.event-workshops.scans');
        Route::post  ('/event-workshops/staff',           [EventWorkshopController::class, 'storeStaff'])->name('superadmin.event-workshops.staff.store');
        Route::delete('/event-workshops/staff/{id}',     [EventWorkshopController::class, 'destroyStaff'])->name('superadmin.event-workshops.staff.destroy');
    });
});

// ── Staff Event scanner (separate session) ─────────────────────────
Route::prefix('staff-event')->group(function () {
    Route::get ('/login',  [StaffEventController::class, 'showLogin'])->name('staff-event.login');
    Route::post('/login',  [StaffEventController::class, 'login'])->name('staff-event.login.submit');
    Route::post('/logout', [StaffEventController::class, 'logout'])->name('staff-event.logout');

    Route::middleware('staff_event.session')->group(function () {
        Route::get('/scanner', [StaffEventController::class, 'scanner'])->name('staff-event.scanner');
    });
});

Route::prefix('admin')->middleware('superadmin.session')->group(function () {
    Route::get('/payment/mode', [PaymentModeController::class, 'index'])->name('admin.payment.mode');
    Route::post('/payment/mode', [PaymentModeController::class, 'update'])->name('admin.payment.mode.update');
});
