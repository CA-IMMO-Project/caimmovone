<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/* Catalogue public — reprend à l'identique les champs du type `Land` du frontend. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lands', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('price')->default(0); // Ariary
            $table->string('region')->index();
            $table->string('zone')->nullable()->index();
            $table->string('location');
            $table->string('image_url')->nullable();
            $table->jsonb('gallery')->nullable();       // chemins/URLs publics
            $table->jsonb('features')->nullable();       // atouts (liste)
            $table->jsonb('documents')->nullable();      // pièces fournies
            $table->jsonb('coordinates')->nullable();    // [lat, lng]
            $table->unsignedInteger('area')->default(0); // m²
            $table->string('title_status')->default('Titre Foncier');
            $table->string('status')->default('disponible')->index(); // disponible | reserve | vendu
            $table->string('relief')->default('Plat');
            $table->string('access')->nullable();
            $table->boolean('water')->default(false);
            $table->boolean('electricity')->default(false);
            $table->string('payment')->nullable();
            $table->string('payment_mode')->default('comptant'); // comptant | facilite | comptant-ou-facilite
            $table->string('down_payment')->nullable();
            $table->string('installments')->nullable();
            $table->boolean('verified')->default(false);
            $table->boolean('featured')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lands');
    }
};
