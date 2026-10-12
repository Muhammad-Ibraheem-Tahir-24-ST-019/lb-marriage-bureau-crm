<?php

namespace App\Http\Middleware;

use App\Models\Bureau;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CrmAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user && $user->active, 401, 'Please sign in again.');

        // For single-agent LB Marriage Bureau CRM, auto-assign bureau_id 1 if missing
        if (! $user->bureau_id) {
            $user->bureau_id = 1;
            $user->saveQuietly();
        }

        // Lenient check: ensure bureau is not explicitly suspended if checked
        if ($user->bureau_id && ! in_array($user->role, ['admin', 'superadmin', 'owner'], true)) {
            $isSuspended = Bureau::whereKey($user->bureau_id)->where('status', 'suspended')->exists();
            abort_if($isSuspended, 403, 'This bureau is suspended.');
        }

        return $next($request);
    }
}
