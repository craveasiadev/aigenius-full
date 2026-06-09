<?php

namespace App\Http\Middleware;

use App\Models\GeniusProfile;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateGenius
{
    /**
     * Handle an incoming request.
     *
     * Validates genius profiles using Sanctum tokens.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Token required.',
                'reason' => 'no_token',
            ], 401);
        }

        // Validate Sanctum Token
        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

        if (!$accessToken || !$accessToken->tokenable || !($accessToken->tokenable instanceof GeniusProfile)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired token.',
                'reason' => 'session_replaced',
            ], 401);
        }

        // Update last used timestamp
        $accessToken->forceFill(['last_used_at' => now()])->save();

        $profile = $accessToken->tokenable;

        // Attach access token to profile (important for currentAccessToken() to work)
        if (method_exists($profile, 'withAccessToken')) {
            $profile->withAccessToken($accessToken);
        }

        // Attach profile to request
        $request->merge(['genius_profile' => $profile]);

        // Also set as the authenticated user for the request
        $request->setUserResolver(function () use ($profile) {
            return $profile;
        });

        return $next($request);
    }
}
