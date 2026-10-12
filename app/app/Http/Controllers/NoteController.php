<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    /**
     * List user's notes and shared notes.
     * GET /api/notes
     */
    public function index(Request $request): JsonResponse
    {
        $userId = auth()->id();

        $query = Note::query()
            ->with(['user:id,name,email', 'profile:id,name'])
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                  ->orWhere('is_shared', true);
            });

        if ($request->filled('profile_id')) {
            $query->where('profile_id', (int) $request->query('profile_id'));
        }

        if ($request->filled('search')) {
            $term = $request->query('search');
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', "%{$term}%")
                  ->orWhere('content', 'like', "%{$term}%");
            });
        }

        $notes = $query->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($notes);
    }

    /**
     * Create a new note.
     * POST /api/notes
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'content' => 'nullable|string',
            'profile_id' => 'nullable|integer|exists:profiles,id',
            'is_shared' => 'nullable|boolean',
            'color' => 'nullable|string|max:30',
            'is_pinned' => 'nullable|boolean',
        ]);

        $note = Note::create([
            'user_id' => auth()->id(),
            'profile_id' => $validated['profile_id'] ?? null,
            'title' => $validated['title'],
            'content' => $validated['content'] ?? '',
            'is_shared' => (bool) ($validated['is_shared'] ?? false),
            'color' => $validated['color'] ?? null,
            'is_pinned' => (bool) ($validated['is_pinned'] ?? false),
        ]);

        $note->load(['user:id,name,email', 'profile:id,name']);

        return response()->json($note, 201);
    }

    /**
     * Update an existing note.
     * PUT /api/notes/{note}
     */
    public function update(Request $request, Note $note): JsonResponse
    {
        $userId = auth()->id();
        abort_unless($note->user_id === $userId, 403, 'You can only update your own notes.');

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'content' => 'nullable|string',
            'profile_id' => 'nullable|integer|exists:profiles,id',
            'is_shared' => 'nullable|boolean',
            'color' => 'nullable|string|max:30',
            'is_pinned' => 'nullable|boolean',
        ]);

        $note->update($validated);
        $note->load(['user:id,name,email', 'profile:id,name']);

        return response()->json($note);
    }

    /**
     * Delete a note.
     * DELETE /api/notes/{note}
     */
    public function destroy(Note $note): JsonResponse
    {
        $user = auth()->user();
        $isAdmin = method_exists($user, 'isAdmin') ? $user->isAdmin() : in_array($user->role, ['admin', 'owner']);

        abort_unless($note->user_id === $user->id || $isAdmin, 403, 'Unauthorized to delete this note.');

        $note->delete();

        return response()->json(['ok' => true]);
    }
}
