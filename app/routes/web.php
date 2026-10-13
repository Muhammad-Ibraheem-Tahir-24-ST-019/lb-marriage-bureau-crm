<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CrmController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\TeamController;
use App\Http\Middleware\CrmAccess;
use App\Models\Bureau;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/api/csrf-token', fn (Request $r) => response()->json([
    'token' => $r->session()->token(),
])->header('Cache-Control', 'no-store, private'))->middleware('throttle:30,1');

Route::post('/api/contact', function (Request $r) {
    $v = $r->validate(['name' => 'required|string|max:100', 'email' => 'required|email|max:200', 'message' => 'required|string|max:3000']);
    DB::table('inquiries')->insert([...$v, 'created_at' => now(), 'updated_at' => now()]);

    return ['ok' => true];
})->middleware('throttle:3,10');
Route::post('/api/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/api/register', fn () => response()->json(['message' => 'Registration is disabled. Staff accounts are managed by administrators.'], 403));
Route::post('/api/forgot-password', [AuthController::class, 'forgot'])->middleware('throttle:3,10');
Route::post('/api/reset-password', [AuthController::class, 'reset'])->middleware('throttle:5,10');
Route::get('/reset-password/{token}', fn () => Inertia::render('App', ['user' => null, 'demo' => false]))->name('password.reset');
Route::post('/api/logout', [AuthController::class, 'logout']);
Route::post('/api/invite/{token}', [AuthController::class, 'accept'])->middleware('throttle:5,10');
Route::prefix('api/share/{token}')->middleware('throttle:40,1')->group(function () {
    Route::get('/', [ShareController::class, 'show']);
    Route::post('/unlock', [ShareController::class, 'unlock'])->middleware('throttle:5,1');
    Route::post('/respond', [ShareController::class, 'response']);
    Route::post('/edit', [ShareController::class, 'edit'])->middleware('throttle:5,10');
    Route::get('/photos/{id}', [ShareController::class, 'photo']);
});
Route::prefix('api')->middleware([CrmAccess::class, 'throttle:120,1'])->group(function () {
    Route::post('/import', [ImportController::class, 'extract'])->middleware('throttle:10,1');
    Route::get('/state', [CrmController::class, 'state']);
    Route::get('/profiles/{id}', [CrmController::class, 'showProfile']);
    Route::post('/profiles', [CrmController::class, 'saveProfile']);
    Route::put('/profiles/{id}', [CrmController::class, 'saveProfile']);
    Route::delete('/profiles/{id}', [CrmController::class, 'archive']);
    Route::post('/profiles/{id}/restore', [CrmController::class, 'restore']);
    Route::post('/profiles/{id}/files', [CrmController::class, 'upload']);
    Route::get('/files/{id}', [CrmController::class, 'file']);
    Route::get('/profiles/{id}/matches', [CrmController::class, 'matches']);
    Route::post('/profiles/{id}/decision', [CrmController::class, 'decision']);
    Route::post('/proposals', [CrmController::class, 'proposal']);
    Route::put('/proposals/{id}', [CrmController::class, 'proposalStatus']);
    Route::post('/links', [CrmController::class, 'share']);
    Route::delete('/links/{id}', [CrmController::class, 'revoke']);
    Route::post('/work', [CrmController::class, 'work']);
    Route::put('/work/{id}', [CrmController::class, 'work']);
    Route::delete('/work/{id}', [CrmController::class, 'deleteWork']);
    Route::put('/settings', [CrmController::class, 'settings']);
    Route::post('/staff/invite', [CrmController::class, 'invite']);
    Route::put('/staff/{id}', [CrmController::class, 'staff']);
    Route::post('/edits/{id}', [CrmController::class, 'editReview']);
    Route::get('/export', [CrmController::class, 'export']);
    Route::get('/network', [CrmController::class, 'network']);
    Route::post('/introductions', [CrmController::class, 'introduce']);
    Route::put('/introductions/{id}', [CrmController::class, 'introductionStatus']);
    Route::get('/admin', [AdminController::class, 'index']);
    Route::put('/admin/{id}', [AdminController::class, 'update']);
});

// AI routes (require auth + ai.access)
Route::middleware(['auth', 'ai.access'])->group(function () {
    Route::post('/api/ai/chat', [AiController::class, 'chat']);
    Route::get('/api/ai/conversations', [AiController::class, 'conversations']);
    Route::get('/api/ai/conversations/{conversation}', [AiController::class, 'conversation']);
    Route::post('/api/ai/conversations', [AiController::class, 'createConversation']);
    Route::delete('/api/ai/conversations/{conversation}', [AiController::class, 'deleteConversation']);
    Route::post('/api/ai/daily-report', [AiController::class, 'dailyReport']);
    Route::get('/api/ai/task-logs', [AiController::class, 'taskLogs']);
});

// Admin routes (require auth + admin.access)
Route::middleware(['auth', 'admin.access'])->group(function () {
    Route::get('/api/admin/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/api/admin/users', [AdminController::class, 'users']);
    Route::post('/api/admin/users', [AdminController::class, 'createUser']);
    Route::put('/api/admin/users/{user}', [AdminController::class, 'updateUser']);
    Route::delete('/api/admin/users/{user}', [AdminController::class, 'deleteUser']);
    Route::post('/api/admin/users/{user}/reset-password', [AdminController::class, 'resetPassword']);
    Route::get('/api/admin/ai-settings', [AdminController::class, 'aiSettings']);
    Route::put('/api/admin/ai-settings', [AdminController::class, 'updateAiSettings']);
});

// Notes routes (require auth + crm.access)
Route::middleware(['auth', 'crm.access'])->group(function () {
    Route::get('/api/notes', [NoteController::class, 'index']);
    Route::post('/api/notes', [NoteController::class, 'store']);
    Route::put('/api/notes/{note}', [NoteController::class, 'update']);
    Route::delete('/api/notes/{note}', [NoteController::class, 'destroy']);
});

// Team routes (require auth)
Route::middleware(['auth'])->group(function () {
    Route::get('/api/team/messages', [TeamController::class, 'messages']);
    Route::post('/api/team/messages', [TeamController::class, 'send']);
    Route::get('/api/team/channels', [TeamController::class, 'channels']);
});

// Notification routes (require auth)
Route::middleware(['auth'])->group(function () {
    Route::get('/api/notifications', [NotificationController::class, 'index']);
    Route::put('/api/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/api/notifications/read-all', [NotificationController::class, 'markAllRead']);
});

// Invite acceptance (public)
Route::post('/api/invite/accept', [AuthController::class, 'acceptInvite']);

Route::get('/bureau/{slug}', fn () => redirect('/'));
Route::get('/{path?}', fn () => Inertia::render('App', ['user' => auth()->user()?->only(['id', 'name', 'email', 'role', 'can_use_ai']), 'demo' => config('app.demo', false)]))->where('path', '^(?!api(?:/|$)).*')->name('login');
