/* ==========================================================================
   Client HTTP — point de passage unique vers l'API Laravel (backend/).
   En développement, Vite proxifie /api vers http://127.0.0.1:8000
   (voir vite.config.ts) ; en production, renseignez VITE_API_URL.
   ========================================================================== */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.', 0);
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}.`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}
