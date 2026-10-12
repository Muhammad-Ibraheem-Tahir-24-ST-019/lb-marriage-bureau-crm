<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Profile extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['details' => 'array', 'preferences' => 'array', 'tags' => 'array', 'dob' => 'date:Y-m-d', 'consented_at' => 'datetime'];
    }
}
