<?php

use App\Models\LandFile;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Storage;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('files:secure-legacy', function () {
    $public = Storage::disk('public');
    $private = Storage::disk('local');
    $files = $public->allFiles('land-files');

    foreach ($files as $path) {
        if (! $private->exists($path)) {
            $private->put($path, $public->get($path));
        }
    }

    $replace = function (mixed $value) use (&$replace): mixed {
        if (is_array($value)) {
            return array_map($replace, $value);
        }
        if (is_string($value) && str_starts_with($value, '/storage/land-files/')) {
            $path = substr($value, strlen('/storage/'));

            return '/api/v1/admin/files/'.str_replace('%2F', '/', rawurlencode($path));
        }

        return $value;
    };

    LandFile::query()->eachById(function (LandFile $file) use ($replace): void {
        $detail = $replace($file->detail ?? []);
        $file->forceFill(['detail' => $detail])->save();
    });

    foreach ($files as $path) {
        $public->delete($path);
    }

    $this->info(count($files).' fichier(s) vendeur déplacé(s) vers le stockage privé.');
})->purpose('Déplace les anciens dépôts vendeurs publics vers le disque privé');

Schedule::command('sanctum:prune-expired --hours=24')->daily();
