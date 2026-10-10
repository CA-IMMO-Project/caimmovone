<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Registre technique des seuls exemples ajoutés volontairement.
        // Ne modifie ni les données métier existantes ni la colonne historique lands.verified.
        Schema::create('presentation_records', function (Blueprint $table) {
            $table->id();
            $table->string('dataset');
            $table->string('record_key');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->timestamp('created_at')->nullable();
            $table->unique(['dataset', 'record_key']);
        });
    }

    public function down(): void
    {
        // Retirer le registre ne supprime aucun terrain, client, dossier ou fichier.
        Schema::dropIfExists('presentation_records');
    }
};
