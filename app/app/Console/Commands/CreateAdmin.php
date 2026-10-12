<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdmin extends Command
{
    protected $signature = 'rishtahub:admin {email} {--name=Platform Administrator}';

    protected $description = 'Create a platform administrator without access to private biodata';

    public function handle(): int
    {
        $email = $this->argument('email');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || User::where('email', $email)->exists()) {
            $this->error('Provide an unused valid email address.');

            return self::FAILURE;
        }
        $password = $this->secret('New password (12+ characters, letters and numbers)');
        if (strlen($password ?? '') < 12 || ! preg_match('/[a-zA-Z]/', $password) || ! preg_match('/[0-9]/', $password)) {
            $this->error('The password does not meet the minimum requirements.');

            return self::FAILURE;
        }
        $u = new User;
        $u->name = $this->option('name');
        $u->email = $email;
        $u->password = Hash::make($password);
        $u->role = 'superadmin';
        $u->active = true;
        $u->save();
        $this->info('Platform administrator created.');

        return self::SUCCESS;
    }
}
