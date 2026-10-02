<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/* Clients (fiches créées automatiquement par les demandes du site public)
   et demandes reçues (achat / visite / recherche / vente). */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('phone')->index();
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->string('source')->default('Site web');
            $table->timestamps();
        });

        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->string('ref')->unique(); // ACH-260930, VIS-260930, REC-…, VEN-…
            $table->string('kind')->index();  // interet | visite | recherche | vente
            $table->unsignedBigInteger('land_id')->nullable()->index();
            $table->unsignedBigInteger('client_id')->nullable()->index();
            $table->string('full_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->text('message')->nullable();
            $table->jsonb('meta')->nullable();      // budget, visitDate, paymentMode, etc.
            $table->string('status')->default('Nouvelle')->index();
            $table->string('priority')->default('Haute');
            $table->string('source')->default('Site web');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requests');
        Schema::dropIfExists('clients');
    }
};
