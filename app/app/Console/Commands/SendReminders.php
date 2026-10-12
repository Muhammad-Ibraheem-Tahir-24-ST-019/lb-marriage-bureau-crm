<?php

namespace App\Console\Commands;

use App\Models\Bureau;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendReminders extends Command
{
    protected $signature = 'rishtahub:reminders';

    protected $description = 'Send a minimal, once-per-activity email reminder for due work';

    public function handle(): int
    {
        if (! config('services.reminders.enabled')) {
            $this->info('Email reminders are disabled.');

            return self::SUCCESS;
        }
        $sent = 0;
        WorkItem::whereNull('reminded_at')->whereNotNull('assigned_to')->whereNotIn('status', ['Completed', 'Cancelled'])->where('due_at', '<=', now()->addHour())->orderBy('id')->chunkById(50, function ($items) use (&$sent) {
            foreach ($items as $item) {
                $u = User::where('bureau_id', $item->bureau_id)->where('active', true)->find($item->assigned_to);
                if (! $u || ! Bureau::whereKey($item->bureau_id)->where('status', 'active')->exists()) {
                    continue;
                }
                try {
                    Mail::raw('You have an activity due in your private Rishtahub workspace. Sign in to review the details: '.url('/app/'.($item->kind === 'meeting' ? 'meetings' : 'followups')), fn ($m) => $m->to($u->email)->subject('A follow-up from your Rishtahub workspace'));
                    $item->update(['reminded_at' => now()]);
                    $sent++;
                } catch (\Throwable $e) {
                    report($e);
                    $this->error('Could not deliver reminder for activity #'.$item->id.'. It will be retried.');
                }
            }
        });
        $this->info($sent.' reminders sent.');

        return self::SUCCESS;
    }
}
