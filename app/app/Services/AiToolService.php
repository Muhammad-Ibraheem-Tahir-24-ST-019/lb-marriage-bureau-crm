<?php

namespace App\Services;

use App\Models\AiTaskLog;
use App\Models\Note;
use App\Models\Profile;
use App\Models\Proposal;
use App\Models\User;
use App\Models\WorkItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AiToolService
{
    public function __construct(
        protected Matcher $matcher,
        protected ReportService $reportService
    ) {}

    /**
     * Log tool execution to ai_task_logs.
     */
    protected function logTask(
        int $userId,
        string $action,
        string $description,
        array $inputData,
        array $outputData,
        string $status = 'success',
        ?string $error = null,
        ?int $conversationId = null
    ): void {
        try {
            AiTaskLog::create([
                'user_id' => $userId,
                'conversation_id' => $conversationId,
                'action' => $action,
                'description' => $description,
                'input_data' => $inputData,
                'output_data' => $outputData,
                'status' => $status,
                'error' => $error,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to log AI task: ' . $e->getMessage(), [
                'action' => $action,
                'user_id' => $userId,
            ]);
        }
    }

    /**
     * Search profiles by name, gender, city, status, age range, etc.
     */
    public function searchProfiles(array $args, int $userId): array
    {
        try {
            $query = Profile::query();

            if (!empty($args['query'])) {
                $q = $args['query'];
                $query->where(function ($w) use ($q) {
                    $w->where('name', 'like', "%{$q}%")
                      ->orWhere('city', 'like', "%{$q}%")
                      ->orWhere('profession', 'like', "%{$q}%")
                      ->orWhere('religion', 'like', "%{$q}%")
                      ->orWhere('notes', 'like', "%{$q}%");
                });
            }

            if (!empty($args['name'])) {
                $query->where('name', 'like', '%' . $args['name'] . '%');
            }

            if (!empty($args['gender'])) {
                $query->where('gender', $args['gender']);
            }

            if (!empty($args['city'])) {
                $query->where('city', 'like', '%' . $args['city'] . '%');
            }

            if (!empty($args['status'])) {
                $query->where('status', $args['status']);
            }

            if (!empty($args['marital_status'])) {
                $query->where('marital_status', $args['marital_status']);
            }

            if (!empty($args['religion'])) {
                $query->where('religion', $args['religion']);
            }

            if (!empty($args['min_age'])) {
                $maxDob = Carbon::now()->subYears((int) $args['min_age'])->toDateString();
                $query->where('dob', '<=', $maxDob);
            }

            if (!empty($args['max_age'])) {
                $minDob = Carbon::now()->subYears((int) $args['max_age'] + 1)->toDateString();
                $query->where('dob', '>', $minDob);
            }

            $limit = min(50, max(1, (int) ($args['limit'] ?? 15)));
            $profiles = $query->orderByDesc('created_at')->limit($limit)->get();

            $results = $profiles->map(fn (Profile $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'gender' => $p->gender,
                'age' => $p->dob?->age,
                'city' => $p->city,
                'country' => $p->country,
                'profession' => $p->profession,
                'education' => $p->education,
                'status' => $p->status,
                'marital_status' => $p->marital_status,
                'religion' => $p->religion,
                'phone' => $p->phone,
            ])->toArray();

            $output = [
                'count' => count($results),
                'profiles' => $results,
            ];

            $this->logTask($userId, 'search_profiles', 'Searched profiles with filters: ' . json_encode($args), $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'search_profiles', 'Search failed: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Get full profile details by ID.
     */
    public function getProfile(array $args, int $userId): array
    {
        try {
            $profileId = (int) ($args['id'] ?? $args['profile_id'] ?? 0);
            if ($profileId <= 0) {
                return ['error' => 'Valid profile ID is required'];
            }

            $profile = Profile::find($profileId);
            if (!$profile) {
                return ['error' => "Profile #{$profileId} not found."];
            }

            $details = [
                'id' => $profile->id,
                'name' => $profile->name,
                'gender' => $profile->gender,
                'dob' => $profile->dob?->toDateString(),
                'age' => $profile->dob?->age,
                'city' => $profile->city,
                'country' => $profile->country,
                'profession' => $profile->profession,
                'education' => $profile->education,
                'status' => $profile->status,
                'marital_status' => $profile->marital_status,
                'religion' => $profile->religion,
                'sect' => $profile->sect,
                'phone' => $profile->phone,
                'notes' => $profile->notes,
                'tags' => $profile->tags,
                'details' => $profile->details,
                'preferences' => $profile->preferences,
                'created_at' => $profile->created_at?->toIso8601String(),
            ];

            $this->logTask($userId, 'get_profile', "Retrieved profile #{$profileId} ({$profile->name})", $args, ['profile_id' => $profileId]);

            return ['profile' => $details];
        } catch (\Throwable $e) {
            $this->logTask($userId, 'get_profile', 'Failed retrieving profile: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Create a new profile.
     */
    public function createProfile(array $args, int $userId): array
    {
        try {
            if (empty($args['name']) || empty($args['gender']) || empty($args['dob']) || empty($args['city'])) {
                return ['error' => 'Missing required fields: name, gender, dob, city are required.'];
            }

            $user = User::find($userId);
            $bureauId = $user?->bureau_id ?? 1;

            $profile = new Profile();
            $profile->bureau_id = $bureauId;
            $profile->name = $args['name'];
            $profile->gender = $args['gender'];
            $profile->dob = $args['dob'];
            $profile->city = $args['city'];
            $profile->country = $args['country'] ?? 'Pakistan';
            $profile->profession = $args['profession'] ?? null;
            $profile->education = $args['education'] ?? null;
            $profile->status = $args['status'] ?? 'Draft';
            $profile->marital_status = $args['marital_status'] ?? 'Never married';
            $profile->religion = $args['religion'] ?? 'Islam';
            $profile->sect = $args['sect'] ?? null;
            $profile->phone = $args['phone'] ?? null;
            $profile->notes = $args['notes'] ?? null;
            $profile->tags = $args['tags'] ?? [];
            $profile->details = $args['details'] ?? null;
            $profile->preferences = $args['preferences'] ?? null;
            $profile->consented_at = now();
            $profile->save();

            $output = [
                'success' => true,
                'profile_id' => $profile->id,
                'name' => $profile->name,
                'message' => "Profile #{$profile->id} ({$profile->name}) created successfully.",
            ];

            $this->logTask($userId, 'create_profile', "Created profile #{$profile->id} ({$profile->name})", $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'create_profile', 'Failed creating profile: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Update an existing profile.
     */
    public function updateProfile(array $args, int $userId): array
    {
        try {
            $profileId = (int) ($args['id'] ?? $args['profile_id'] ?? 0);
            if ($profileId <= 0) {
                return ['error' => 'Valid profile ID is required'];
            }

            $profile = Profile::find($profileId);
            if (!$profile) {
                return ['error' => "Profile #{$profileId} not found."];
            }

            $allowedFields = [
                'name', 'gender', 'dob', 'city', 'country', 'profession', 'education',
                'status', 'marital_status', 'religion', 'sect', 'phone', 'notes',
                'tags', 'details', 'preferences'
            ];

            $updatedFields = [];
            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $args)) {
                    $profile->{$field} = $args[$field];
                    $updatedFields[] = $field;
                }
            }

            $profile->save();

            $output = [
                'success' => true,
                'profile_id' => $profile->id,
                'updated_fields' => $updatedFields,
                'message' => "Profile #{$profile->id} updated successfully.",
            ];

            $this->logTask($userId, 'update_profile', "Updated profile #{$profile->id} fields: " . implode(', ', $updatedFields), $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'update_profile', 'Failed updating profile: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Find matches for a profile using Matcher.
     */
    public function getMatches(array $args, int $userId): array
    {
        try {
            $profileId = (int) ($args['id'] ?? $args['profile_id'] ?? 0);
            if ($profileId <= 0) {
                return ['error' => 'Valid profile ID is required'];
            }

            $profile = Profile::find($profileId);
            if (!$profile) {
                return ['error' => "Profile #{$profileId} not found."];
            }

            $minScore = (int) ($args['min_score'] ?? 40);
            $limit = min(25, max(1, (int) ($args['limit'] ?? 10)));

            // Find opposite gender, active profiles
            $candidates = Profile::where('id', '!=', $profile->id)
                ->where('gender', '!=', $profile->gender)
                ->where('status', 'Active')
                ->get();

            $matches = [];
            foreach ($candidates as $candidate) {
                $scoreResult = $this->matcher->score($profile, $candidate);
                $score = $scoreResult['score'] ?? 0;

                if ($score >= $minScore) {
                    $matches[] = [
                        'id' => $candidate->id,
                        'name' => $candidate->name,
                        'age' => $candidate->dob?->age,
                        'city' => $candidate->city,
                        'profession' => $candidate->profession,
                        'education' => $candidate->education,
                        'marital_status' => $candidate->marital_status,
                        'religion' => $candidate->religion,
                        'score' => $score,
                        'reasons' => $scoreResult['reasons'] ?? [],
                    ];
                }
            }

            // Sort by score descending
            usort($matches, fn ($a, $b) => $b['score'] <=> $a['score']);
            $matches = array_slice($matches, 0, $limit);

            $output = [
                'profile_id' => $profileId,
                'profile_name' => $profile->name,
                'total_matches' => count($matches),
                'matches' => $matches,
            ];

            $this->logTask($userId, 'get_matches', "Found " . count($matches) . " matches for profile #{$profileId}", $args, ['total_matches' => count($matches)]);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'get_matches', 'Failed finding matches: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Create a new proposal with candidates.
     */
    public function createProposal(array $args, int $userId): array
    {
        try {
            $profileId = (int) ($args['profile_id'] ?? 0);
            $candidateIds = (array) ($args['candidate_ids'] ?? []);
            $title = $args['title'] ?? null;
            $notes = $args['notes'] ?? null;

            if ($profileId <= 0 || empty($candidateIds)) {
                return ['error' => 'profile_id and at least one candidate_id are required'];
            }

            $sourceProfile = Profile::find($profileId);
            if (!$sourceProfile) {
                return ['error' => "Profile #{$profileId} not found."];
            }

            if (!$title) {
                $title = "Proposal for {$sourceProfile->name} - " . Carbon::today()->format('M Y');
            }

            $user = User::find($userId);
            $bureauId = $user?->bureau_id ?? 1;

            $proposal = DB::transaction(function () use ($bureauId, $profileId, $title, $notes, $candidateIds) {
                $p = Proposal::create([
                    'bureau_id' => $bureauId,
                    'profile_id' => $profileId,
                    'title' => $title,
                    'notes' => $notes,
                    'status' => 'Draft',
                ]);

                foreach ($candidateIds as $cid) {
                    $cid = (int) $cid;
                    if ($cid !== $profileId && Profile::where('id', $cid)->exists()) {
                        DB::table('proposal_profiles')->insert([
                            'proposal_id' => $p->id,
                            'profile_id' => $cid,
                        ]);
                    }
                }

                return $p;
            });

            $output = [
                'success' => true,
                'proposal_id' => $proposal->id,
                'title' => $proposal->title,
                'candidate_count' => count($candidateIds),
                'message' => "Proposal #{$proposal->id} created successfully.",
            ];

            $this->logTask($userId, 'create_proposal', "Created proposal #{$proposal->id} for profile #{$profileId}", $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'create_proposal', 'Failed creating proposal: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Create a work item (follow-up or meeting).
     */
    public function createTask(array $args, int $userId): array
    {
        try {
            if (empty($args['title']) || empty($args['due_at'])) {
                return ['error' => 'title and due_at are required'];
            }

            $user = User::find($userId);
            $bureauId = $user?->bureau_id ?? 1;

            $task = WorkItem::create([
                'bureau_id' => $bureauId,
                'kind' => $args['kind'] ?? 'followup',
                'title' => $args['title'],
                'type' => $args['type'] ?? 'Call',
                'due_at' => Carbon::parse($args['due_at'])->toDateTimeString(),
                'status' => $args['status'] ?? 'Pending',
                'profile_id' => !empty($args['profile_id']) ? (int) $args['profile_id'] : null,
                'assigned_to' => !empty($args['assigned_to']) ? (int) $args['assigned_to'] : $userId,
                'notes' => $args['notes'] ?? null,
                'location' => $args['location'] ?? null,
            ]);

            $output = [
                'success' => true,
                'task_id' => $task->id,
                'title' => $task->title,
                'due_at' => $task->due_at,
                'status' => $task->status,
                'message' => "Task #{$task->id} created successfully.",
            ];

            $this->logTask($userId, 'create_task', "Created task #{$task->id}: {$task->title}", $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'create_task', 'Failed creating task: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Update a work item.
     */
    public function updateTask(array $args, int $userId): array
    {
        try {
            $taskId = (int) ($args['id'] ?? $args['task_id'] ?? 0);
            if ($taskId <= 0) {
                return ['error' => 'Valid task ID is required'];
            }

            $task = WorkItem::find($taskId);
            if (!$task) {
                return ['error' => "Task #{$taskId} not found."];
            }

            $allowedFields = ['title', 'kind', 'type', 'due_at', 'status', 'assigned_to', 'notes', 'location'];
            $updatedFields = [];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $args)) {
                    if ($field === 'due_at') {
                        $task->due_at = Carbon::parse($args['due_at'])->toDateTimeString();
                    } else {
                        $task->{$field} = $args[$field];
                    }
                    $updatedFields[] = $field;
                }
            }

            $task->save();

            $output = [
                'success' => true,
                'task_id' => $task->id,
                'updated_fields' => $updatedFields,
                'status' => $task->status,
                'message' => "Task #{$task->id} updated successfully.",
            ];

            $this->logTask($userId, 'update_task', "Updated task #{$task->id}", $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'update_task', 'Failed updating task: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Generate daily report.
     */
    public function getDailyReport(array $args, int $userId): array
    {
        try {
            $report = $this->reportService->dailyReport();
            $this->logTask($userId, 'get_daily_report', 'Generated daily report', $args, ['date' => $report['date']]);
            return $report;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'get_daily_report', 'Failed generating daily report: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Generate progress report for week/month.
     */
    public function getProgressReport(array $args, int $userId): array
    {
        try {
            $period = in_array(strtolower($args['period'] ?? ''), ['month', 'monthly']) ? 'month' : 'week';
            $report = $this->reportService->progressReport($period);
            $this->logTask($userId, 'get_progress_report', "Generated progress report for {$period}", $args, ['period' => $period]);
            return $report;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'get_progress_report', 'Failed generating progress report: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Search notes.
     */
    public function searchNotes(array $args, int $userId): array
    {
        try {
            $query = Note::query()
                ->where(function ($q) use ($userId) {
                    $q->where('user_id', $userId)
                      ->orWhere('is_shared', true);
                });

            if (!empty($args['query'])) {
                $term = $args['query'];
                $query->where(function ($q) use ($term) {
                    $q->where('title', 'like', "%{$term}%")
                      ->orWhere('content', 'like', "%{$term}%");
                });
            }

            if (!empty($args['profile_id'])) {
                $query->where('profile_id', (int) $args['profile_id']);
            }

            $limit = min(20, max(1, (int) ($args['limit'] ?? 10)));
            $notes = $query->orderByDesc('is_pinned')
                ->orderByDesc('updated_at')
                ->limit($limit)
                ->get();

            $results = $notes->map(fn (Note $n) => [
                'id' => $n->id,
                'title' => $n->title,
                'content' => $n->content,
                'profile_id' => $n->profile_id,
                'is_shared' => (bool) $n->is_shared,
                'color' => $n->color,
                'created_at' => $n->created_at?->toIso8601String(),
            ])->toArray();

            $output = [
                'count' => count($results),
                'notes' => $results,
            ];

            $this->logTask($userId, 'search_notes', 'Searched notes', $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'search_notes', 'Failed searching notes: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Return comprehensive CRM stats.
     */
    public function getStatistics(array $args, int $userId): array
    {
        try {
            $today = Carbon::today();
            $tomorrow = Carbon::tomorrow();
            $weekStart = Carbon::now()->startOfWeek();
            $weekEnd = Carbon::now()->endOfWeek();

            $profilesTotal = Profile::count();
            $profilesActive = Profile::where('status', 'Active')->count();
            $profilesMatched = Profile::where('status', 'Matched')->count();
            $profilesOnHold = Profile::where('status', 'On Hold')->count();
            $profilesDraft = Profile::where('status', 'Draft')->count();

            $proposalsTotal = Proposal::count();
            $proposalsPending = Proposal::whereIn('status', ['Draft', 'Shared', 'Viewed'])->count();
            $proposalsCompleted = Proposal::whereIn('status', ['Closed', 'Interested', 'Meeting Planned'])->count();

            $tasksDueToday = WorkItem::where('status', '!=', 'Completed')
                ->where('status', '!=', 'Cancelled')
                ->whereBetween('due_at', [$today, $tomorrow])
                ->count();

            $tasksOverdue = WorkItem::where('status', '!=', 'Completed')
                ->where('status', '!=', 'Cancelled')
                ->where('due_at', '<', $today)
                ->count();

            $tasksCompletedWeek = WorkItem::where('status', 'Completed')
                ->whereBetween('updated_at', [$weekStart, $weekEnd])
                ->count();

            $staffCount = User::count();
            $activeUsers = User::where('active', true)->count();

            $stats = [
                'profiles' => [
                    'total' => $profilesTotal,
                    'active' => $profilesActive,
                    'matched' => $profilesMatched,
                    'on_hold' => $profilesOnHold,
                    'draft' => $profilesDraft,
                ],
                'proposals' => [
                    'total' => $proposalsTotal,
                    'pending' => $proposalsPending,
                    'completed' => $proposalsCompleted,
                ],
                'tasks' => [
                    'due_today' => $tasksDueToday,
                    'overdue' => $tasksOverdue,
                    'completed_this_week' => $tasksCompletedWeek,
                ],
                'team' => [
                    'total_staff' => $staffCount,
                    'active_staff' => $activeUsers,
                ],
            ];

            $this->logTask($userId, 'get_statistics', 'Retrieved CRM statistics', $args, $stats);

            return $stats;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'get_statistics', 'Failed getting statistics: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Get tasks due in the next 7 days.
     */
    public function getUpcomingTasks(array $args, int $userId): array
    {
        try {
            $now = Carbon::now();
            $end = Carbon::now()->addDays(7)->endOfDay();

            $tasks = WorkItem::where('status', '!=', 'Completed')
                ->where('status', '!=', 'Cancelled')
                ->whereBetween('due_at', [$now, $end])
                ->orderBy('due_at')
                ->get()
                ->map(fn (WorkItem $w) => [
                    'id' => $w->id,
                    'title' => $w->title,
                    'kind' => $w->kind,
                    'type' => $w->type,
                    'due_at' => $w->due_at,
                    'status' => $w->status,
                    'profile_id' => $w->profile_id,
                    'assigned_to' => $w->assigned_to,
                ])->toArray();

            $output = [
                'count' => count($tasks),
                'tasks' => $tasks,
            ];

            $this->logTask($userId, 'get_upcoming_tasks', 'Retrieved upcoming tasks', $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'get_upcoming_tasks', 'Failed getting upcoming tasks: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Get overdue tasks and meetings.
     */
    public function getOverdueItems(array $args, int $userId): array
    {
        try {
            $now = Carbon::now();

            $tasks = WorkItem::where('status', '!=', 'Completed')
                ->where('status', '!=', 'Cancelled')
                ->where('due_at', '<', $now)
                ->orderBy('due_at')
                ->get()
                ->map(fn (WorkItem $w) => [
                    'id' => $w->id,
                    'title' => $w->title,
                    'kind' => $w->kind,
                    'type' => $w->type,
                    'due_at' => $w->due_at,
                    'status' => $w->status,
                    'profile_id' => $w->profile_id,
                    'assigned_to' => $w->assigned_to,
                    'hours_overdue' => round($now->diffInHours(Carbon::parse($w->due_at))),
                ])->toArray();

            $output = [
                'count' => count($tasks),
                'overdue_items' => $tasks,
            ];

            $this->logTask($userId, 'get_overdue_items', 'Retrieved overdue items', $args, $output);

            return $output;
        } catch (\Throwable $e) {
            $this->logTask($userId, 'get_overdue_items', 'Failed getting overdue items: ' . $e->getMessage(), $args, [], 'failed', $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
}
