<?php

namespace App\Http\Controllers;

use App\Models\AiSetting;
use App\Models\Profile;
use App\Models\Proposal;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    /**
     * Admin dashboard summary metrics.
     * GET /api/admin/dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        $userCount = User::count();
        $activeUsers = User::where('active', true)->count();
        $aiEnabledUsers = User::where('can_use_ai', true)->count();

        $profilesTotal = Profile::count();
        $proposalsTotal = Proposal::count();
        $tasksTotal = WorkItem::count();

        $recentActivity = DB::table('activities')
            ->leftJoin('users', 'users.id', '=', 'activities.user_id')
            ->select('activities.*', 'users.name as user_name')
            ->latest('activities.created_at')
            ->limit(20)
            ->get();

        $systemHealth = [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'database' => 'connected',
            'storage_writable' => is_writable(storage_path()),
            'server_time' => now()->toIso8601String(),
        ];

        return response()->json([
            'user_count' => $userCount,
            'active_users' => $activeUsers,
            'ai_enabled_users' => $aiEnabledUsers,
            'profiles_total' => $profilesTotal,
            'proposals_total' => $proposalsTotal,
            'tasks_total' => $tasksTotal,
            'recent_activity' => $recentActivity,
            'system_health' => $systemHealth,
        ]);
    }

    /**
     * List all users with filtering.
     * GET /api/admin/users
     */
    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('search')) {
            $s = $request->query('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->query('role'));
        }

        $users = $query->orderByDesc('id')->get()->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'phone' => $u->phone,
            'active' => (bool) $u->active,
            'can_use_ai' => (bool) $u->can_use_ai,
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
        ]);

        return response()->json($users);
    }

    /**
     * Create and invite a new user.
     * POST /api/admin/users
     */
    public function createUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:200|unique:users,email',
            'role' => ['required', Rule::in(['admin', 'manager', 'employee', 'owner', 'staff'])],
            'can_use_ai' => 'nullable|boolean',
            'phone' => 'nullable|string|max:30',
        ]);

        $inviteToken = Str::random(40);
        $randomPassword = Str::random(32);

        $currentUser = auth()->user();
        $bureauId = $currentUser?->bureau_id ?? 1;

        $user = new User();
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->password = Hash::make($randomPassword);
        $user->role = $validated['role'];
        $user->phone = $validated['phone'] ?? null;
        $user->can_use_ai = (bool) ($validated['can_use_ai'] ?? false);
        $user->active = true;
        $user->bureau_id = $bureauId;
        $user->invite_token = $inviteToken;
        $user->save();

        $inviteUrl = url("/invite/{$inviteToken}");

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'can_use_ai' => (bool) $user->can_use_ai,
                'active' => (bool) $user->active,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'invite_token' => $inviteToken,
            'invite_url' => $inviteUrl,
        ], 201);
    }

    /**
     * Update an existing user.
     * PUT /api/admin/users/{user}
     */
    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'email' => ['sometimes', 'required', 'email', 'max:200', Rule::unique('users')->ignore($user->id)],
            'role' => ['sometimes', 'required', Rule::in(['admin', 'manager', 'employee', 'owner', 'staff'])],
            'can_use_ai' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'phone' => 'nullable|string|max:30',
        ]);

        // Guard against last admin demoting or deactivating themselves
        if (
            (isset($validated['role']) && !in_array($validated['role'], ['admin', 'owner'])) ||
            (isset($validated['active']) && !$validated['active'])
        ) {
            $isAdmin = in_array($user->role, ['admin', 'owner']);
            if ($isAdmin) {
                $otherAdmins = User::whereIn('role', ['admin', 'owner'])
                    ->where('active', true)
                    ->where('id', '!=', $user->id)
                    ->count();

                if ($otherAdmins === 0) {
                    abort(422, 'Cannot demote or deactivate the last remaining administrator.');
                }
            }
        }

        $user->fill($validated);
        $user->save();

        if (!$user->active) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'can_use_ai' => (bool) $user->can_use_ai,
            'active' => (bool) $user->active,
            'updated_at' => $user->updated_at?->toIso8601String(),
        ]);
    }

    /**
     * Soft-deactivate a user.
     * DELETE /api/admin/users/{user}
     */
    public function deleteUser(User $user): JsonResponse
    {
        abort_if($user->id === auth()->id(), 422, 'You cannot delete yourself.');

        // Guard last admin
        if (in_array($user->role, ['admin', 'owner'])) {
            $otherAdmins = User::whereIn('role', ['admin', 'owner'])
                ->where('active', true)
                ->where('id', '!=', $user->id)
                ->count();

            if ($otherAdmins === 0) {
                abort(422, 'Cannot delete the last remaining administrator.');
            }
        }

        $user->active = false;
        $user->save();

        DB::table('sessions')->where('user_id', $user->id)->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Reset password directly or issue a reset token.
     * POST /api/admin/users/{user}/reset-password
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
            $user->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();

            return response()->json([
                'ok' => true,
                'message' => 'Password updated successfully.',
            ]);
        }

        // Generate reset/invite token
        $token = Str::random(40);
        $user->invite_token = $token;
        $user->save();

        return response()->json([
            'ok' => true,
            'reset_token' => $token,
            'reset_url' => url("/reset-password/{$token}"),
            'message' => 'Reset link generated successfully.',
        ]);
    }

    /**
     * Get current AI settings.
     * GET /api/admin/ai-settings
     */
    public function aiSettings(Request $request): JsonResponse
    {
        $setting = AiSetting::where('is_active', true)->first() ?: AiSetting::latest('id')->first();

        if (!$setting) {
            return response()->json([
                'configured' => false,
                'setting' => null,
            ]);
        }

        $maskedKey = null;
        if (!empty($setting->api_key)) {
            $len = strlen($setting->api_key);
            $maskedKey = $len > 4 ? str_repeat('*', max(4, $len - 4)) . substr($setting->api_key, -4) : '****';
        }

        return response()->json([
            'configured' => true,
            'setting' => [
                'id' => $setting->id,
                'provider' => $setting->provider,
                'api_key_masked' => $maskedKey,
                'api_url' => $setting->api_url,
                'model' => $setting->model,
                'is_active' => (bool) $setting->is_active,
                'max_tokens' => $setting->max_tokens,
                'temperature' => (float) $setting->temperature,
            ],
        ]);
    }

    /**
     * Update AI settings.
     * PUT /api/admin/ai-settings
     */
    public function updateAiSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => 'required|string|in:openai,anthropic,ollama,custom',
            'api_key' => 'nullable|string',
            'api_url' => 'nullable|string|max:255',
            'model' => 'required|string|max:100',
            'max_tokens' => 'nullable|integer|min:256|max:32768',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'is_active' => 'nullable|boolean',
        ]);

        $setting = AiSetting::where('is_active', true)->first() ?: new AiSetting();

        $setting->provider = $validated['provider'];
        $setting->api_url = $validated['api_url'] ?? null;
        $setting->model = $validated['model'];
        $setting->max_tokens = $validated['max_tokens'] ?? 4096;
        $setting->temperature = (float) ($validated['temperature'] ?? 0.7);
        $setting->is_active = $validated['is_active'] ?? true;

        // If a real new api_key was passed (not masked with asterisks)
        if (!empty($validated['api_key']) && !str_contains($validated['api_key'], '***')) {
            $setting->api_key = $validated['api_key'];
        }

        $setting->save();

        return response()->json([
            'ok' => true,
            'message' => 'AI settings updated successfully.',
            'setting' => [
                'id' => $setting->id,
                'provider' => $setting->provider,
                'model' => $setting->model,
                'is_active' => (bool) $setting->is_active,
            ],
        ]);
    }
}
