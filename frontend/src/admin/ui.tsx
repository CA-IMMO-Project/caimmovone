import { ReactNode } from 'react';
import type { RequestStatus } from '../lib/store';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-navy-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>;
}

const STATUS_STYLES: Record<string, string> = {
  disponible: 'bg-blue-100 text-blue-800',
  réservé: 'bg-amber-100 text-amber-800',
  vendu: 'bg-gray-200 text-gray-700',
  nouveau: 'bg-blue-100 text-blue-800',
  traité: 'bg-blue-100 text-blue-800',
  archivé: 'bg-gray-200 text-gray-700',
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[value] ?? 'bg-gray-100'}`}>
      {value}
    </span>
  );
}

export const REQUEST_STATUSES: RequestStatus[] = ['nouveau', 'traité', 'archivé'];

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500';

export const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800';

export const btnGhost =
  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100';
