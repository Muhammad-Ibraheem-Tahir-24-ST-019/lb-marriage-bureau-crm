<?php
namespace Tests\Feature;
use App\Models\{Bureau,User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class PreferenceTest extends TestCase {
 use RefreshDatabase;
 public function test_optional_age_bounds_can_be_left_blank_but_inverted_bounds_are_rejected():void {
  $b=Bureau::create(['name'=>'Test','slug'=>'test']);$u=User::factory()->create(['bureau_id'=>$b->id,'role'=>'owner']);
  $base=['name'=>'Adult Test','gender'=>'Female','dob'=>'1997-01-01','city'=>'Lahore','country'=>'Pakistan','status'=>'Active','marital_status'=>'Never married','consent'=>true];
  $this->actingAs($u)->postJson('/api/profiles',[...$base,'preferences'=>['age_min'=>null,'age_max'=>35]])->assertOk();
  $this->postJson('/api/profiles',[...$base,'preferences'=>['age_min'=>30,'age_max'=>null]])->assertOk();
  $this->postJson('/api/profiles',[...$base,'preferences'=>['age_min'=>35,'age_max'=>30]])->assertUnprocessable();
 }
}
