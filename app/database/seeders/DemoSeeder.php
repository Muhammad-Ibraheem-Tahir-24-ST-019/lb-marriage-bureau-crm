<?php

namespace Database\Seeders;

use App\Models\Bureau;
use App\Models\Profile;
use App\Models\Proposal;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local', 'testing') || ! config('app.demo')) {
            throw new \RuntimeException('Demo seeding requires APP_ENV=local and DEMO_MODE=true.');
        }
        if (Bureau::where('slug', 'noor-demo')->exists()) {
            return;
        }
        DB::transaction(function () {
            $b = Bureau::create(['name' => 'Noor Marriage Bureau', 'slug' => 'noor-demo', 'settings' => ['accent' => '#0F766E', 'network' => false, 'city' => 'Lahore', 'about' => 'A fictional demonstration bureau. Thoughtful introductions, built around trust.', 'weights' => ['age' => 30, 'city' => 20, 'education' => 20, 'religion' => 15, 'marital_status' => 15]]]);
            $owner = new User;
            $owner->name = 'Amina Khan';
            $owner->email = 'owner@demo.rishtahub.test';
            $owner->password = Hash::make('DemoBureau2026!');
            $owner->bureau_id = $b->id;
            $owner->role = 'owner';
            $owner->save();
            foreach ([['Sara Ahmed', 'manager'], ['Omar Ali', 'staff'], ['Hina Raza', 'readonly']] as $i => [$name,$role]) {
                $u = new User;
                $u->name = $name;
                $u->email = $role.'@demo.rishtahub.test';
                $u->password = Hash::make('DemoBureau2026!');
                $u->bureau_id = $b->id;
                $u->role = $role;
                $u->save();
            }
            $women = ['Ayesha Khan', 'Zainab Ahmed', 'Fatima Hassan', 'Maryam Malik', 'Hira Shah', 'Areeba Siddiqui', 'Noor Fatima', 'Sana Raza', 'Mahnoor Ali', 'Iqra Nadeem', 'Alina Qureshi', 'Eman Farooq'];
            $men = ['Ahmed Raza', 'Hamza Malik', 'Usman Khan', 'Hassan Ali', 'Bilal Ahmed', 'Saad Farooq', 'Omar Siddiqui', 'Zain Shah', 'Ali Qureshi', 'Fahad Nadeem', 'Taha Hassan', 'Daniyal Iqbal'];
            $cities = ['Lahore', 'Islamabad', 'Karachi', 'Lahore', 'Rawalpindi', 'Faisalabad'];
            $jobs = ['Software Engineer', 'Doctor', 'Architect', 'Product Designer', 'Lecturer', 'Business Owner'];
            $degrees = ['BS Computer Science', 'MBBS', 'B.Arch', 'MBA', 'MS Education', 'BBA'];
            $profiles = [];
            for ($i = 0; $i < 48; $i++) {
                $female = $i % 2 === 0;
                $idx = intdiv($i, 2) % 12;
                $name = ($female ? $women : $men)[$idx];
                if ($i >= 24) {
                    $name .= ' (Demo '.($i + 1).')';
                }
                $created = now()->subDays(($i * 7) % 175);
                $p = Profile::create(['bureau_id' => $b->id, 'name' => $name, 'gender' => $female ? 'Female' : 'Male', 'dob' => now()->subYears(($female ? 24 : 27) + $i % 8)->subDays($i * 3)->toDateString(), 'city' => $cities[$i % 6], 'country' => 'Pakistan', 'profession' => $jobs[$i % 6], 'education' => $degrees[$i % 6], 'status' => $i % 13 === 0 ? 'Matched' : ($i % 11 === 0 ? 'On Hold' : 'Active'), 'marital_status' => $i % 9 === 0 ? 'Divorced' : 'Never married', 'religion' => 'Islam', 'sect' => 'Sunni', 'details' => ['father' => 'Fictional parent · Retired professional', 'mother' => 'Fictional parent · Educator', 'siblings' => '2 siblings', 'family_city' => $cities[$i % 6], 'family_background' => 'Fictional demo family. Values kindness, education, and mutual respect.', 'height' => $female ? '5 ft 5 in' : '5 ft 10 in', 'language' => 'Urdu, English', 'income' => 'Prefer to discuss privately'], 'preferences' => ['age_min' => $female ? 26 : 23, 'age_max' => $female ? 36 : 32, 'city' => $cities[$i % 6], 'religion' => 'Islam', 'marital_status' => 'Never married'], 'tags' => ['Demo', $i % 3 === 0 ? 'Verified details' : 'New profile'], 'notes' => 'Fictional demo record. This is not a real person.', 'consented_at' => $created, 'assigned_to' => $owner->id, 'created_at' => $created, 'updated_at' => $created]);
                $profiles[] = $p;
            }
            foreach (['Call the Khan family', 'Share the updated shortlist', 'Confirm family introduction', 'Review biodata corrections', 'Follow up on proposal feedback', 'Arrange a first conversation'] as $i => $title) {
                WorkItem::create(['bureau_id' => $b->id, 'kind' => 'followup', 'title' => $title, 'profile_id' => $profiles[$i]->id, 'assigned_to' => $owner->id, 'type' => ['Call', 'WhatsApp', 'Meeting'][$i % 3], 'status' => $i === 5 ? 'Completed' : ($i === 3 ? 'In progress' : 'Pending'), 'due_at' => now()->startOfDay()->addDays($i - 1)->addHours(10 + $i), 'notes' => 'Demo follow-up. Confirm the next step with the family.']);
            }
            foreach (['Khan & Raza families', 'Ahmed family consultation', 'Malik family introduction'] as $i => $title) {
                WorkItem::create(['bureau_id' => $b->id, 'kind' => 'meeting', 'title' => $title, 'profile_id' => $profiles[$i]->id, 'assigned_to' => $owner->id, 'type' => 'Meeting', 'status' => $i === 2 ? 'Completed' : 'Confirmed', 'due_at' => now()->addDays($i + 1)->setTime(15, 30), 'location' => 'Bureau meeting room', 'notes' => 'Fictional demo meeting.']);
            }
            for ($i = 0; $i < 12; $i++) {
                $p = Proposal::create(['bureau_id' => $b->id, 'profile_id' => $profiles[$i * 2]->id, 'title' => ['A thoughtful first shortlist', 'New possibilities', 'Family introduction'][$i % 3].' · '.explode(' ', $profiles[$i * 2]->name)[0], 'status' => ['Draft', 'Shared', 'Viewed', 'Interested', 'Meeting Planned', 'Closed'][$i % 6], 'created_at' => now()->subDays($i * 12), 'updated_at' => now()->subDays($i)]);
                foreach ([1, 3] as $offset) {
                    DB::table('proposal_profiles')->insert(['proposal_id' => $p->id, 'profile_id' => $profiles[($i * 2 + $offset) % 48]->id, 'response' => $i % 6 === 3 ? 'Interested' : null]);
                }
            }
            foreach ([['create', 'Added Ayesha Khan to the directory'], ['proposal', 'Created a thoughtful shortlist for the Ahmed family'], ['response', 'Family expressed interest in a proposal'], ['work', 'Scheduled an introduction with the Malik family'], ['settings', 'Updated bureau matching preferences']] as $i => [$action,$description]) {
                DB::table('activities')->insert(['bureau_id' => $b->id, 'user_id' => $owner->id, 'profile_id' => $profiles[$i]->id, 'action' => $action, 'description' => $description, 'created_at' => now()->subMinutes($i * 38 + 5), 'updated_at' => now()]);
            }
        });
    }
}
