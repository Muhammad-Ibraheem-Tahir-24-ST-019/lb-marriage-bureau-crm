<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ImportController extends Controller
{
    public function extract(Request $r)
    {
        abort_unless(in_array($r->user()->role, ['owner', 'manager', 'staff']), 403);
        $v = $r->validate(['text' => 'required|string|max:15000', 'use_ai' => 'sometimes|boolean']);
        $keys = ['name', 'city', 'country', 'education', 'profession', 'religion', 'sect', 'phone'];
        if ($v['use_ai'] ?? false) {
            $endpoint = config('services.biodata.endpoint');
            abort_unless($endpoint && config('services.biodata.key'), 503, 'The AI provider has not been configured. Use labelled-text extraction or configure the server adapter.');
            abort_unless(str_starts_with($endpoint, 'https://'), 503, 'AI extraction requires an HTTPS endpoint.');
            try {
                $res = Http::withToken(config('services.biodata.key'))->acceptJson()->connectTimeout(5)->timeout(25)->post($endpoint, ['text' => $v['text'], 'allowed_fields' => $keys, 'instructions' => 'Extract only explicitly stated facts. Return {"fields": {field: string}, "warnings": [string]}. Never infer sensitive facts.']);
                abort_unless($res->successful(), 502, 'The extraction provider is unavailable. Try again later.');
                $fields = $res->json('fields');
                abort_unless(is_array($fields), 502, 'The extraction provider returned an invalid draft.');
            } catch (ConnectionException $e) {
                abort(504, 'The extraction provider timed out. Your text has not been saved.');
            }
            $notice = 'AI draft prepared. Values may be uncertain; review every field before saving.';
        } else {
            $fields = [];
            foreach (preg_split('/\R/u', $v['text']) as $line) {
                if (preg_match('/^\s*([\p{L}\s]+)\s*[:=]\s*(.+)$/u', $line, $m)) {
                    $label = strtolower(trim($m[1]));
                    $key = match ($label) {
                        'full name','name' => 'name','occupation','job','profession' => 'profession','qualification','education' => 'education','contact','phone','mobile' => 'phone',default => $label
                    };
                    if (in_array($key, $keys)) {
                        $fields[$key] = trim($m[2]);
                    }
                }
            }
            $notice = 'Labelled-text draft prepared without sending data to an AI provider. Verify every value.';
        }
        $fields = array_filter(array_intersect_key($fields, array_flip($keys)), fn ($value) => is_string($value) && mb_strlen($value) <= 120);
        abort_unless(count($fields), 422, 'No labelled fields were found. Try lines such as Name: Ayesha and City: Lahore.');

        return ['fields' => $fields, 'notice' => $notice];
    }
}
