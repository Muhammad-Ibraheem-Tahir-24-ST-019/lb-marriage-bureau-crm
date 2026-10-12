<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add new columns to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'can_use_ai')) {
                $table->boolean('can_use_ai')->default(false);
            }
            if (!Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar')->nullable();
            }
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable();
            }
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable();
            }
            if (!Schema::hasColumn('users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable();
            }
            if (!Schema::hasColumn('users', 'invite_token')) {
                $table->string('invite_token')->nullable();
            }
        });

        // 2. Ensure default LB Marriage Bureau record exists in bureaus table
        if (Schema::hasTable('bureaus')) {
            if (DB::table('bureaus')->where('id', 1)->doesntExist()) {
                DB::table('bureaus')->insert([
                    'id' => 1,
                    'name' => 'LB Marriage Bureau',
                    'slug' => 'lb-marriage-bureau',
                    'status' => 'active',
                    'settings' => json_encode([
                        'title' => 'LB Marriage Bureau CRM',
                        'currency' => 'PKR',
                        'timezone' => 'Asia/Karachi',
                        'phone' => '',
                        'email' => 'info@lbmarriagebureau.com',
                        'address' => '',
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 3. Ensure all existing users belong to the default bureau
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'bureau_id')) {
            DB::table('users')->whereNull('bureau_id')->update(['bureau_id' => 1]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = ['can_use_ai', 'avatar', 'phone', 'last_login_at', 'invite_token'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
