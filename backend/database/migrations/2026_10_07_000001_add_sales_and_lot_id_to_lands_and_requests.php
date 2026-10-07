<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/* Correctifs catalogue / demandes :
   - `sales` sur les terrains : l'historique des ventes (saisi depuis le
     backoffice, catalogue > fiche terrain) n'avait aucune colonne pour être
     persisté. Il était donc toujours vide après rechargement ;
   - `lot_id` sur les demandes : une demande d'achat / visite déposée depuis
     le site public sur une parcelle précise n'était jamais rattachée à
     cette parcelle (colonne absente + champ non validé côté API). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lands', function (Blueprint $table) {
            $table->jsonb('sales')->nullable()->after('lots');
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->string('lot_id')->nullable()->index()->after('land_id');
        });
    }

    public function down(): void
    {
        Schema::table('lands', function (Blueprint $table) {
            $table->dropColumn('sales');
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->dropColumn('lot_id');
        });
    }
};
