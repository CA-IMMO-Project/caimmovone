<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reference_counters', function (Blueprint $table) {
            $table->string('scope', 32);
            $table->date('reference_date');
            $table->unsignedInteger('value')->default(0);
            $table->primary(['scope', 'reference_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reference_counters');
    }
};
