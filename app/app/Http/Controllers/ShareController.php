<?php

namespace App\Http\Controllers;

use App\Models\Bureau;
use App\Models\Profile;
use App\Models\Proposal;
use App\Models\ShareLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ShareController extends Controller
{
    private function link(string $token, bool $unlock = true): ShareLink
    {
        abort_unless(preg_match('/^[a-f0-9]{64}$/', $token), 404);
        $l = ShareLink::where('token_hash', hash('sha256', $token))->whereNull('revoked_at')->where('expires_at', '>', now())->firstOrFail();
        abort_unless(Bureau::whereKey($l->bureau_id)->where('status', 'active')->exists(), 404);
        if ($l->kind === 'edit') {
            abort_unless(Profile::where('bureau_id', $l->bureau_id)->whereKey($l->profile_id)->exists(), 404);
        } else {
            $p = Proposal::where('bureau_id', $l->bureau_id)->findOrFail($l->proposal_id);
            abort_unless(Profile::where('bureau_id', $l->bureau_id)->whereKey($p->profile_id)->exists(), 404);
        }
        if ($unlock && $l->password) {
            abort_unless(session('share.'.$l->id) === true, 423, 'This proposal is password protected.');
        }

        return $l;
    }

    private function audit(ShareLink $l, string $action, string $description): void
    {
        DB::table('activities')->insert(['bureau_id' => $l->bureau_id, 'action' => $action, 'description' => $description, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function unlock(Request $r, string $token)
    {
        $r->validate(['password' => 'required|string|max:100']);
        $l = $this->link($token, false);
        abort_unless(! $l->password || Hash::check($r->password, $l->password), 422, 'Incorrect password.');
        $r->session()->put('share.'.$l->id, true);

        return ['ok' => true];
    }

    public function show(string $token)
    {
        $l = $this->link($token);
        $b = Bureau::findOrFail($l->bureau_id);
        $ids = $l->kind === 'edit' ? [$l->profile_id] : DB::table('proposal_profiles')->where('proposal_id', $l->proposal_id)->pluck('profile_id');
        $profiles = Profile::where('bureau_id', $l->bureau_id)->whereIn('id', $ids)->get()->map(function ($p) use ($l, $token) {
            $out = ['id' => $p->id];
            foreach ($l->fields as $f) {
                if (in_array($f, ['name', 'city', 'country', 'profession', 'education', 'marital_status', 'religion', 'sect', 'phone'])) {
                    $out[$f] = $p->$f;
                }
                if ($f === 'dob') {
                    $out['age'] = $p->dob?->age;
                }
                if ($f === 'family') {
                    $out['family'] = array_intersect_key($p->details ?? [], array_flip(['father', 'mother', 'siblings', 'family_city', 'family_background']));
                }
                if ($f === 'preferences') {
                    $out['preferences'] = $p->preferences;
                }
            }
            if ($l->photos) {
                $out['photos'] = DB::table('profile_files')->where('bureau_id', $l->bureau_id)->where('profile_id', $p->id)->where('kind', 'photo')->pluck('id')->map(fn ($id) => url('/api/share/'.$token.'/photos/'.$id));
            }
            if ($l->kind === 'proposal') {
                $out['response'] = DB::table('proposal_profiles')->where('proposal_id', $l->proposal_id)->where('profile_id', $p->id)->value('response');
            }

            return $out;
        });
        $l->increment('views');
        if ($l->proposal_id) {
            Proposal::whereKey($l->proposal_id)->where('status', 'Shared')->update(['status' => 'Viewed']);
        }
        $this->audit($l, 'share-view', 'Family viewed shared '.$l->kind.' link #'.$l->id);

        return response()->json(['bureau' => $b->name, 'kind' => $l->kind, 'expires_at' => $l->expires_at, 'profiles' => $profiles])->header('Cache-Control', 'no-store');
    }

    public function response(Request $r, string $token)
    {
        $l = $this->link($token);
        abort_unless($l->kind === 'proposal', 404);
        $v = $r->validate(['profile_id' => 'required|integer', 'response' => ['required', Rule::in(['Interested', 'Consider Later', 'Not Interested'])], 'message' => 'nullable|string|max:2000']);
        abort_unless(Profile::where('bureau_id', $l->bureau_id)->whereKey($v['profile_id'])->exists(), 404);
        $row = DB::table('proposal_profiles')->where('proposal_id', $l->proposal_id)->where('profile_id', $v['profile_id']);
        abort_unless((clone $row)->exists(), 404);
        $row->update(['response' => $v['response'], 'message' => $v['message'] ?? null, 'responded_at' => now()]);
        $responses = DB::table('proposal_profiles')->where('proposal_id', $l->proposal_id)->pluck('response');
        $status = $responses->contains('Interested') ? 'Interested' : ($responses->every(fn ($x) => $x === 'Not Interested') ? 'Not Interested' : 'Viewed');
        Proposal::whereKey($l->proposal_id)->whereNotIn('status', ['Closed', 'Meeting Planned'])->update(['status' => $status]);
        $this->audit($l, 'response', 'Family response: '.$v['response'].' for profile #'.$v['profile_id']);

        return ['ok' => true];
    }

    public function edit(Request $r, string $token)
    {
        $l = $this->link($token);
        abort_unless($l->kind === 'edit', 404);
        $v = $r->validate(['name' => 'sometimes|required|string|max:120', 'city' => 'sometimes|required|string|max:100', 'profession' => 'sometimes|nullable|string|max:120', 'education' => 'sometimes|nullable|string|max:120', 'phone' => 'sometimes|nullable|string|max:30']);
        $v = array_intersect_key($v, array_flip($l->fields));
        abort_if(! $v, 422, 'No permitted changes were provided.');
        DB::table('edit_requests')->insert(['bureau_id' => $l->bureau_id, 'profile_id' => $l->profile_id, 'data' => json_encode($v), 'status' => 'Pending', 'created_at' => now(), 'updated_at' => now()]);
        $this->audit($l, 'family-edit', 'Family submitted corrections for review');

        return ['ok' => true];
    }

    public function photo(string $token, int $id)
    {
        $l = $this->link($token);
        abort_unless($l->photos, 404);
        $ids = $l->kind === 'edit' ? [$l->profile_id] : DB::table('proposal_profiles')->where('proposal_id', $l->proposal_id)->pluck('profile_id');
        $f = DB::table('profile_files')->where('bureau_id', $l->bureau_id)->whereIn('profile_id', $ids)->where('kind', 'photo')->where('id', $id)->first();
        abort_unless($f, 404);
        abort_unless(Profile::where('bureau_id',$l->bureau_id)->whereKey($f->profile_id)->exists(),404);

        return Storage::disk('local')->response($f->path,null,['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
