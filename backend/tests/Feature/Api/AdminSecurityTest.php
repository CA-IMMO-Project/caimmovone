<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_route_rejects_anonymous_user(): void
    {
        $this->getJson('/api/v1/admin/clients')->assertUnauthorized();
    }

    public function test_admin_route_rejects_token_without_admin_ability(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['read']);
        $this->getJson('/api/v1/admin/clients')->assertForbidden();
    }

    public function test_admin_route_accepts_admin_ability(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['admin']);
        $this->getJson('/api/v1/admin/clients')->assertOk();
    }

    public function test_login_returns_bearer_token_and_revokes_old_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@example.test',
            'password' => Hash::make('a-strong-password'),
        ]);
        $user->createToken('old', ['admin']);

        $response = $this->postJson('/api/v1/admin/login', [
            'email' => 'admin@example.test',
            'password' => 'a-strong-password',
        ]);

        $response->assertOk()->assertJsonStructure(['token', 'user']);
        $this->assertSame(1, $user->fresh()->tokens()->count());
        $this->assertSame(['admin'], $user->fresh()->tokens()->first()->abilities);
    }

    public function test_login_rejects_bad_credentials(): void
    {
        User::factory()->create([
            'email' => 'admin@example.test',
            'password' => Hash::make('a-strong-password'),
        ]);

        $this->postJson('/api/v1/admin/login', [
            'email' => 'admin@example.test',
            'password' => 'wrong-password-value',
        ])->assertUnauthorized();
    }
}
