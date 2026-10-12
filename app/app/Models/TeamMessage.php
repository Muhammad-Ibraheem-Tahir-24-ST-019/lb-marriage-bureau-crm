<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamMessage extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'channel',
        'content',
        'reply_to',
        'is_announcement',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_announcement' => 'boolean',
        ];
    }

    /**
     * The sender of the team message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The parent message if this message is a reply.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(TeamMessage::class, 'reply_to');
    }

    /**
     * Threaded replies to this message.
     */
    public function replies(): HasMany
    {
        return $this->hasMany(TeamMessage::class, 'reply_to');
    }
}
