<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lands', function (Blueprint $table) {
            $table->string('publication_status')->default('publie')->index()->after('featured');
        });
    }

    public function down(): void
    {
        Schema::table('lands', function (Blueprint $table) {
            $table->dropColumn('publication_status');
        });
    }
};
