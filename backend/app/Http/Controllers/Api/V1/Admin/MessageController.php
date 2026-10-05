<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => ContactMessage::query()->orderByDesc('id')->get()->map(fn (ContactMessage $m) => $m->toAdminArray()),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $m = ContactMessage::findOrFail($id);
        // Le front envoie { status: 'nouveau' | 'traité' } → colonne booléenne `read`.
        $read = $request->has('read') ? $request->boolean('read') : ($request->input('status') === 'traité');
        $m->update(['read' => $read]);

        return response()->json($m->toAdminArray());
    }

    public function destroy(string $id)
    {
        ContactMessage::findOrFail($id)->delete();

        return response()->json(['message' => 'Message supprimé.']);
    }
}
