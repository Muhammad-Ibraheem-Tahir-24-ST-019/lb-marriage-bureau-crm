<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// Stub fallback if laravel/sanctum is not yet installed in vendor
if (!trait_exists(HasApiTokens::class)) {
    eval('namespace Laravel\Sanctum; trait HasApiTokens {}');
}

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Default model attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'active' => true,
        'role' => 'employee',
        'can_use_ai' => false,
        'bureau_id' => 1,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'bureau_id',
        'role',
        'active',
        'can_use_ai',
        'avatar',
        'phone',
        'last_login_at',
        'invite_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'invite_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'can_use_ai' => 'boolean',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * The bureau this user belongs to.
     */
    public function bureau(): BelongsTo
    {
        return $this->belongsTo(Bureau::class);
    }

    /**
     * AI conversations initiated by this user.
     */
    public function aiConversations(): HasMany
    {
        return $this->hasMany(AiConversation::class);
    }

    /**
     * AI task logs triggered by this user.
     */
    public function aiTaskLogs(): HasMany
    {
        return $this->hasMany(AiTaskLog::class);
    }

    /**
     * Notes created by this user.
     */
    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    /**
     * Team messages sent by this user.
     */
    public function teamMessages(): HasMany
    {
        return $this->hasMany(TeamMessage::class);
    }

    /**
     * Notifications sent to this user.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Determine if the user has an admin role.
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'superadmin', 'owner'], true);
    }

    /**
     * Determine if the user is a manager.
     */
    public function isManager(): bool
    {
        return $this->role === 'manager';
    }

    /**
     * Determine if the user is an employee.
     */
    public function isEmployee(): bool
    {
        return in_array($this->role, ['employee', 'staff', 'readonly'], true);
    }

    /**
     * Determine if the user is allowed to access AI features.
     */
    public function canUseAi(): bool
    {
        return (bool) $this->can_use_ai;
    }

    /**
     * Check if the user's role meets or exceeds a minimum role level in the hierarchy.
     */
    public function hasMinRole(string $role): bool
    {
        $hierarchy = [
            'admin' => 3,
            'superadmin' => 3,
            'owner' => 3,
            'manager' => 2,
            'employee' => 1,
            'staff' => 1,
            'readonly' => 1,
        ];

        $currentLevel = $hierarchy[$this->role] ?? 0;
        $requiredLevel = $hierarchy[$role] ?? 1;

        return $currentLevel >= $requiredLevel;
    }
}
