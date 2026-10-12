<?php

namespace App\Http\Controllers;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiTaskLog;
use App\Services\AiService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(
        protected AiService $aiService,
        protected ReportService $reportService
    ) {}

    /**
     * Send a chat message to AI.
     * POST /api/ai/chat
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'nullable|integer',
            'message' => 'required|string|max:10000',
            'context' => 'nullable|string|in:general,report,task,crm_query',
        ]);

        $userId = auth()->id();

        if (!empty($validated['conversation_id'])) {
            $conversation = AiConversation::findOrFail($validated['conversation_id']);
            abort_unless($conversation->user_id === $userId, 403, 'Unauthorized conversation access.');
        } else {
            $title = mb_substr(trim($validated['message']), 0, 50);
            $conversation = AiConversation::create([
                'user_id' => $userId,
                'title' => $title ?: 'New Conversation',
                'context' => $validated['context'] ?? 'general',
                'is_pinned' => false,
            ]);
        }

        $result = $this->aiService->chat($conversation, $validated['message'], $userId);

        return response()->json([
            'message' => $result['message'],
            'conversation_id' => $conversation->id,
            'title' => $conversation->title,
            'tokens_used' => $result['tokens_used'] ?? 0,
        ]);
    }

    /**
     * List user's conversations.
     * GET /api/ai/conversations
     */
    public function conversations(Request $request): JsonResponse
    {
        $userId = auth()->id();

        $conversations = AiConversation::where('user_id', $userId)
            ->withCount('messages')
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (AiConversation $c) {
                $lastMsg = $c->messages()->latest('id')->first();
                return [
                    'id' => $c->id,
                    'title' => $c->title,
                    'context' => $c->context,
                    'is_pinned' => (bool) $c->is_pinned,
                    'messages_count' => $c->messages_count,
                    'last_message' => $lastMsg ? [
                        'role' => $lastMsg->role,
                        'content' => mb_substr($lastMsg->content ?? '', 0, 100),
                        'created_at' => $lastMsg->created_at?->toIso8601String(),
                    ] : null,
                    'updated_at' => $c->updated_at?->toIso8601String(),
                    'created_at' => $c->created_at?->toIso8601String(),
                ];
            });

        return response()->json($conversations);
    }

    /**
     * Get specific conversation with full messages history.
     * GET /api/ai/conversations/{conversation}
     */
    public function conversation(AiConversation $conversation): JsonResponse
    {
        abort_unless($conversation->user_id === auth()->id(), 403, 'Unauthorized conversation access.');

        $messages = $conversation->messages()
            ->orderBy('id')
            ->get()
            ->map(fn (AiMessage $m) => [
                'id' => $m->id,
                'role' => $m->role,
                'content' => $m->content,
                'tool_calls' => is_string($m->tool_calls) ? json_decode($m->tool_calls, true) : $m->tool_calls,
                'tool_results' => is_string($m->tool_results) ? json_decode($m->tool_results, true) : $m->tool_results,
                'tokens_used' => $m->tokens_used,
                'model_used' => $m->model_used,
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'conversation' => [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'context' => $conversation->context,
                'is_pinned' => (bool) $conversation->is_pinned,
                'created_at' => $conversation->created_at?->toIso8601String(),
                'updated_at' => $conversation->updated_at?->toIso8601String(),
            ],
            'messages' => $messages,
        ]);
    }

    /**
     * Create a new blank conversation.
     * POST /api/ai/conversations
     */
    public function createConversation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:120',
            'context' => 'nullable|string|in:general,report,task,crm_query',
        ]);

        $conversation = AiConversation::create([
            'user_id' => auth()->id(),
            'title' => $validated['title'] ?? 'New Conversation',
            'context' => $validated['context'] ?? 'general',
            'is_pinned' => false,
        ]);

        return response()->json($conversation, 201);
    }

    /**
     * Delete conversation and cascade messages.
     * DELETE /api/ai/conversations/{conversation}
     */
    public function deleteConversation(AiConversation $conversation): JsonResponse
    {
        abort_unless($conversation->user_id === auth()->id(), 403, 'Unauthorized conversation access.');

        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Generate daily report using AI + ReportService (Admin/Manager only).
     * POST /api/ai/daily-report
     */
    public function dailyReport(Request $request): JsonResponse
    {
        $user = auth()->user();
        $isAdmin = method_exists($user, 'isAdmin') ? $user->isAdmin() : in_array($user->role, ['admin', 'owner', 'manager']);
        abort_unless($isAdmin, 403, 'Daily report generation is restricted to administrators.');

        $data = $this->reportService->dailyReport();

        // Optionally synthesize with AI if available
        $aiSettings = $this->aiService->getSettings();
        $analysis = null;

        if ($aiSettings) {
            try {
                $tempConv = AiConversation::create([
                    'user_id' => $user->id,
                    'title' => 'Daily Report ' . $data['date'],
                    'context' => 'report',
                ]);

                $prompt = "Please provide an executive daily summary and action items based on this CRM daily report data:\n" . json_encode($data);
                $aiResponse = $this->aiService->chat($tempConv, $prompt, $user->id);
                $analysis = $aiResponse['message']['content'] ?? null;
            } catch (\Throwable $e) {
                // Non-fatal, report data is still returned
            }
        }

        return response()->json([
            'report' => $data,
            'ai_analysis' => $analysis,
        ]);
    }

    /**
     * List AI task logs.
     * GET /api/ai/task-logs
     */
    public function taskLogs(Request $request): JsonResponse
    {
        $user = auth()->user();
        $isAdmin = method_exists($user, 'isAdmin') ? $user->isAdmin() : in_array($user->role, ['admin', 'owner']);

        $query = AiTaskLog::with('user:id,name,email');

        if (!$isAdmin) {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $logs = $query->orderByDesc('created_at')->paginate(25);

        return response()->json($logs);
    }
}
