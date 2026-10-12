<?php

namespace App\Services;

use App\Models\Profile;
use App\Models\Proposal;
use App\Models\User;
use App\Models\WorkItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * Generate structured daily report data.
     *
     * @return array<string, mixed>
     */
    public function dailyReport(): array
    {
        $today = Carbon::today();
        $tomorrow = Carbon::tomorrow();
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        // Profile metrics
        $profilesCreatedToday = Profile::whereDate('created_at', $today)->count();
        $profilesTotal = Profile::count();
        $profilesByStatus = Profile::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Proposal metrics
        $proposalsCreatedToday = Proposal::whereDate('created_at', $today)->count();
        $proposalsTotal = Proposal::count();
        $proposalsByStatus = Proposal::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Task & meeting metrics
        $tasksCompletedToday = WorkItem::where('status', 'Completed')
            ->whereDate('updated_at', $today)
            ->count();

        $tasksDueToday = WorkItem::where('status', '!=', 'Completed')
            ->where('status', '!=', 'Cancelled')
            ->whereBetween('due_at', [$today, $tomorrow])
            ->count();

        $tasksOverdue = WorkItem::where('status', '!=', 'Completed')
            ->where('status', '!=', 'Cancelled')
            ->where('due_at', '<', $today)
            ->count();

        $meetingsToday = WorkItem::where('kind', 'meeting')
            ->whereBetween('due_at', [$today, $tomorrow])
            ->count();

        $meetingsThisWeek = WorkItem::where('kind', 'meeting')
            ->whereBetween('due_at', [$startOfWeek, $endOfWeek])
            ->count();

        // Staff activity
        $staffActivity = DB::table('activities')
            ->whereDate('created_at', $today)
            ->join('users', 'users.id', '=', 'activities.user_id')
            ->select('users.name as staff_name', 'activities.action', 'activities.description', 'activities.created_at')
            ->orderByDesc('activities.created_at')
            ->limit(50)
            ->get()
            ->toArray();

        // New matches / decisions recorded today
        $newMatchesFound = DB::table('match_decisions')
            ->whereDate('created_at', $today)
            ->count();

        return [
            'date' => $today->toDateString(),
            'profiles' => [
                'created_today' => $profilesCreatedToday,
                'total' => $profilesTotal,
                'by_status' => $profilesByStatus,
            ],
            'proposals' => [
                'created_today' => $proposalsCreatedToday,
                'total' => $proposalsTotal,
                'by_status' => $proposalsByStatus,
            ],
            'tasks' => [
                'completed_today' => $tasksCompletedToday,
                'due_today' => $tasksDueToday,
                'overdue' => $tasksOverdue,
            ],
            'meetings' => [
                'today' => $meetingsToday,
                'this_week' => $meetingsThisWeek,
            ],
            'matches' => [
                'recorded_today' => $newMatchesFound,
            ],
            'staff_activity' => $staffActivity,
            'summary_text' => sprintf(
                "Daily Report (%s):\n- Profiles: %d new today, %d total\n- Proposals: %d new today, %d total\n- Tasks: %d completed today, %d due today, %d overdue\n- Meetings: %d today, %d this week\n- Matches reviewed today: %d",
                $today->toFormattedDateString(),
                $profilesCreatedToday,
                $profilesTotal,
                $proposalsCreatedToday,
                $proposalsTotal,
                $tasksCompletedToday,
                $tasksDueToday,
                $tasksOverdue,
                $meetingsToday,
                $meetingsThisWeek,
                $newMatchesFound
            ),
        ];
    }

    /**
     * Generate progress metrics for a period ('week' or 'month').
     *
     * @param string $period 'week' or 'month'
     * @return array<string, mixed>
     */
    public function progressReport(string $period = 'week'): array
    {
        $now = Carbon::now();

        if ($period === 'month') {
            $startDate = $now->copy()->startOfMonth();
            $endDate = $now->copy()->endOfMonth();
            $prevStartDate = $now->copy()->subMonth()->startOfMonth();
            $prevEndDate = $now->copy()->subMonth()->endOfMonth();
        } else {
            $startDate = $now->copy()->startOfWeek();
            $endDate = $now->copy()->endOfWeek();
            $prevStartDate = $now->copy()->subWeek()->startOfWeek();
            $prevEndDate = $now->copy()->subWeek()->endOfWeek();
        }

        // Current period profiles
        $profilesCurrent = Profile::whereBetween('created_at', [$startDate, $endDate])->count();
        $profilesPrev = Profile::whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();
        $profileGrowthPercent = $profilesPrev > 0
            ? round((($profilesCurrent - $profilesPrev) / $profilesPrev) * 100, 1)
            : ($profilesCurrent > 0 ? 100.0 : 0.0);

        // Proposals
        $proposalsCurrent = Proposal::whereBetween('created_at', [$startDate, $endDate])->count();
        $proposalsPrev = Proposal::whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();

        $proposalsClosedOrMatched = Proposal::whereBetween('created_at', [$startDate, $endDate])
            ->whereIn('status', ['Interested', 'Meeting Planned', 'Closed'])
            ->count();
        $conversionRate = $proposalsCurrent > 0
            ? round(($proposalsClosedOrMatched / $proposalsCurrent) * 100, 1)
            : 0.0;

        // Tasks completion rate
        $tasksCreatedCurrent = WorkItem::whereBetween('created_at', [$startDate, $endDate])->count();
        $tasksCompletedCurrent = WorkItem::where('status', 'Completed')
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();
        $taskCompletionRate = $tasksCreatedCurrent > 0
            ? round(($tasksCompletedCurrent / $tasksCreatedCurrent) * 100, 1)
            : ($tasksCompletedCurrent > 0 ? 100.0 : 0.0);

        // Matching success rate (Shortlisted / Total decisions)
        $totalDecisions = DB::table('match_decisions')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();
        $shortlistedDecisions = DB::table('match_decisions')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('decision', 'Shortlisted')
            ->count();
        $matchingSuccessRate = $totalDecisions > 0
            ? round(($shortlistedDecisions / $totalDecisions) * 100, 1)
            : 0.0;

        return [
            'period' => $period,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'profile_growth' => [
                'current_period' => $profilesCurrent,
                'previous_period' => $profilesPrev,
                'growth_percentage' => $profileGrowthPercent,
            ],
            'proposal_conversion_rate' => [
                'current_period_created' => $proposalsCurrent,
                'previous_period_created' => $proposalsPrev,
                'converted' => $proposalsClosedOrMatched,
                'conversion_percentage' => $conversionRate,
            ],
            'task_completion_rate' => [
                'tasks_created' => $tasksCreatedCurrent,
                'tasks_completed' => $tasksCompletedCurrent,
                'completion_percentage' => $taskCompletionRate,
            ],
            'matching_success_rate' => [
                'total_decisions' => $totalDecisions,
                'shortlisted' => $shortlistedDecisions,
                'success_percentage' => $matchingSuccessRate,
            ],
            'summary_text' => sprintf(
                "Progress Report (%s: %s to %s):\n- Profile Growth: %d new (%+.1f%% vs prev)\n- Proposal Conversion: %.1f%%\n- Task Completion Rate: %.1f%%\n- Match Acceptance Rate: %.1f%%",
                ucfirst($period),
                $startDate->toDateString(),
                $endDate->toDateString(),
                $profilesCurrent,
                $profileGrowthPercent,
                $conversionRate,
                $taskCompletionRate,
                $matchingSuccessRate
            ),
        ];
    }
}
