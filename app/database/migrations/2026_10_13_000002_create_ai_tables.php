<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('openai'); // openai, anthropic, ollama, custom
            $table->text('api_key')->nullable();
            $table->string('api_url')->nullable();
            $table->string('model')->default('gpt-4o-mini');
            $table->boolean('is_active')->default(true);
            $table->integer('max_tokens')->default(4096);
            $table->float('temperature')->default(0.7);
            $table->timestamps();
        });

        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->default('New Conversation');
            $table->string('context')->default('general'); // general, report, task, crm_query
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();
        });

        Schema::create('ai_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();
            $table->string('role'); // user, assistant, system, tool
            $table->longText('content')->nullable();
            $table->json('tool_calls')->nullable();
            $table->json('tool_results')->nullable();
            $table->integer('tokens_used')->nullable();
            $table->string('model_used')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('ai_task_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained('ai_conversations')->nullOnDelete();
            $table->string('action'); // action name like create_profile, generate_report, etc.
            $table->text('description')->nullable();
            $table->json('input_data')->nullable();
            $table->json('output_data')->nullable();
            $table->string('status')->default('pending'); // success, failed, pending
            $table->text('error')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_task_logs');
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
        Schema::dropIfExists('ai_settings');
    }
};
