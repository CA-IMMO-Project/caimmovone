/* Source unique des styles primitifs du back office. */
export const ADMIN_SURFACE = 'bg-white rounded-2xl border border-gray-200 shadow-sm';

export const ADMIN_INPUT =
  'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-navy-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

export const ADMIN_BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
export const ADMIN_BUTTON_PRIMARY = `${ADMIN_BUTTON_BASE} bg-navy-900 text-white hover:bg-navy-800`;
export const ADMIN_BUTTON_GOLD = `${ADMIN_BUTTON_BASE} bg-gold-500 text-navy-950 hover:bg-gold-400`;
export const ADMIN_BUTTON_OUTLINE = `${ADMIN_BUTTON_BASE} border border-gray-300 bg-white text-navy-900 hover:bg-gray-50`;
export const ADMIN_BUTTON_DANGER = `${ADMIN_BUTTON_BASE} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
export const ADMIN_BUTTON_GHOST =
  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed';
export const ADMIN_BUTTON_ICON =
  'inline-flex items-center justify-center p-2 rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-navy-900 disabled:opacity-40 disabled:cursor-not-allowed';

export const ADMIN_BADGE_BASE =
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs whitespace-nowrap';
