<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/* Pont back office :
   - colonnes `detail` (jsonb) : l'objet complet manipulé par l'admin (CRM riche :
     notes, contacts, actions planifiées, documents…) — les colonnes structurées
     restent la source de vérité pour le filtrage et les listes ;
   - `lots` sur les terrains (parcelles du catalogue) ;
   - tables `searches` (recherches sur mesure) et `land_files` (dossiers
     « à vendre » déposés ou créés par l'équipe). */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('lands', function (Blueprint $table) {
            $table->jsonb('lots')->nullable();
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->jsonb('detail')->nullable();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->string('ref', 24)->nullable()->index();
            $table->jsonb('detail')->nullable();
        });

        Schema::create('searches', function (Blueprint $table) {
            $table->id();
            $table->string('ref')->unique(); // REC-YYMMDD…
            $table->unsignedBigInteger('client_id')->nullable()->index();
            $table->string('status')->default('Nouvelle')->index();
            $table->string('main_zone')->nullable();
            $table->string('full_name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('source')->default('Site web');
            $table->jsonb('detail')->nullable(); // critères, propositions, historique…
            $table->timestamps();
        });

        Schema::create('land_files', function (Blueprint $table) {
            $table->id();
            $table->string('ref')->unique(); // VEN-YYMMDD… / TER-…
            $table->unsignedBigInteger('client_id')->nullable()->index();
            $table->string('status')->default('À l\'étude')->index();
            $table->string('full_name')->nullable();
            $table->string('phone')->nullable();
            $table->jsonb('detail')->nullable(); // dossier complet (terrain, docs, vente, checklist…)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('land_files');
        Schema::dropIfExists('searches');
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['ref', 'detail']);
        });
        Schema::table('requests', function (Blueprint $table) {
            $table->dropColumn('detail');
        });
        Schema::table('lands', function (Blueprint $table) {
            $table->dropColumn('lots');
        });
    }
};
