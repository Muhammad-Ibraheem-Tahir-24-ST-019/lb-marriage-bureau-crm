<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\TeamMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    /**
     * Get messages for a channel.
     * GET /api/team/messages
     */
    public function messages(Request $request): JsonResponse
    {
        $channel = $request->query('channel', 'general');

        $messages = TeamMessage::where('channel', $channel)
            ->whereNull('reply_to')
            ->with([
                'user:id,name,role',
                'replies' => function ($q) {
                    $q->with('user:id,name,role')->orderBy('created_at', 'asc');
                },
            ])
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return response()->json($messages);
    }

    /**
     * Send a team message.
     * POST /api/team/messages
     */
    public function send(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'content' => 'required|string|max:5000',
            'channel' => 'nullable|string|max:50',
            'reply_to' => 'nullable|integer|exists:team_messages,id',
            'is_announcement' => 'nullable|boolean',
        ]);

        $channel = $validated['channel'] ?? 'general';
        $isAnnouncement = (bool) ($validated['is_announcement'] ?? false);

        if ($isAnnouncement) {
            $hasPermission = (method_exists($user, 'isAdmin') && $user->isAdmin())
                || (method_exists($user, 'isManager') && $user->isManager())
                || in_array($user->role, ['admin', 'owner', 'manager']);

            abort_unless($hasPermission, 403, 'Only managers and administrators can post announcements.');
        }

        $message = TeamMessage::create([
            'user_id' => $user->id,
            'channel' => $channel,
            'content' => $validated['content'],
            'reply_to' => $validated['reply_to'] ?? null,
            'is_announcement' => $isAnnouncement,
        ]);

        $message->load('user:id,name,role');

        // Create notifications for team members
        try {
            $recipientIds = User::where('id', '!=', $user->id)
                ->where('active', true)
                ->pluck('id');

            $title = $isAnnouncement
                ? "Announcement from {$user->name}"
                : "New message in #{$channel}";

            $body = mb_substr($validated['content'], 0, 120);

            $notificationData = [];
            $now = now();

            foreach ($recipientIds as $recId) {
                $notificationData[] = [
                    'id' => (string) Str::uuid(),
                    'user_id' => $recId,
                    'type' => $isAnnouncement ? 'team.announcement' : 'team.message',
                    'title' => $title,
                    'body' => $body,
                    'data' => json_encode([
                        'channel' => $channel,
                        'message_id' => $message->id,
                        'sender_id' => $user->id,
                        'sender_name' => $user->name,
                    ]),
                    'read_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($notificationData)) {
                Notification::insert($notificationData);
            }
        } catch (\Throwable $e) {
            // Non-blocking notification delivery failure
        }

        return response()->json($message, 201);
    }

    /**
     * Get distinct channels with message counts.
     * GET /api/team/channels
     */
    public function channels(Request $request): JsonResponse
    {
        $channelCounts = TeamMessage::select('channel', DB::raw('count(*) as count'))
            ->groupBy('channel')
            ->pluck('count', 'channel')
            ->toArray();

        // Always ensure 'general' and 'announcements' exist
        $defaults = ['general' => 0, 'announcements' => 0];
        $all = array_merge($defaults, $channelCounts);

        $result = [];
        foreach ($all as $channel => $count) {
            $result[] = [
                'name' => $channel,
                'messages_count' => (int) $count,
            ];
        }

        return response()->json($result);
    }
}
