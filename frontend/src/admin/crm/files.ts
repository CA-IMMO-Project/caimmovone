// Stockage des fichiers (photos, vidéos, pièces) dans IndexedDB :
// localStorage est limité à ~5 Mo, insuffisant pour des photos de 15 Mo ou des vidéos de 100 Mo.
import { useEffect, useState } from 'react';
import { fetchProtectedFile, uploadFile } from '../../services/adminService';
import type { StoredFile } from './model';

const DB = 'caimmo-files';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putFile(file: File, visibility: 'public' | 'private' = 'private'): Promise<StoredFile> {
  // Les pièces CRM sont privées par défaut ; seuls les médias explicitement
  // destinés au catalogue ou aux réalisations sont publiés.
  const uploaded = await uploadFile(file, visibility);
  return { id: uploaded.id, name: uploaded.name, type: uploaded.type, size: uploaded.size, url: uploaded.url };
}

export async function getBlob(f: StoredFile): Promise<Blob | undefined> {
  if (f.url) return fetchProtectedFile(f.url);
  return tx<Blob | undefined>('readonly', (s) => s.get(f.id));
}

export function removeFile(f: StoredFile) {
  if (!f.url) tx('readwrite', (s) => s.delete(f.id)).catch(() => {});
}

/** URL affichable d'un fichier stocké (libérée automatiquement). */
export function useFileUrl(f?: StoredFile) {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    if (!f) return setUrl(undefined);
    let objectUrl: string | undefined;
    let alive = true;
    const source = f.url ? fetchProtectedFile(f.url) : tx<Blob | undefined>('readonly', (s) => s.get(f.id));
    source.then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => alive && setUrl(undefined));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [f?.id, f?.url]);
  return url;
}

export async function downloadFile(f: StoredFile) {
  const blob = await getBlob(f);
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = f.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
