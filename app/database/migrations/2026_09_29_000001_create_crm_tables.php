<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bureaus', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->string('status')->default('active');
            $t->json('settings')->nullable();
            $t->timestamps();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->foreignId('bureau_id')->nullable()->constrained();
            $t->string('role')->default('owner');
            $t->boolean('active')->default(true);
        });
        Schema::create('profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->string('name');
            $t->string('gender');
            $t->date('dob')->nullable();
            $t->string('city');
            $t->string('country')->default('Pakistan');
            $t->string('profession')->nullable();
            $t->string('education')->nullable();
            $t->string('status')->default('Active');
            $t->string('marital_status')->default('Never married');
            $t->string('religion')->nullable();
            $t->string('sect')->nullable();
            $t->string('phone')->nullable();
            $t->text('notes')->nullable();
            $t->json('details')->nullable();
            $t->json('preferences')->nullable();
            $t->json('tags')->nullable();
            $t->timestamp('consented_at')->nullable();
            $t->foreignId('assigned_to')->nullable()->constrained('users');
            $t->timestamps();
            $t->softDeletes();
            $t->index(['bureau_id', 'status']);
            $t->index(['bureau_id', 'gender', 'city']);
        });
        Schema::create('profile_files', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->foreignId('profile_id')->constrained()->cascadeOnDelete();
            $t->string('path');
            $t->string('name');
            $t->string('mime');
            $t->string('kind');
            $t->timestamps();
        });
        Schema::create('proposals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->foreignId('profile_id')->constrained();
            $t->string('title');
            $t->string('status')->default('Draft');
            $t->text('notes')->nullable();
            $t->timestamps();
        });
        Schema::create('proposal_profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('proposal_id')->constrained()->cascadeOnDelete();
            $t->foreignId('profile_id')->constrained();
            $t->string('response')->nullable();
            $t->text('message')->nullable();
            $t->timestamp('responded_at')->nullable();
            $t->unique(['proposal_id', 'profile_id']);
        });
        Schema::create('share_links', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->foreignId('proposal_id')->nullable()->constrained();
            $t->foreignId('profile_id')->nullable()->constrained();
            $t->string('kind')->default('proposal');
            $t->string('token_hash', 64)->unique();
            $t->string('password')->nullable();
            $t->json('fields');
            $t->boolean('photos')->default(false);
            $t->timestamp('expires_at');
            $t->timestamp('revoked_at')->nullable();
            $t->unsignedInteger('views')->default(0);
            $t->timestamps();
        });
        Schema::create('work_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->string('kind');
            $t->string('title');
            $t->foreignId('profile_id')->nullable()->constrained();
            $t->foreignId('assigned_to')->nullable()->constrained('users');
            $t->string('status')->default('Pending');
            $t->string('type')->default('Call');
            $t->dateTime('due_at');
            $t->text('notes')->nullable();
            $t->string('location')->nullable();
            $t->timestamps();
            $t->index(['bureau_id', 'kind', 'due_at']);
        });
        Schema::create('activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->foreignId('user_id')->nullable()->constrained();
            $t->foreignId('profile_id')->nullable()->constrained();
            $t->string('action');
            $t->text('description');
            $t->timestamps();
        });
        Schema::create('edit_requests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->foreignId('profile_id')->constrained();
            $t->json('data');
            $t->string('status')->default('Pending');
            $t->timestamps();
        });
        Schema::create('introductions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->foreignId('target_bureau_id')->constrained('bureaus');
            $t->foreignId('profile_id')->constrained();
            $t->string('status')->default('Pending');
            $t->text('message')->nullable();
            $t->timestamps();
        });
        Schema::create('staff_invites', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->string('email');
            $t->string('role');
            $t->string('token_hash', 64)->unique();
            $t->timestamp('expires_at');
            $t->timestamp('accepted_at')->nullable();
            $t->timestamps();
        });
        Schema::create('match_decisions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bureau_id')->constrained();
            $t->foreignId('profile_id')->constrained();
            $t->foreignId('candidate_id')->constrained('profiles');
            $t->string('decision');
            $t->text('note')->nullable();
            $t->timestamps();
            $t->unique(['profile_id', 'candidate_id']);
        });
    }

    public function down(): void
    {
        foreach (['match_decisions', 'staff_invites', 'introductions', 'edit_requests', 'activities', 'work_items', 'share_links', 'proposal_profiles', 'proposals', 'profile_files', 'profiles'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', function (Blueprint $t) {
            $t->dropConstrainedForeignId('bureau_id');
            $t->dropColumn(['role', 'active']);
        });
        Schema::dropIfExists('bureaus');
    }
};
