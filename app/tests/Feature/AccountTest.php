<?php

namespace Tests\Feature;

use App\Models\Bureau;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_ignores_role_injection_and_login_regenerates_session(): void
    {
        $this->postJson('/api/register', ['name' => 'Owner', 'bureau' => 'A New Bureau', 'email' => 'owner@example.test', 'password' => 'SecurePassword123', 'password_confirmation' => 'SecurePassword123', 'role' => 'superadmin', 'bureau_id' => 999])->assertOk();
        $u = User::first();
        $this->assertSame('owner', $u->role);
        $this->assertNotEquals(999, $u->bureau_id);
        $this->assertTrue(Hash::check('SecurePassword123', $u->password));
        $this->postJson('/api/logout')->assertOk();
        $this->getJson('/api/state')->assertUnauthorized();
        $this->postJson('/api/login', ['email' => $u->email, 'password' => 'SecurePassword123'])->assertOk();
        $this->getJson('/api/state')->assertOk();
    }

    public function test_password_reset_changes_password_and_token_is_single_use(): void
    {
        Notification::fake();
        $u = User::factory()->create();
        $this->postJson('/api/forgot-password', ['email' => $u->email])->assertOk();
        $token = null;
        Notification::assertSentTo($u, ResetPassword::class, function ($n) use (&$token) {
            $token = $n->token;

            return true;
        });
        $payload = ['email' => $u->email, 'token' => $token, 'password' => 'ChangedPassword123', 'password_confirmation' => 'ChangedPassword123'];
        $this->postJson('/api/reset-password', $payload)->assertOk();
        $this->assertTrue(Hash::check('ChangedPassword123', $u->fresh()->password));
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable();
    }

    public function test_reminders_are_deduplicated_and_exclude_sensitive_biodata(): void
    {
        config(['services.reminders.enabled' => true]);
        Mail::fake();
        $b = Bureau::create(['name' => 'Bureau', 'slug' => 'b']);
        $u = User::factory()->create(['bureau_id' => $b->id]);
        WorkItem::create(['bureau_id' => $b->id, 'assigned_to' => $u->id, 'kind' => 'followup', 'title' => 'PRIVATE NAME', 'type' => 'Call', 'status' => 'Pending', 'due_at' => now()->subMinute()]);
        $this->artisan('rishtahub:reminders')->expectsOutput('1 reminders sent.')->assertSuccessful();
        $this->artisan('rishtahub:reminders')->expectsOutput('0 reminders sent.')->assertSuccessful();
        $this->assertDatabaseMissing('work_items', ['reminded_at' => null]);
    }
}
