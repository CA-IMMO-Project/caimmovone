<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Enforce the relationships already represented by the Eloquent models.
 * nullOnDelete preserves the commercial history when a related record is
 * deliberately removed from the catalogue or CRM.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Preserve legacy rows while removing orphan references that would
        // otherwise prevent the constraints from being installed.
        DB::statement('UPDATE requests SET client_id = NULL WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients WHERE clients.id = requests.client_id)');
        DB::statement('UPDATE requests SET land_id = NULL WHERE land_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lands WHERE lands.id = requests.land_id)');
        DB::statement('UPDATE searches SET client_id = NULL WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients WHERE clients.id = searches.client_id)');
        DB::statement('UPDATE land_files SET client_id = NULL WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients WHERE clients.id = land_files.client_id)');

        Schema::table('requests', function (Blueprint $table) {
            $table->foreign('client_id', 'requests_client_id_fk')
                ->references('id')->on('clients')->nullOnDelete();
            $table->foreign('land_id', 'requests_land_id_fk')
                ->references('id')->on('lands')->nullOnDelete();
        });

        Schema::table('searches', function (Blueprint $table) {
            $table->foreign('client_id', 'searches_client_id_fk')
                ->references('id')->on('clients')->nullOnDelete();
        });

        Schema::table('land_files', function (Blueprint $table) {
            $table->foreign('client_id', 'land_files_client_id_fk')
                ->references('id')->on('clients')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('land_files', fn (Blueprint $table) => $table->dropForeign('land_files_client_id_fk'));
        Schema::table('searches', fn (Blueprint $table) => $table->dropForeign('searches_client_id_fk'));
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign('requests_client_id_fk');
            $table->dropForeign('requests_land_id_fk');
        });
    }
};
