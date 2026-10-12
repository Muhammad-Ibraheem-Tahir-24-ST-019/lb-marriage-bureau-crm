<?php

namespace App\Http\Middleware;

use App\Models\Bureau;
use Closure;
use Illuminate\Http\Request;

class CrmAccess
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user() && $request->user()->active, 401, 'Please sign in again.');
        if ($request->user()->role !== 'superadmin') {
            abort_unless(Bureau::whereKey($request->user()->bureau_id)->where('status', 'active')->exists(), 403, 'This bureau is suspended.');
        }

        return $next($request);
    }
}
