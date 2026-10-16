/** Local calendar dates as YYYY-MM-DD. (toISOString() is UTC and would shift the day in IST.) */
const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const today = () => toLocalDate(new Date());

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export const isRealDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());
