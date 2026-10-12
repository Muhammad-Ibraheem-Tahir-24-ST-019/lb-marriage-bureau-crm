<?php

namespace App\Services;

use App\Models\Profile;

class Matcher
{
    public function score(Profile $source, Profile $candidate, array $weights = []): array
    {
        $prefs = $source->preferences ?? [];
        $reasons = [];
        $earned = 0;
        $possible = 0;
        $tests = [
            'age' => ['Age preference', isset($prefs['age_min']) || isset($prefs['age_max']), $candidate->dob?->age, fn ($v) => $v >= ($prefs['age_min'] ?? 18) && $v <= ($prefs['age_max'] ?? 100)],
            'city' => ['Preferred city', ! empty($prefs['city']), $candidate->city, fn ($v) => strcasecmp($v, $prefs['city']) === 0],
            'education' => ['Education', ! empty($prefs['education']), $candidate->education, fn ($v) => stripos($v, $prefs['education']) !== false],
            'religion' => ['Religion', ! empty($prefs['religion']), $candidate->religion, fn ($v) => strcasecmp($v, $prefs['religion']) === 0],
            'marital_status' => ['Marital status', ! empty($prefs['marital_status']), $candidate->marital_status, fn ($v) => $v === $prefs['marital_status']],
        ];
        foreach ($tests as $key => [$label,$set,$value,$test]) {
            if (! $set) {
                continue;
            }
            $w = max(1, min(100, (int) ($weights[$key] ?? 20)));
            $possible += $w;
            $ok = $value !== null && $value !== '' && $test($value);
            if ($ok) {
                $earned += $w;
            }
            $reasons[] = ['label' => $label, 'matched' => $ok, 'unknown' => $value === null || $value === '', 'weight' => $w];
        }

        return ['score' => $possible ? round(100 * $earned / $possible) : null, 'reasons' => $reasons];
    }
}
