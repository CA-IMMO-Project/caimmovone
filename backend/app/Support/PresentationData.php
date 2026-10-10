<?php

namespace App\Support;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Jeu de présentation volontaire, additif et relançable.
 * Une clé stable désigne uniquement la ligne créée par CE jeu : aucun rapprochement
 * par id explicite, titre, nom, téléphone ou email avec une vraie donnée existante.
 */
final class PresentationData
{
    public const DATASET = 'caimmo-presentation-v1';

    public static function allowed(): bool
    {
        return app()->environment(['local', 'testing', 'staging', 'presentation']);
    }

    public static function ensureAllowed(): void
    {
        if (! self::allowed()) {
            throw new RuntimeException('Le jeu de présentation est réservé à une base isolée (APP_ENV=local, testing, staging ou presentation). Aucune donnée n’a été chargée.');
        }
        if (! Schema::hasTable('presentation_records')) {
            throw new RuntimeException('Exécutez php artisan migrate avant de charger le jeu de présentation.');
        }
    }

    /** @param class-string<Model> $modelClass */
    public function remember(string $key, string $modelClass, Closure $factory): Model
    {
        self::ensureAllowed();

        return DB::transaction(function () use ($key, $modelClass, $factory): Model {
            // Les migrations et les routes métier du projet ciblent PostgreSQL.
            // Le verrou sérialise deux chargements simultanés de la même clé.
            DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', [self::DATASET.':'.$key]);
            $record = DB::table('presentation_records')
                ->where('dataset', self::DATASET)->where('record_key', $key)->first();
            if ($record && $record->model_type === $modelClass) {
                $existing = $modelClass::find($record->model_id);
                if ($existing) {
                    return $existing; // Ne réécrit même pas les modifications de ces exemples.
                }
            }

            $model = $factory();
            if (! $model instanceof $modelClass) {
                throw new RuntimeException('Type de ligne de présentation inattendu : '.$key);
            }
            $model->save(); // Id auto-incrémenté ; aucune séquence réelle n'est réinitialisée.
            DB::table('presentation_records')->updateOrInsert(
                ['dataset' => self::DATASET, 'record_key' => $key],
                ['model_type' => $modelClass, 'model_id' => $model->getKey(), 'created_at' => now()],
            );

            return $model;
        });
    }

    /** @param class-string<Model> $modelClass */
    public function find(string $key, string $modelClass): ?Model
    {
        $record = DB::table('presentation_records')
            ->where('dataset', self::DATASET)->where('record_key', $key)->where('model_type', $modelClass)->first();

        return $record ? $modelClass::find($record->model_id) : null;
    }

    /** Installe un PDF fourni dans le dépôt sur le disque privé, sans écraser un fichier. */
    public function file(string $relativePath, string $name): array
    {
        self::ensureAllowed();
        if (str_contains($relativePath, '..') || str_starts_with($relativePath, '/') || ! str_ends_with($relativePath, '.pdf')) {
            throw new RuntimeException('Chemin de pièce de présentation invalide.');
        }
        $source = database_path('seeders/fixtures/'.$relativePath);
        if (! File::exists($source) || ! str_starts_with(File::get($source), '%PDF-')) {
            throw new RuntimeException('PDF de présentation absent ou invalide : '.$relativePath);
        }
        $path = 'presentation/v1/'.$relativePath;
        $disk = Storage::disk('local');
        if (! $disk->exists($path)) {
            if (! $disk->put($path, File::get($source))) {
                throw new RuntimeException('Impossible de copier la pièce dans le stockage privé : '.$relativePath);
            }
        }

        return [
            'id' => 'ex-'.substr(hash('sha256', $path), 0, 16),
            'name' => str_ends_with(mb_strtolower($name), '.pdf') ? $name : $name.'.pdf',
            'type' => 'application/pdf',
            'size' => $disk->size($path),
            'url' => '/api/v1/admin/files/'.$path,
        ];
    }

    public static function json(string $filename): array
    {
        return json_decode(File::get(database_path('seeders/data/'.$filename)), true, 512, JSON_THROW_ON_ERROR);
    }
}
