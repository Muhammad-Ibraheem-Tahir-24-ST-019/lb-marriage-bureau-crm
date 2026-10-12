<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('rishtahub:reminders')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('auth:clear-resets')->daily();
