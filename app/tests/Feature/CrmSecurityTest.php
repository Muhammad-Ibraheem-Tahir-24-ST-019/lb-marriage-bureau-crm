<?php

namespace Tests\Feature;

use App\Models\Bureau;
use App\Models\Profile;
use App\Models\Proposal;
use App\Models\ShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CrmSecurityTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Bureau $bureau;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bureau = Bureau::create(['name' => 'Test Bureau', 'slug' => 'test', 'settings' => ['network' => false, 'accent' => '#0F766E']]);
        $this->owner = User::factory()->create(['bureau_id' => $this->bureau->id, 'role' => 'owner', 'active' => true]);
    }

    private function profile(?int $bureau = null, array $extra = []): Profile
    {
        return Profile::create([...$this->payload(), 'bureau_id' => $bureau ?? $this->bureau->id, 'consented_at' => now(), ...$extra]);
    }

    private function payload(): array
    {
        return ['name' => 'Test Adult', 'gender' => 'Female', 'dob' => '1998-04-15', 'city' => 'Lahore', 'country' => 'Pakistan', 'profession' => 'Engineer', 'education' => 'BS', 'marital_status' => 'Never married', 'status' => 'Active', 'phone' => 'PRIVATE PHONE', 'notes' => 'SECRET NOTES', 'details' => ['address' => 'SECRET ADDRESS', 'father' => 'Father'], 'preferences' => ['age_min' => 25, 'age_max' => 35], 'tags' => []];
    }

    private function link(array $fields = ['name', 'city'], bool $password = false): array
    {
        $source = $this->profile();
        $candidate = $this->profile(extra: ['gender' => 'Male']);
        $p = Proposal::create(['bureau_id' => $this->bureau->id, 'profile_id' => $source->id, 'title' => 'Private shortlist']);
        DB::table('proposal_profiles')->insert(['proposal_id' => $p->id, 'profile_id' => $candidate->id]);
        $token = bin2hex(random_bytes(32));
        $l = ShareLink::create(['bureau_id' => $this->bureau->id, 'proposal_id' => $p->id, 'kind' => 'proposal', 'token_hash' => hash('sha256', $token), 'password' => $password ? Hash::make('LinkPassword123') : null, 'fields' => $fields, 'photos' => false, 'expires_at' => now()->addDay()]);

        return [$token, $l, $candidate, $p];
    }

    public function test_guest_cannot_read_private_state(): void
    {
        $this->getJson('/api/state')->assertUnauthorized();
    }

    public function test_tenant_isolation_blocks_read_edit_file_match_and_proposal_injection(): void
    {
        $other = Bureau::create(['name' => 'Other', 'slug' => 'other']);
        $foreign = $this->profile($other->id);
        $own = $this->profile();
        $this->actingAs($this->owner)->getJson('/api/state')->assertOk()->assertJsonCount(1, 'profiles')->assertJsonPath('profiles.0.id', $own->id);
        $this->getJson('/api/profiles/'.$foreign->id)->assertNotFound();
        $this->putJson('/api/profiles/'.$foreign->id, [...$this->payload(), 'consent' => true])->assertNotFound();
        $this->getJson('/api/profiles/'.$foreign->id.'/matches')->assertNotFound();
        $this->postJson('/api/proposals', ['title' => 'Bad', 'profile_id' => $own->id, 'candidate_ids' => [$foreign->id]])->assertNotFound();
        $this->postJson('/api/links', ['kind' => 'edit', 'profile_id' => $foreign->id, 'days' => 7, 'fields' => ['name'], 'photos' => false])->assertNotFound();
    }

    public function test_readonly_cannot_mutate_or_export_or_invite(): void
    {
        $reader = User::factory()->create(['bureau_id' => $this->bureau->id, 'role' => 'readonly']);
        $p = $this->profile();
        $this->actingAs($reader)->getJson('/api/state')->assertOk();
        $this->postJson('/api/profiles', [...$this->payload(), 'consent' => true])->assertForbidden();
        $this->deleteJson('/api/profiles/'.$p->id)->assertForbidden();
        $this->postJson('/api/links', [])->assertForbidden();
        $this->getJson('/api/export')->assertForbidden();
        $this->postJson('/api/staff/invite', [])->assertForbidden();
    }

    public function test_adult_and_consent_are_required(): void
    {
        $this->actingAs($this->owner)->postJson('/api/profiles', [...$this->payload(), 'consent' => false])->assertUnprocessable();
        $this->postJson('/api/profiles', [...$this->payload(), 'dob' => now()->subYears(16)->toDateString(), 'consent' => true])->assertUnprocessable();
        $this->postJson('/api/profiles', [...$this->payload(), 'consent' => true])->assertOk();
        $this->assertDatabaseCount('profiles', 1);
    }

    public function test_share_dto_omits_private_fields_and_raw_date_of_birth(): void
    {
        [$token] = $this->link(['name', 'dob', 'city']);
        $res = $this->getJson('/api/share/'.$token)->assertOk();
        $body = $res->getContent();
        foreach (['SECRET', 'PRIVATE PHONE', '1998-04-15', 'token_hash', 'password', 'notes', 'bureau_id'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }
        $res->assertJsonStructure(['profiles' => [['id', 'name', 'age', 'city']]]);
    }

    public function test_expired_revoked_and_suspended_links_fail(): void
    {
        [$token,$l] = $this->link();
        $l->update(['expires_at' => now()->subMinute()]);
        $this->getJson('/api/share/'.$token)->assertNotFound();
        $l->update(['expires_at' => now()->addDay(), 'revoked_at' => now()]);
        $this->getJson('/api/share/'.$token)->assertNotFound();
        $l->update(['revoked_at' => null]);
        $this->bureau->update(['status' => 'suspended']);
        $this->getJson('/api/share/'.$token)->assertNotFound();
    }

    public function test_password_link_is_locked_until_correct_password_and_revocation_still_applies(): void
    {
        [$token,$l] = $this->link(password: true);
        $this->getJson('/api/share/'.$token)->assertStatus(423);
        $this->postJson('/api/share/'.$token.'/unlock', ['password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/share/'.$token.'/unlock', ['password' => 'LinkPassword123'])->assertOk();
        $this->getJson('/api/share/'.$token)->assertOk();
        $l->update(['revoked_at' => now()]);
        $this->getJson('/api/share/'.$token)->assertNotFound();
    }

    public function test_family_can_only_respond_to_candidates_in_its_package(): void
    {
        [$token,$l,$candidate,$proposal] = $this->link();
        $unrelated = $this->profile();
        $this->postJson('/api/share/'.$token.'/respond', ['profile_id' => $unrelated->id, 'response' => 'Interested'])->assertNotFound();
        $this->postJson('/api/share/'.$token.'/respond', ['profile_id' => $candidate->id, 'response' => 'Interested', 'message' => 'Please arrange a meeting'])->assertOk();
        $this->assertDatabaseHas('proposal_profiles', ['proposal_id' => $proposal->id, 'profile_id' => $candidate->id, 'response' => 'Interested']);
        $this->assertDatabaseHas('proposals', ['id' => $proposal->id, 'status' => 'Interested']);
    }

    public function test_archiving_profile_revokes_existing_links_and_restore_does_not_restore_links(): void
    {
        [$token,$l,$candidate] = $this->link();
        $this->actingAs($this->owner)->deleteJson('/api/profiles/'.$candidate->id)->assertOk();
        $this->getJson('/api/share/'.$token)->assertNotFound();
        $this->postJson('/api/profiles/'.$candidate->id.'/restore')->assertOk();
        $this->getJson('/api/share/'.$token)->assertNotFound();
    }

    public function test_private_document_requires_same_bureau_and_is_not_shareable_as_photo(): void
    {
        Storage::fake('local');
        $p = $this->profile();
        $this->actingAs($this->owner)->post('/api/profiles/'.$p->id.'/files', ['file' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'), 'kind' => 'document'], ['Accept' => 'application/json'])->assertOk();
        $file = DB::table('profile_files')->first();
        $this->get('/api/files/'.$file->id)->assertOk();
        $other = Bureau::create(['name' => 'Other', 'slug' => 'other']);
        $u = User::factory()->create(['bureau_id' => $other->id]);
        $this->actingAs($u)->getJson('/api/files/'.$file->id)->assertNotFound();
    }

    public function test_disabling_staff_immediately_blocks_access(): void
    {
        $u = User::factory()->create(['bureau_id' => $this->bureau->id, 'role' => 'staff']);
        $this->actingAs($this->owner)->putJson('/api/staff/'.$u->id, ['role' => 'staff', 'active' => false])->assertOk();
        $this->actingAs($u->fresh())->getJson('/api/state')->assertUnauthorized();
    }

    public function test_network_is_opt_in_and_returns_no_names_or_contacts(): void
    {
        $other = Bureau::create(['name' => 'Other Bureau', 'slug' => 'other', 'settings' => ['network' => true]]);
        $p = $this->profile($other->id, ['name' => 'SECRET NAME']);
        $this->actingAs($this->owner)->getJson('/api/network')->assertJsonCount(0, 'listings');
        $this->bureau->update(['settings' => ['network' => true]]);
        $res = $this->getJson('/api/network')->assertJsonCount(1, 'listings');
        $this->assertStringNotContainsString('SECRET NAME', $res->getContent());
        $this->assertStringNotContainsString('PRIVATE PHONE', $res->getContent());
        $other->update(['settings' => ['network' => false]]);
        $this->postJson('/api/introductions', ['profile_id' => $p->id, 'message' => 'Hello'])->assertNotFound();
    }

    public function test_family_edits_require_review_and_cannot_inject_hidden_fields(): void
    {
        $p = $this->profile();
        $token = bin2hex(random_bytes(32));
        ShareLink::create(['bureau_id' => $this->bureau->id, 'profile_id' => $p->id, 'kind' => 'edit', 'token_hash' => hash('sha256', $token), 'fields' => ['city'], 'expires_at' => now()->addDay()]);
        $this->postJson('/api/share/'.$token.'/edit', ['city' => 'Islamabad', 'phone' => 'INJECTED', 'notes' => 'INJECTED', 'bureau_id' => 99])->assertOk();
        $this->assertSame('Lahore', $p->fresh()->city);
        $edit = DB::table('edit_requests')->first();
        $this->assertSame(['city' => 'Islamabad'], json_decode($edit->data, true));
        $this->actingAs($this->owner)->postJson('/api/edits/'.$edit->id, ['accept' => true])->assertOk();
        $this->assertSame('Islamabad', $p->fresh()->city);
        $this->assertSame('PRIVATE PHONE', $p->fresh()->phone);
    }

    public function test_superadmin_cannot_access_private_crm_records(): void
    {
        $u = User::factory()->create(['role' => 'superadmin', 'bureau_id' => null]);
        $this->actingAs($u)->getJson('/api/admin')->assertOk();
        $this->getJson('/api/state')->assertForbidden();
        $p = $this->profile();
        $this->getJson('/api/profiles/'.$p->id)->assertForbidden();
    }

    public function test_matching_returns_explainable_scores(): void
    {
        $a = $this->profile();
        $b = $this->profile(extra: ['gender' => 'Male', 'dob' => '1996-01-01']);
        $this->actingAs($this->owner)->getJson('/api/profiles/'.$a->id.'/matches')->assertOk()->assertJsonPath('0.score', 100)->assertJsonPath('0.reasons.0.label', 'Age preference');
    }

    public function test_invitation_can_only_be_used_once(): void
    {
        $res = $this->actingAs($this->owner)->postJson('/api/staff/invite', ['email' => 'new@example.test', 'role' => 'staff'])->assertOk();
        $token = basename($res->json('url'));
        auth()->logout();
        $this->postJson('/api/invite/'.$token, ['name' => 'New Staff', 'password' => 'LongPassword123', 'password_confirmation' => 'LongPassword123'])->assertOk();
        $this->assertDatabaseHas('users', ['email' => 'new@example.test', 'bureau_id' => $this->bureau->id, 'role' => 'staff']);
        $this->postJson('/api/invite/'.$token, ['name' => 'Again', 'password' => 'LongPassword123', 'password_confirmation' => 'LongPassword123'])->assertNotFound();
    }

    public function test_labelled_import_only_prepares_draft(): void
    {
        $this->actingAs($this->owner)->postJson('/api/import', ['text' => "Name: Ayesha\nCity: Lahore\nEducation: MBA"])->assertOk()->assertJsonPath('fields.name', 'Ayesha');
        $this->assertDatabaseCount('profiles', 0);
    }

    public function test_csv_export_neutralizes_spreadsheet_formula_injection(): void
    {
        $this->profile(extra: ['name' => '=HYPERLINK("https://example.test")']);
        $r = $this->actingAs($this->owner)->get('/api/export')->assertOk();
        $this->assertStringContainsString("'=HYPERLINK",$r->streamedContent());
    }
}
