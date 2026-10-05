<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/* Réalisations publiées depuis le back office (page « Nos réalisations »). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('realisations', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category')->index();
            $table->string('location')->nullable();
            $table->string('completed_at', 7)->nullable(); // « AAAA-MM »
            $table->string('client')->nullable();          // nom affiché (facultatif)
            $table->unsignedInteger('area')->default(0);
            $table->string('duration')->nullable();
            $table->text('description')->nullable();
            $table->jsonb('photos')->nullable(); // liste d'URLs (la 1re = couverture)
            $table->boolean('published')->default(false)->index();
            $table->boolean('featured')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('realisations');
    }
};
