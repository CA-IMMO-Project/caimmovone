<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateMessageRequest;
use App\Models\ContactMessage;

class MessageController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => ContactMessage::query()->orderByDesc('id')->get()->map(fn (ContactMessage $m) => $m->toAdminArray()),
        ]);
    }

    public function update(UpdateMessageRequest $request, string $id)
    {
        $m = ContactMessage::findOrFail($id);
        $data = $request->validated();
        // Le front envoie { status: 'nouveau' | 'traité' | 'archivé' } → colonne booléenne `read`.
        $read = array_key_exists('read', $data) && $data['read'] !== null
            ? (bool) $data['read']
            : in_array($data['status'] ?? '', ['traité', 'archivé'], true);
        $m->update(['read' => $read]);

        return response()->json($m->toAdminArray());
    }

    public function destroy(string $id)
    {
        ContactMessage::findOrFail($id)->delete();

        return response()->json(['message' => 'Message supprimé.']);
    }
}
