<?php

namespace App\Http\Controllers;

use App\Models\Bureau;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function index()
    {
        abort_unless(auth()->user()->role === 'superadmin', 403);

        return ['inquiries' => DB::table('inquiries')->latest()->limit(100)->get(), 'bureaus' => Bureau::select('id', 'name', 'slug', 'status', 'created_at')->get(), 'counts' => ['profiles' => DB::table('profiles')->count(), 'users' => DB::table('users')->count()]];
    }

    public function update(Request $r, int $id)
    {
        abort_unless(auth()->user()->role === 'superadmin', 403);
        $v = $r->validate(['status' => ['required', Rule::in(['active', 'suspended'])]]);
        Bureau::findOrFail($id)->update($v);
        DB::table('activities')->insert(['bureau_id' => $id, 'user_id' => auth()->id(), 'action' => 'platform', 'description' => 'Platform administrator set bureau '.$v['status'], 'created_at' => now(), 'updated_at' => now()]);

        return ['ok' => true];
    }
}
