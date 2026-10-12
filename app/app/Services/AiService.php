<?php

namespace App\Services;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiSetting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiService
{
    public function __construct(
        protected AiToolService $toolService
    ) {}

    /**
     * Get active AI settings.
     */
    public function getSettings(): ?AiSetting
    {
        return AiSetting::where('is_active', true)->first();
    }

    /**
     * Send a chat message and get AI response, handling function/tool calls.
     *
     * @return array{message: array, conversation_id: int, title: string, tokens_used: int}
     */
    public function chat(AiConversation $conversation, string $userMessage, ?int $userId = null): array
    {
        $userId = $userId ?? $conversation->user_id ?? auth()->id() ?? 1;
        $settings = $this->getSettings();

        if (!$settings) {
            $fallbackContent = "AI service is currently not configured or disabled. Please configure your AI settings in the Admin panel.";
            $msg = AiMessage::create([
                'conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $fallbackContent,
                'tokens_used' => 0,
                'model_used' => 'none',
            ]);

            return [
                'message' => [
                    'id' => $msg->id,
                    'role' => 'assistant',
                    'content' => $fallbackContent,
                    'tool_calls' => null,
                ],
                'conversation_id' => $conversation->id,
                'title' => $conversation->title,
                'tokens_used' => 0,
            ];
        }

        // 1. Save user message to database
        AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $userMessage,
            'tokens_used' => 0,
            'model_used' => $settings->model,
        ]);

        // Auto-update conversation title if default or empty
        if (empty($conversation->title) || $conversation->title === 'New Conversation') {
            $conversation->title = mb_substr(trim($userMessage), 0, 50);
            $conversation->save();
        }

        // 2. Build messages array from history
        $tools = $this->getToolDefinitions();
        $history = $conversation->messages()->orderBy('id')->get();

        $messages = [];
        $messages[] = [
            'role' => 'system',
            'content' => $this->buildSystemPrompt(),
        ];

        foreach ($history as $m) {
            $entry = [
                'role' => $m->role,
                'content' => $m->content ?? '',
            ];
            if (!empty($m->tool_calls)) {
                $entry['tool_calls'] = is_string($m->tool_calls) ? json_decode($m->tool_calls, true) : $m->tool_calls;
            }
            if ($m->role === 'tool' && !empty($m->tool_results)) {
                $entry['tool_call_id'] = is_array($m->tool_results) && isset($m->tool_results['tool_call_id'])
                    ? $m->tool_results['tool_call_id']
                    : null;
            }
            $messages[] = $entry;
        }

        $totalTokens = 0;
        $maxLoops = 6;
        $loopCount = 0;
        $finalContent = '';
        $executedToolCalls = [];

        while ($loopCount < $maxLoops) {
            $loopCount++;

            $response = match (strtolower($settings->provider)) {
                'anthropic' => $this->callAnthropic($messages, $tools, $settings),
                'ollama' => $this->callOllama($messages, $tools, $settings),
                'custom' => $this->callCustom($messages, $tools, $settings),
                default => $this->callOpenAI($messages, $tools, $settings),
            };

            $totalTokens += ($response['tokens_used'] ?? 0);
            $toolCalls = $response['tool_calls'] ?? [];
            $content = $response['content'] ?? '';

            if (!empty($toolCalls)) {
                // Save assistant step with tool calls
                $assistantMsg = AiMessage::create([
                    'conversation_id' => $conversation->id,
                    'role' => 'assistant',
                    'content' => $content,
                    'tool_calls' => $toolCalls,
                    'tokens_used' => $response['tokens_used'] ?? 0,
                    'model_used' => $settings->model,
                ]);

                $messages[] = [
                    'role' => 'assistant',
                    'content' => $content,
                    'tool_calls' => $toolCalls,
                ];

                // Execute each tool
                foreach ($toolCalls as $call) {
                    $toolName = $call['function']['name'] ?? '';
                    $callId = $call['id'] ?? uniqid('call_');
                    $args = is_string($call['function']['arguments'] ?? '')
                        ? json_decode($call['function']['arguments'], true) ?? []
                        : ($call['function']['arguments'] ?? []);

                    $toolResult = $this->executeTool($toolName, $args, $userId);
                    $executedToolCalls[] = [
                        'name' => $toolName,
                        'arguments' => $args,
                        'result' => $toolResult,
                    ];

                    $toolResultJson = json_encode($toolResult);

                    AiMessage::create([
                        'conversation_id' => $conversation->id,
                        'role' => 'tool',
                        'content' => $toolResultJson,
                        'tool_results' => [
                            'tool_call_id' => $callId,
                            'name' => $toolName,
                            'result' => $toolResult,
                        ],
                        'tokens_used' => 0,
                        'model_used' => $settings->model,
                    ]);

                    $messages[] = [
                        'role' => 'tool',
                        'tool_call_id' => $callId,
                        'content' => $toolResultJson,
                    ];
                }

                // Continue loop with new messages
                continue;
            }

            // No tool calls - final answer reached
            $finalContent = $content;
            break;
        }

        if (empty($finalContent) && !empty($executedToolCalls)) {
            $finalContent = "Operation completed successfully.";
        }

        $savedAssistantMessage = AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $finalContent,
            'tool_calls' => !empty($executedToolCalls) ? $executedToolCalls : null,
            'tokens_used' => $totalTokens,
            'model_used' => $settings->model,
        ]);

        $conversation->touch();

        return [
            'message' => [
                'id' => $savedAssistantMessage->id,
                'role' => 'assistant',
                'content' => $finalContent,
                'tool_calls' => !empty($executedToolCalls) ? $executedToolCalls : null,
            ],
            'conversation_id' => $conversation->id,
            'title' => $conversation->title,
            'tokens_used' => $totalTokens,
        ];
    }

    /**
     * Build the system prompt.
     */
    protected function buildSystemPrompt(): string
    {
        $now = Carbon::now()->toFormattedDateString() . ' ' . Carbon::now()->toTimeString();

        return <<<PROMPT
You are the intelligent AI assistant for LB Marriage Bureau CRM — an executive matchmaking and matrimonial management CRM system.
Today is {$now}.

Your purpose is to assist marriage bureau staff and administrators in managing candidate profiles, proposing matches, handling client follow-ups, viewing CRM analytics, and writing clear, respectful summaries.

Key instructions:
1. Always maintain complete confidentiality and professionalism with matrimonial data.
2. When answering questions regarding profiles, proposals, or tasks, use the appropriate tool to fetch or modify data.
3. Keep responses helpful, concise, well-structured, and factual.
4. If asked to search, query, update, create profiles, check matches, or create tasks, call the relevant tool immediately.
5. After executing a tool, summarize the outcome in a friendly, professional manner.
PROMPT;
    }

    /**
     * Define OpenAI-compatible tool specifications.
     */
    protected function getToolDefinitions(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'search_profiles',
                    'description' => 'Search matrimonial profiles by name, city, gender, age, profession, status, or keyword.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'query' => ['type' => 'string', 'description' => 'General search term (name, city, profession)'],
                            'name' => ['type' => 'string', 'description' => 'Specific candidate name'],
                            'gender' => ['type' => 'string', 'enum' => ['Male', 'Female']],
                            'city' => ['type' => 'string', 'description' => 'City name'],
                            'status' => ['type' => 'string', 'enum' => ['Draft', 'Pending Review', 'Active', 'On Hold', 'Matched']],
                            'marital_status' => ['type' => 'string', 'enum' => ['Never married', 'Divorced', 'Widowed', 'Separated']],
                            'religion' => ['type' => 'string'],
                            'min_age' => ['type' => 'integer'],
                            'max_age' => ['type' => 'integer'],
                            'limit' => ['type' => 'integer', 'description' => 'Number of results to return (default 15)'],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_profile',
                    'description' => 'Retrieve complete details of a single profile by ID.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'description' => 'Profile ID'],
                        ],
                        'required' => ['id'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'create_profile',
                    'description' => 'Create a new matrimonial candidate profile in the CRM.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'name' => ['type' => 'string'],
                            'gender' => ['type' => 'string', 'enum' => ['Male', 'Female']],
                            'dob' => ['type' => 'string', 'description' => 'YYYY-MM-DD format'],
                            'city' => ['type' => 'string'],
                            'country' => ['type' => 'string', 'default' => 'Pakistan'],
                            'profession' => ['type' => 'string'],
                            'education' => ['type' => 'string'],
                            'status' => ['type' => 'string', 'enum' => ['Draft', 'Pending Review', 'Active', 'On Hold', 'Matched']],
                            'marital_status' => ['type' => 'string'],
                            'religion' => ['type' => 'string'],
                            'phone' => ['type' => 'string'],
                            'notes' => ['type' => 'string'],
                        ],
                        'required' => ['name', 'gender', 'dob', 'city'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'update_profile',
                    'description' => 'Update fields of an existing matrimonial profile.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'description' => 'Profile ID to update'],
                            'status' => ['type' => 'string', 'enum' => ['Draft', 'Pending Review', 'Active', 'On Hold', 'Matched']],
                            'city' => ['type' => 'string'],
                            'profession' => ['type' => 'string'],
                            'phone' => ['type' => 'string'],
                            'notes' => ['type' => 'string'],
                        ],
                        'required' => ['id'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_matches',
                    'description' => 'Find matching opposite-gender candidates scored against a profile preferences.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'description' => 'Source Profile ID'],
                            'min_score' => ['type' => 'integer', 'description' => 'Minimum score threshold (0-100)'],
                            'limit' => ['type' => 'integer', 'description' => 'Maximum matches to return'],
                        ],
                        'required' => ['id'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'create_proposal',
                    'description' => 'Create a matchmaking proposal bundle with selected candidate profiles.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'profile_id' => ['type' => 'integer', 'description' => 'Client profile ID'],
                            'candidate_ids' => [
                                'type' => 'array',
                                'items' => ['type' => 'integer'],
                                'description' => 'List of candidate profile IDs to include',
                            ],
                            'title' => ['type' => 'string'],
                            'notes' => ['type' => 'string'],
                        ],
                        'required' => ['profile_id', 'candidate_ids'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'create_task',
                    'description' => 'Create a work item, meeting, or follow-up reminder.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'title' => ['type' => 'string'],
                            'due_at' => ['type' => 'string', 'description' => 'Due date and time (YYYY-MM-DD HH:MM:SS)'],
                            'kind' => ['type' => 'string', 'enum' => ['followup', 'meeting']],
                            'type' => ['type' => 'string', 'enum' => ['Call', 'WhatsApp', 'Meeting', 'Document', 'Reminder']],
                            'profile_id' => ['type' => 'integer'],
                            'notes' => ['type' => 'string'],
                        ],
                        'required' => ['title', 'due_at'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'update_task',
                    'description' => 'Update a task or meeting status/due date.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'description' => 'Task ID'],
                            'status' => ['type' => 'string', 'enum' => ['Pending', 'In progress', 'Completed', 'Cancelled', 'Proposed', 'Confirmed']],
                            'notes' => ['type' => 'string'],
                        ],
                        'required' => ['id'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_daily_report',
                    'description' => 'Get the CRM daily operations report summary.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_progress_report',
                    'description' => 'Get weekly or monthly CRM progress and conversion metrics.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'period' => ['type' => 'string', 'enum' => ['week', 'month']],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'search_notes',
                    'description' => 'Search internal CRM notes by keyword or profile ID.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'query' => ['type' => 'string'],
                            'profile_id' => ['type' => 'integer'],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_statistics',
                    'description' => 'Get overall CRM counts: profiles, proposals, tasks, staff.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_upcoming_tasks',
                    'description' => 'Get upcoming follow-ups and meetings due in next 7 days.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_overdue_items',
                    'description' => 'Get overdue follow-ups and meetings requiring attention.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
        ];
    }

    /**
     * Route tool execution to AiToolService.
     */
    protected function executeTool(string $name, array $arguments, int $userId): array
    {
        return match ($name) {
            'search_profiles' => $this->toolService->searchProfiles($arguments, $userId),
            'get_profile' => $this->toolService->getProfile($arguments, $userId),
            'create_profile' => $this->toolService->createProfile($arguments, $userId),
            'update_profile' => $this->toolService->updateProfile($arguments, $userId),
            'get_matches' => $this->toolService->getMatches($arguments, $userId),
            'create_proposal' => $this->toolService->createProposal($arguments, $userId),
            'create_task' => $this->toolService->createTask($arguments, $userId),
            'update_task' => $this->toolService->updateTask($arguments, $userId),
            'get_daily_report' => $this->toolService->getDailyReport($arguments, $userId),
            'get_progress_report' => $this->toolService->getProgressReport($arguments, $userId),
            'search_notes' => $this->toolService->searchNotes($arguments, $userId),
            'get_statistics' => $this->toolService->getStatistics($arguments, $userId),
            'get_upcoming_tasks' => $this->toolService->getUpcomingTasks($arguments, $userId),
            'get_overdue_items' => $this->toolService->getOverdueItems($arguments, $userId),
            default => ['error' => "Unknown tool: {$name}"],
        };
    }

    /**
     * Provider API call: OpenAI
     */
    protected function callOpenAI(array $messages, array $tools, AiSetting $settings): array
    {
        $url = !empty($settings->api_url) ? rtrim($settings->api_url, '/') . '/chat/completions' : 'https://api.openai.com/v1/chat/completions';

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $settings->api_key,
                'Content-Type' => 'application/json',
            ])->timeout(60)->post($url, [
                'model' => $settings->model ?: 'gpt-4o-mini',
                'messages' => $messages,
                'tools' => $tools,
                'tool_choice' => 'auto',
                'max_tokens' => $settings->max_tokens ?: 4096,
                'temperature' => (float) ($settings->temperature ?? 0.7),
            ]);

            if ($response->failed()) {
                Log::error('OpenAI API call failed', ['status' => $response->status(), 'body' => $response->body()]);
                return [
                    'content' => 'Error communicating with OpenAI: ' . $response->json('error.message', 'Unknown error'),
                    'tool_calls' => [],
                    'tokens_used' => 0,
                ];
            }

            $data = $response->json();
            $choice = $data['choices'][0]['message'] ?? [];

            return [
                'content' => $choice['content'] ?? '',
                'tool_calls' => $choice['tool_calls'] ?? [],
                'tokens_used' => $data['usage']['total_tokens'] ?? 0,
            ];
        } catch (\Throwable $e) {
            Log::error('Exception in callOpenAI: ' . $e->getMessage());
            return [
                'content' => 'Failed to reach OpenAI provider: ' . $e->getMessage(),
                'tool_calls' => [],
                'tokens_used' => 0,
            ];
        }
    }

    /**
     * Provider API call: Anthropic
     */
    protected function callAnthropic(array $messages, array $tools, AiSetting $settings): array
    {
        $url = !empty($settings->api_url) ? $settings->api_url : 'https://api.anthropic.com/v1/messages';

        // Extract system prompt
        $systemPrompt = '';
        $filteredMessages = [];

        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                $systemPrompt .= ($systemPrompt ? "\n" : '') . $msg['content'];
            } else {
                $filteredMessages[] = $msg;
            }
        }

        $anthropicMessages = $this->convertToAnthropicFormat($filteredMessages);
        $anthropicTools = $this->convertToolsToAnthropicFormat($tools);

        try {
            $payload = [
                'model' => $settings->model ?: 'claude-3-5-sonnet-20241022',
                'messages' => $anthropicMessages,
                'max_tokens' => $settings->max_tokens ?: 4096,
                'temperature' => (float) ($settings->temperature ?? 0.7),
            ];

            if (!empty($systemPrompt)) {
                $payload['system'] = $systemPrompt;
            }

            if (!empty($anthropicTools)) {
                $payload['tools'] = $anthropicTools;
            }

            $response = Http::withHeaders([
                'x-api-key' => $settings->api_key,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->timeout(60)->post($url, $payload);

            if ($response->failed()) {
                Log::error('Anthropic API call failed', ['status' => $response->status(), 'body' => $response->body()]);
                return [
                    'content' => 'Error communicating with Anthropic: ' . $response->json('error.message', 'Unknown error'),
                    'tool_calls' => [],
                    'tokens_used' => 0,
                ];
            }

            $data = $response->json();
            $contentBlocks = $data['content'] ?? [];

            $textParts = [];
            $toolCalls = [];

            foreach ($contentBlocks as $block) {
                if ($block['type'] === 'text') {
                    $textParts[] = $block['text'];
                } elseif ($block['type'] === 'tool_use') {
                    $toolCalls[] = [
                        'id' => $block['id'] ?? uniqid('tool_'),
                        'type' => 'function',
                        'function' => [
                            'name' => $block['name'],
                            'arguments' => json_encode($block['input'] ?? []),
                        ],
                    ];
                }
            }

            $tokensUsed = ($data['usage']['input_tokens'] ?? 0) + ($data['usage']['output_tokens'] ?? 0);

            return [
                'content' => implode("\n", $textParts),
                'tool_calls' => $toolCalls,
                'tokens_used' => $tokensUsed,
            ];
        } catch (\Throwable $e) {
            Log::error('Exception in callAnthropic: ' . $e->getMessage());
            return [
                'content' => 'Failed to reach Anthropic provider: ' . $e->getMessage(),
                'tool_calls' => [],
                'tokens_used' => 0,
            ];
        }
    }

    /**
     * Provider API call: Ollama
     */
    protected function callOllama(array $messages, array $tools, AiSetting $settings): array
    {
        $baseUrl = !empty($settings->api_url) ? rtrim($settings->api_url, '/') : 'http://localhost:11434';
        $url = $baseUrl . '/api/chat';

        try {
            $response = Http::timeout(60)->post($url, [
                'model' => $settings->model ?: 'llama3',
                'messages' => $messages,
                'tools' => $tools,
                'stream' => false,
            ]);

            if ($response->failed()) {
                Log::error('Ollama API call failed', ['status' => $response->status(), 'body' => $response->body()]);
                return [
                    'content' => 'Error communicating with Ollama: ' . $response->body(),
                    'tool_calls' => [],
                    'tokens_used' => 0,
                ];
            }

            $data = $response->json();
            $msg = $data['message'] ?? [];

            $toolCalls = [];
            if (!empty($msg['tool_calls'])) {
                foreach ($msg['tool_calls'] as $tc) {
                    $toolCalls[] = [
                        'id' => uniqid('ollama_'),
                        'type' => 'function',
                        'function' => [
                            'name' => $tc['function']['name'] ?? '',
                            'arguments' => json_encode($tc['function']['arguments'] ?? []),
                        ],
                    ];
                }
            }

            return [
                'content' => $msg['content'] ?? '',
                'tool_calls' => $toolCalls,
                'tokens_used' => ($data['prompt_eval_count'] ?? 0) + ($data['eval_count'] ?? 0),
            ];
        } catch (\Throwable $e) {
            Log::error('Exception in callOllama: ' . $e->getMessage());
            return [
                'content' => 'Failed to reach Ollama provider: ' . $e->getMessage(),
                'tool_calls' => [],
                'tokens_used' => 0,
            ];
        }
    }

    /**
     * Provider API call: Custom (OpenAI-compatible)
     */
    protected function callCustom(array $messages, array $tools, AiSetting $settings): array
    {
        return $this->callOpenAI($messages, $tools, $settings);
    }

    /**
     * Convert OpenAI messages array to Anthropic format.
     */
    protected function convertToAnthropicFormat(array $messages): array
    {
        $anthropicMessages = [];

        foreach ($messages as $msg) {
            $role = $msg['role'];

            if ($role === 'tool') {
                $anthropicMessages[] = [
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'tool_result',
                            'tool_use_id' => $msg['tool_call_id'] ?? '',
                            'content' => $msg['content'] ?? '',
                        ],
                    ],
                ];
                continue;
            }

            if ($role === 'assistant' && !empty($msg['tool_calls'])) {
                $contentBlocks = [];
                if (!empty($msg['content'])) {
                    $contentBlocks[] = [
                        'type' => 'text',
                        'text' => $msg['content'],
                    ];
                }
                foreach ($msg['tool_calls'] as $tc) {
                    $args = is_string($tc['function']['arguments'] ?? '')
                        ? json_decode($tc['function']['arguments'], true) ?? []
                        : ($tc['function']['arguments'] ?? []);

                    $contentBlocks[] = [
                        'type' => 'tool_use',
                        'id' => $tc['id'] ?? uniqid('tu_'),
                        'name' => $tc['function']['name'] ?? '',
                        'input' => $args,
                    ];
                }
                $anthropicMessages[] = [
                    'role' => 'assistant',
                    'content' => $contentBlocks,
                ];
                continue;
            }

            $anthropicMessages[] = [
                'role' => $role === 'assistant' ? 'assistant' : 'user',
                'content' => $msg['content'] ?? '',
            ];
        }

        return $anthropicMessages;
    }

    /**
     * Convert OpenAI tool definitions to Anthropic format.
     */
    protected function convertToolsToAnthropicFormat(array $tools): array
    {
        $anthropicTools = [];

        foreach ($tools as $tool) {
            $fn = $tool['function'] ?? [];
            $anthropicTools[] = [
                'name' => $fn['name'] ?? '',
                'description' => $fn['description'] ?? '',
                'input_schema' => $fn['parameters'] ?? [
                    'type' => 'object',
                    'properties' => (object)[],
                ],
            ];
        }

        return $anthropicTools;
    }
}
