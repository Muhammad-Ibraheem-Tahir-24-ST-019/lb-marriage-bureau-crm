<?php

namespace App\Http\Controllers;

use App\Models\AiSetting;
use App\Models\Bureau;
use App\Models\Notification;
use App\Models\Profile;
use App\Models\Proposal;
use App\Models\ShareLink;
use App\Models\User;
use App\Models\WorkItem;
use App\Services\Matcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class CrmController extends Controller
{
    private function tenant(): int
    {
        abort_if(auth()->user()->role === 'superadmin', 403);

        return auth()->user()->bureau_id;
    }

    private function write(): void
    {
        $this->tenant();
        abort_unless(in_array(auth()->user()->role, ['owner', 'manager', 'staff']), 403, 'Your role cannot make changes.');
    }

    private function owner(): void
    {
        $this->tenant();
        abort_unless(auth()->user()->role === 'owner', 403, 'Only the bureau owner can do this.');
    }

    private function profile(int $id): Profile
    {
        return Profile::where('bureau_id', $this->tenant())->findOrFail($id);
    }

    private function log(string $action, string $description, ?int $profile = null): void
    {
        DB::table('activities')->insert(['bureau_id' => $this->tenant(), 'user_id' => auth()->id(), 'profile_id' => $profile, 'action' => $action, 'description' => $description, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function state()
    {
        $b = $this->tenant();
        $profiles = Profile::where('bureau_id', $b)->orderByDesc('created_at')->get()->map(fn ($p) => $p->only(['id', 'name', 'gender', 'dob', 'city', 'country', 'profession', 'education', 'status', 'marital_status', 'religion', 'sect', 'tags', 'preferences', 'created_at', 'updated_at']));
        $proposals = Proposal::where('bureau_id', $b)->latest()->get();
        $items = DB::table('proposal_profiles')->whereIn('proposal_id', $proposals->pluck('id'))->get();
        $links = ShareLink::where('bureau_id', $b)->get();
        foreach ($proposals as $p) {
            $p->candidates = $items->where('proposal_id', $p->id)->values();
            $p->links = $links->where('proposal_id', $p->id)->values();
        }

        $user = auth()->user();
        $notificationsCount = Notification::where('user_id', $user->id)->whereNull('read_at')->count();
        $canUseAi = (bool) ($user->can_use_ai ?? (method_exists($user, 'canUseAi') ? $user->canUseAi() : false));
        $aiConfigured = AiSetting::where('is_active', true)->exists();

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'role']), 'bureau' => Bureau::findOrFail($b),
            'notifications_count' => $notificationsCount,
            'can_use_ai' => $canUseAi,
            'ai_configured' => $aiConfigured,
            'profiles' => $profiles, 'proposals' => $proposals, 'work' => WorkItem::where('bureau_id', $b)->orderBy('due_at')->get(),
            'staff' => User::where('bureau_id', $b)->get(['id', 'name', 'email', 'role', 'active']),
            'activities' => DB::table('activities')->where('bureau_id', $b)->latest()->limit(100)->get(),
            'edits' => DB::table('edit_requests')->where('bureau_id', $b)->where('status', 'Pending')->get(),
            'archived' => Profile::onlyTrashed()->where('bureau_id', $b)->get(['id', 'name', 'city', 'deleted_at']),
        ]);
    }

    public function showProfile(int $id)
    {
        $p = $this->profile($id);
        $this->log('view', 'Viewed profile #'.$id, $id);
        $p->files = DB::table('profile_files')->where('profile_id', $id)->where('bureau_id', $this->tenant())->get(['id', 'name', 'kind', 'mime']);
        $p->links = ShareLink::where('bureau_id', $this->tenant())->where('profile_id', $id)->get();

        return $p;
    }

    public function saveProfile(Request $r, ?int $id = null)
    {
        $this->write();
        $p = $id ? $this->profile($id) : new Profile;
        $v = $r->validate([
            'name' => 'required|string|max:120', 'gender' => ['required', Rule::in(['Female', 'Male'])],
            'dob' => 'required|date|before_or_equal:'.now()->subYears(18)->toDateString().'|after:'.now()->subYears(100)->toDateString(),
            'city' => 'required|string|max:100', 'country' => 'required|string|max:100', 'profession' => 'nullable|string|max:120', 'education' => 'nullable|string|max:120',
            'status' => ['required', Rule::in(['Draft', 'Pending Review', 'Active', 'On Hold', 'Matched'])],
            'marital_status' => ['required', Rule::in(['Never married', 'Divorced', 'Widowed', 'Separated'])],
            'religion' => 'nullable|string|max:80', 'sect' => 'nullable|string|max:80', 'phone' => 'nullable|string|max:30', 'notes' => 'nullable|string|max:10000',
            'tags' => 'array|max:15', 'tags.*' => 'string|max:40', 'consent' => 'accepted',
            'details' => 'nullable|array:height,weight,income,language,community,nationality,father,mother,siblings,family_city,family_background,lifestyle,address',
            'details.*' => 'nullable|string|max:2000',
            'preferences' => 'nullable|array:age_min,age_max,city,education,religion,marital_status,profession,income,notes',
            'preferences.age_min' => 'nullable|integer|min:18|max:100', 'preferences.age_max' => 'nullable|integer|min:18|max:100',
            'preferences.city' => 'nullable|string|max:100', 'preferences.education' => 'nullable|string|max:120', 'preferences.religion' => 'nullable|string|max:80',
            'preferences.marital_status' => 'nullable|string|max:40', 'preferences.profession' => 'nullable|string|max:120', 'preferences.income' => 'nullable|string|max:100', 'preferences.notes' => 'nullable|string|max:2000',
        ]);
        if (isset($v['preferences']['age_min'], $v['preferences']['age_max'])) {
            abort_if($v['preferences']['age_max'] < $v['preferences']['age_min'], 422, 'Maximum preferred age must be at least the minimum age.');
        }
        unset($v['consent']);
        $p->fill($v);
        $p->bureau_id = $this->tenant();
        $p->consented_at = $p->consented_at ?? now();
        $p->save();
        $this->log($id ? 'edit' : 'create', ($id ? 'Updated ' : 'Created ').$p->name, $p->id);
        $duplicates = Profile::where('bureau_id', $this->tenant())->where('id', '!=', $p->id)->where(function ($q) use ($p) {
            $q->where('name', $p->name);
            if ($p->phone) {
                $q->orWhere('phone', $p->phone);
            }
        })->get(['id', 'name']);

        return response()->json(['profile' => $p, 'duplicates' => $duplicates]);
    }

    public function archive(int $id)
    {
        $this->write();
        $p = $this->profile($id);
        $p->delete();
        ShareLink::where('bureau_id', $this->tenant())->where(function ($q) use ($id) {
            $q->where('profile_id', $id)->orWhereIn('proposal_id', DB::table('proposal_profiles')->where('profile_id', $id)->select('proposal_id'))->orWhereIn('proposal_id', Proposal::where('profile_id', $id)->select('id'));
        })->update(['revoked_at' => now()]);
        $this->log('archive', 'Archived '.$p->name, $id);

        return ['ok' => true];
    }

    public function restore(int $id)
    {
        $this->write();
        $p = Profile::onlyTrashed()->where('bureau_id', $this->tenant())->findOrFail($id);
        $p->restore();
        $this->log('restore', 'Restored '.$p->name, $id);

        return ['ok' => true];
    }

    public function upload(Request $r, int $id)
    {
        $this->write();
        $this->profile($id);
        $r->validate(['file' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120', 'kind' => ['required', Rule::in(['photo', 'document'])]]);
        abort_if($r->kind === 'photo' && ! str_starts_with($r->file('file')->getMimeType(), 'image/'), 422, 'Photos must be images.');
        $f = $r->file('file');
        $path = $f->store('bureaus/'.$this->tenant(), 'local');
        DB::table('profile_files')->insert(['bureau_id' => $this->tenant(), 'profile_id' => $id, 'path' => $path, 'name' => $f->getClientOriginalName(), 'mime' => $f->getMimeType(), 'kind' => $r->kind, 'created_at' => now(), 'updated_at' => now()]);
        $this->log('upload', 'Uploaded a '.$r->kind, $id);

        return ['ok' => true];
    }

    public function file(int $id)
    {
        $f = DB::table('profile_files')->where('bureau_id', $this->tenant())->find($id);
        abort_unless($f, 404);
        $this->profile($f->profile_id);
        $this->log('file-view', 'Viewed a private '.$f->kind, $f->profile_id);

        return Storage::disk('local')->response($f->path, $f->name, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function matches(int $id, Matcher $matcher)
    {
        $p = $this->profile($id);
        $weights = Bureau::find($this->tenant())->settings['weights'] ?? [];
        $decisions = DB::table('match_decisions')->where('bureau_id', $this->tenant())->where('profile_id', $id)->get()->keyBy('candidate_id');

        return Profile::where('bureau_id', $this->tenant())->where('gender', '!=', $p->gender)->where('status', 'Active')->get()->map(fn ($c) => [
            'profile' => $c->only(['id', 'name', 'gender', 'dob', 'city', 'profession', 'education', 'marital_status', 'religion']),
            ...$matcher->score($p, $c, $weights), 'decision' => $decisions[$c->id]->decision ?? null, 'note' => $decisions[$c->id]->note ?? null,
        ])->sortByDesc('score')->values();
    }

    public function decision(Request $r, int $id)
    {
        $this->write();
        $this->profile($id);
        $v = $r->validate(['candidate_id' => 'required|integer', 'decision' => ['required', Rule::in(['Shortlisted', 'Rejected', 'Reset'])], 'note' => 'nullable|string|max:2000']);
        $this->profile($v['candidate_id']);
        DB::table('match_decisions')->updateOrInsert(['bureau_id' => $this->tenant(), 'profile_id' => $id, 'candidate_id' => $v['candidate_id']], ['decision' => $v['decision'], 'note' => $v['note'] ?? null, 'updated_at' => now(), 'created_at' => now()]);
        $this->log('match', 'Match marked '.$v['decision'], $id);

        return ['ok' => true];
    }

    public function proposal(Request $r)
    {
        $this->write();
        $v = $r->validate(['title' => 'required|string|max:150', 'profile_id' => 'required|integer', 'candidate_ids' => 'required|array|min:1|max:10', 'candidate_ids.*' => 'required|integer|distinct', 'notes' => 'nullable|string|max:5000']);
        $this->profile($v['profile_id']);
        foreach ($v['candidate_ids'] as $id) {
            $this->profile($id);
            abort_if($id == $v['profile_id'], 422, 'Select another profile as a candidate.');
        }
        $p = DB::transaction(function () use ($v) {
            $p = Proposal::create(['bureau_id' => $this->tenant(), 'title' => $v['title'], 'profile_id' => $v['profile_id'], 'notes' => $v['notes'] ?? null]);
            foreach ($v['candidate_ids'] as $id) {
                DB::table('proposal_profiles')->insert(['proposal_id' => $p->id, 'profile_id' => $id]);
            }

return $p;
        });
        $this->log('proposal', 'Created proposal: '.$p->title, $p->profile_id);

        return $p;
    }

    public function proposalStatus(Request $r, int $id)
    {
        $this->write();
        $v = $r->validate(['status' => ['required', Rule::in(['Draft', 'Shared', 'Viewed', 'Interested', 'Not Interested', 'Meeting Planned', 'Closed'])]]);
        $p = Proposal::where('bureau_id', $this->tenant())->findOrFail($id);
        $p->update($v);
        $this->log('proposal', 'Proposal moved to '.$v['status'], $p->profile_id);

        return ['ok' => true];
    }

    public function share(Request $r)
    {
        $this->write();
        $v = $r->validate(['kind' => ['required', Rule::in(['proposal', 'edit'])], 'proposal_id' => 'nullable|integer', 'profile_id' => 'nullable|integer', 'days' => 'required|integer|min:1|max:30', 'password' => 'nullable|string|min:8|max:100', 'fields' => 'required|array|min:1', 'fields.*' => ['required', Rule::in(['name', 'dob', 'city', 'country', 'profession', 'education', 'marital_status', 'religion', 'sect', 'family', 'preferences', 'phone'])], 'photos' => 'required|boolean']);
        if ($v['kind'] === 'proposal') {
            $p = Proposal::where('bureau_id', $this->tenant())->findOrFail($v['proposal_id'] ?? 0);
            $this->profile($p->profile_id);
            foreach (DB::table('proposal_profiles')->where('proposal_id', $p->id)->pluck('profile_id') as $id) {
                $this->profile($id);
            }
        } else {
            $this->profile($v['profile_id'] ?? 0);
        }
        $token = bin2hex(random_bytes(32));
        $link = ShareLink::create(['bureau_id' => $this->tenant(), 'kind' => $v['kind'], 'proposal_id' => $v['kind'] === 'proposal' ? $p->id : null, 'profile_id' => $v['kind'] === 'edit' ? $v['profile_id'] : null, 'token_hash' => hash('sha256', $token), 'password' => empty($v['password']) ? null : Hash::make($v['password']), 'fields' => $v['fields'], 'photos' => $v['photos'], 'expires_at' => now()->addDays($v['days'])]);
        if (isset($p) && $p->status === 'Draft') {
            $p->update(['status' => 'Shared']);
        }
        $this->log('share', 'Created expiring '.$v['kind'].' link');

        return ['url' => url('/share/'.$token), 'link' => $link];
    }

    public function revoke(int $id)
    {
        $this->write();
        ShareLink::where('bureau_id', $this->tenant())->findOrFail($id)->update(['revoked_at' => now()]);
        $this->log('revoke', 'Revoked shared link #'.$id);

        return ['ok' => true];
    }

    public function work(Request $r, ?int $id = null)
    {
        $this->write();
        $v = $r->validate(['kind' => ['required', Rule::in(['followup', 'meeting'])], 'title' => 'required|string|max:150', 'profile_id' => 'nullable|integer', 'assigned_to' => 'nullable|integer', 'type' => ['required', Rule::in(['Call', 'WhatsApp', 'Meeting', 'Document', 'Reminder'])], 'due_at' => 'required|date', 'status' => ['required', Rule::in(['Pending', 'In progress', 'Completed', 'Cancelled', 'Proposed', 'Confirmed'])], 'notes' => 'nullable|string|max:5000', 'location' => 'nullable|string|max:250']);
        if (! empty($v['profile_id'])) {
            $this->profile($v['profile_id']);
        }
        if (! empty($v['assigned_to'])) {
            abort_unless(User::where('bureau_id', $this->tenant())->where('active', true)->whereKey($v['assigned_to'])->exists(), 422, 'Choose an active staff member.');
        }
        $w = $id ? WorkItem::where('bureau_id', $this->tenant())->findOrFail($id) : new WorkItem;
        $w->fill($v);
        if ($w->isDirty('due_at') || $w->isDirty('assigned_to')) {
            $w->reminded_at = null;
        } $w->bureau_id = $this->tenant();
        $w->save();
        $this->log('work', ($id ? 'Updated ' : 'Created ').$w->title, $w->profile_id);

        return $w;
    }

    public function deleteWork(int $id)
    {
        $this->write();
        WorkItem::where('bureau_id', $this->tenant())->findOrFail($id)->delete();
        $this->log('work', 'Deleted task #'.$id);

        return ['ok' => true];
    }

    public function settings(Request $r)
    {
        $this->owner();
        $v = $r->validate(['name' => 'required|string|max:100', 'settings' => 'required|array:accent,network,about,city,address,website,phone,weights,templates', 'settings.accent' => 'required|regex:/^#[a-fA-F0-9]{6}$/', 'settings.network' => 'required|boolean', 'settings.about' => 'nullable|string|max:2000', 'settings.city' => 'nullable|string|max:100', 'settings.address' => 'nullable|string|max:300', 'settings.website' => 'nullable|url|max:200', 'settings.phone' => 'nullable|string|max:30', 'settings.weights' => 'nullable|array:age,city,education,religion,marital_status', 'settings.weights.*' => 'integer|min:1|max:100', 'settings.templates' => 'nullable|string|max:5000']);
        Bureau::findOrFail($this->tenant())->update($v);
        $this->log('settings', 'Updated bureau settings');

        return ['ok' => true];
    }

    public function invite(Request $r)
    {
        $this->owner();
        $v = $r->validate(['email' => 'required|email|max:200|unique:users', 'role' => ['required', Rule::in(['manager', 'staff', 'readonly'])]]);
        DB::table('staff_invites')->where('bureau_id', $this->tenant())->where('email', $v['email'])->whereNull('accepted_at')->delete();
        $token = bin2hex(random_bytes(32));
        DB::table('staff_invites')->insert([...$v, 'bureau_id' => $this->tenant(), 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addDays(3), 'created_at' => now(), 'updated_at' => now()]);
        $this->log('invite', 'Invited '.$v['email']);

        return ['url' => url('/invite/'.$token)];
    }

    public function staff(Request $r, int $id)
    {
        $this->owner();
        $v = $r->validate(['role' => ['required', Rule::in(['manager', 'staff', 'readonly'])], 'active' => 'required|boolean']);
        $u = User::where('bureau_id', $this->tenant())->findOrFail($id);
        abort_if($u->role === 'owner', 422, 'The owner cannot be disabled here.');
        $u->role = $v['role'];
        $u->active = $v['active'];
        $u->save();
        if (! $u->active) {
            DB::table('sessions')->where('user_id', $id)->delete();
        } $this->log('staff', 'Updated staff access for '.$u->name);

        return ['ok' => true];
    }

    public function editReview(Request $r, int $id)
    {
        $this->write();
        $v = $r->validate(['accept' => 'required|boolean']);
        DB::transaction(function () use ($id, $v) {
            $e = DB::table('edit_requests')->where('bureau_id', $this->tenant())->where('status', 'Pending')->where('id', $id)->lockForUpdate()->first();
            abort_unless($e, 404);
            if ($v['accept']) {
                $this->profile($e->profile_id)->update(json_decode($e->data, true));
            } DB::table('edit_requests')->where('id', $id)->update(['status' => $v['accept'] ? 'Accepted' : 'Rejected', 'updated_at' => now()]);
            $this->log('review', 'Family corrections '.($v['accept'] ? 'accepted' : 'rejected'), $e->profile_id);
        });

        return ['ok' => true];
    }

    public function export()
    {
        $this->owner();
        $this->log('export', 'Exported profile directory');
        $b = $this->tenant();

        return response()->streamDownload(function () use ($b) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Name', 'Gender', 'City', 'Profession', 'Status', 'Phone']);
            foreach (Profile::where('bureau_id', $b)->cursor() as $p) {
                $row = [$p->id, $p->name, $p->gender, $p->city, $p->profession, $p->status, $p->phone];
                fputcsv($out, array_map(fn ($v) => preg_match('/^[=+@\-\t\r]/', (string) $v) ? "'".$v : $v, $row));
            } fclose($out);
        }, 'rishtahub-profiles.csv', ['Content-Type' => 'text/csv', 'Cache-Control' => 'no-store']);
    }

    public function network()
    {
        $b = Bureau::findOrFail($this->tenant());
        $enabled = ($b->settings['network'] ?? false) === true;
        $list = [];
        if ($enabled) {
            $others = Bureau::where('id', '!=', $b->id)->where('status', 'active')->get()->filter(fn ($x) => ($x->settings['network'] ?? false) === true)->keyBy('id');
            $list = Profile::whereIn('bureau_id', $others->keys())->where('status', 'Active')->whereNotNull('consented_at')->get()->map(fn ($p) => ['id' => $p->id, 'bureau' => $others[$p->bureau_id]->name, 'city' => $p->city, 'gender' => $p->gender, 'age_band' => $p->dob ? (floor($p->dob->age / 5) * 5).'–'.(floor($p->dob->age / 5) * 5 + 4) : null]);
        }
        $requests = DB::table('introductions as i')->join('bureaus as b', 'b.id', '=', 'i.bureau_id')->join('bureaus as t', 't.id', '=', 'i.target_bureau_id')->where(fn ($q) => $q->where('i.bureau_id', $b->id)->orWhere('i.target_bureau_id', $b->id))->select('i.*', 'b.name as from_bureau', 't.name as to_bureau')->get();

        return ['enabled' => $enabled, 'listings' => $list, 'requests' => $requests];
    }

    public function introduce(Request $r)
    {
        $this->write();
        $v = $r->validate(['profile_id' => 'required|integer', 'message' => 'required|string|max:2000']);
        $own = Bureau::find($this->tenant());
        abort_unless($own->settings['network'] ?? false, 403);
        $p = Profile::where('status', 'Active')->whereNotNull('consented_at')->findOrFail($v['profile_id']);
        $target = Bureau::findOrFail($p->bureau_id);
        abort_if($target->id === $own->id || $target->status !== 'active' || ! ($target->settings['network'] ?? false), 404);
        abort_if(DB::table('introductions')->where('bureau_id', $own->id)->where('profile_id', $p->id)->where('status', 'Pending')->exists(), 422, 'An introduction request is already pending.');
        DB::table('introductions')->insert([...$v, 'bureau_id' => $own->id, 'target_bureau_id' => $target->id, 'status' => 'Pending', 'created_at' => now(), 'updated_at' => now()]);
        $this->log('network', 'Requested introduction #'.$p->id);

        return ['ok' => true];
    }

    public function introductionStatus(Request $r, int $id)
    {
        $this->owner();
        $v = $r->validate(['status' => ['required', Rule::in(['Accepted', 'Rejected'])]]);
        $i = DB::table('introductions')->where('target_bureau_id',$this->tenant())->where('status','Pending')->where('id',$id)->first();
        abort_unless($i,404);
        DB::table('introductions')->where('id',$id)->update([...$v, 'updated_at' => now()]);
        $this->log('network','Introduction request '.$v['status']);

        return ['ok' => true];
    }
}
