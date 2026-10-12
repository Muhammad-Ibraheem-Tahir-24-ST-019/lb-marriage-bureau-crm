<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * List user notifications.
     * GET /api/notifications
     */
    public function index(Request $request): JsonResponse
    {
        $userId = auth()->id();

        $notifications = Notification::where('user_id', $userId)
            ->orderByRaw('read_at IS NULL DESC')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($notifications);
    }

    /**
     * Mark a single notification as read.
     * PUT /api/notifications/{id}/read
     */
    public function markRead(string $id): JsonResponse
    {
        $userId = auth()->id();

        $notification = Notification::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $notification->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    /**
     * Mark all notifications as read.
     * POST /api/notifications/read-all
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $userId = auth()->id();

        Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
