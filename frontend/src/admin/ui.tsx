import { ReactNode } from 'react';
import type { RequestStatus } from '../lib/store';
import { formatDateTime } from '../lib/format';
import { ADMIN_BADGE_BASE, ADMIN_BUTTON_GHOST, ADMIN_BUTTON_PRIMARY, ADMIN_INPUT, ADMIN_SURFACE } from './tokens';
import { adminStatusClass } from './status';

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
  return <div className={`${ADMIN_SURFACE} ${className}`}>{children}</div>;
}

export function Badge({ value }: { value: string }) {
  return (
    <span className={`${ADMIN_BADGE_BASE} capitalize font-semibold ${adminStatusClass(value)}`}>
      {value}
    </span>
  );
}

export const REQUEST_STATUSES: RequestStatus[] = ['nouveau', 'traité', 'archivé'];

export function formatDate(iso: string) {
  return formatDateTime(iso);
}

// Primitives partagés avec les écrans CRM.
export const inputClass = ADMIN_INPUT;
export const btnPrimary = ADMIN_BUTTON_PRIMARY;
export const btnGhost = ADMIN_BUTTON_GHOST;
