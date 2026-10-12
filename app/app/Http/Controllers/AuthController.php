<?php

namespace App\Http\Controllers;

use App\Models\Bureau;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function forgot(Request $r)
    {
        $v = $r->validate(['email' => 'required|email|max:200']);
        try {
            PasswordBroker::sendResetLink($v);
        } catch (\Throwable $e) {
            report($e);
            abort(503, 'Email delivery is unavailable. Please contact your bureau administrator.');
        }

        return ['message' => 'If this account exists, a password reset link has been sent.'];
    }

    public function reset(Request $r)
    {
        $v = $r->validate(['token' => 'required|string', 'email' => 'required|email', 'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()]]);
        $status = PasswordBroker::reset($v, function (User $u, string $password) {
            $u->password = Hash::make($password);
            $u->setRememberToken(Str::random(60));
            $u->save();
            DB::table('sessions')->where('user_id', $u->id)->delete();
        });
        abort_unless($status === PasswordBroker::PasswordReset, 422, 'This password reset link is invalid or expired. Request a new link.');

        return ['ok' => true];
    }

    public function login(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        abort_unless(Auth::attempt([...$data, 'active' => true]), 422, 'The email or password is incorrect.');
        $r->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();
        $user->last_login_at = now();
        $user->save();

        $token = method_exists($user, 'createToken') ? $user->createToken('auth-token')->plainTextToken : null;

        return response()->json([
            'ok' => true,
            'user' => $user->only(['id', 'name', 'email', 'role', 'can_use_ai']),
            'token' => $token,
        ]);
    }

    public function register(Request $r)
    {
        $v = $r->validate(['name' => 'required|string|max:100', 'bureau' => 'required|string|max:100', 'email' => 'required|email|max:200|unique:users', 'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()]]);
        $u = DB::transaction(function () use ($v) {
            $b = Bureau::create(['name' => $v['bureau'], 'slug' => Str::slug($v['bureau']).'-'.Str::lower(Str::random(6)), 'settings' => ['accent' => '#0F766E', 'network' => false]]);
            $u = new User;
            $u->name = $v['name'];
            $u->email = $v['email'];
            $u->password = Hash::make($v['password']);
            $u->bureau_id = $b->id;
            $u->role = 'owner';
            $u->last_login_at = now();
            $u->save();

            return $u;
        });
        Auth::login($u);
        $r->session()->regenerate();

        $token = method_exists($u, 'createToken') ? $u->createToken('auth-token')->plainTextToken : null;

        return response()->json([
            'ok' => true,
            'user' => $u->only(['id', 'name', 'email', 'role', 'can_use_ai']),
            'token' => $token,
        ]);
    }

    public function logout(Request $r)
    {
        if ($user = Auth::user()) {
            if (method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }
        }

        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function acceptInvite(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'name' => 'required|string|max:100',
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = User::where('invite_token', $validated['token'])->first();
        abort_unless($user, 404, 'This invitation link is invalid or has expired.');

        $user->name = $validated['name'];
        $user->password = Hash::make($validated['password']);
        $user->invite_token = null;
        $user->email_verified_at = now();
        $user->last_login_at = now();
        $user->active = true;
        $user->save();

        Auth::login($user);
        $request->session()->regenerate();

        $token = method_exists($user, 'createToken') ? $user->createToken('auth-token')->plainTextToken : null;

        return response()->json([
            'ok' => true,
            'user' => $user->only(['id', 'name', 'email', 'role', 'can_use_ai']),
            'token' => $token,
        ]);
    }

    public function accept(Request $r, string $token)
    {
        $v = $r->validate(['name' => 'required|string|max:100', 'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()]]);
        $u = DB::transaction(function () use ($token, $v) {
            $i = DB::table('staff_invites')->where('token_hash', hash('sha256', $token))->whereNull('accepted_at')->where('expires_at', '>', now())->lockForUpdate()->first();
            abort_unless($i, 404, 'This invitation is no longer available.');
            abort_if(User::where('email', $i->email)->exists(), 422, 'This email already has an account.');
            $u = new User;
            $u->name = $v['name'];
            $u->email = $i->email;
            $u->password = Hash::make($v['password']);
            $u->bureau_id = $i->bureau_id;
            $u->role = $i->role;
            $u->last_login_at = now();
            $u->save();
            DB::table('staff_invites')->where('id', $i->id)->update(['accepted_at' => now()]);

            return $u;
        });
        Auth::login($u);
        $r->session()->regenerate();

        $token = method_exists($u, 'createToken') ? $u->createToken('auth-token')->plainTextToken : null;

        return response()->json([
            'ok' => true,
            'user' => $u->only(['id', 'name', 'email', 'role', 'can_use_ai']),
            'token' => $token,
        ]);
    }
}
