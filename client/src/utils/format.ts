export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const toInputDate = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const daysUntil = (d?: string | null) => (d ? Math.ceil((+new Date(d) - Date.now()) / 86_400_000) : null);
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
export const isHttp = (u?: string | null) => !!u && /^https?:\/\//i.test(u);
export const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;
export const ago = (d: string) => {
  const m = Math.round((Date.now() - +new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
