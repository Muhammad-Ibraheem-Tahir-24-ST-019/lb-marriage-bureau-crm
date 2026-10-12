<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShareLink extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['password', 'token_hash'];

    protected function casts(): array
    {
        return ['fields' => 'array', 'photos' => 'boolean', 'expires_at' => 'datetime', 'revoked_at' => 'datetime'];
    }
}
