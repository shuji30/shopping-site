// レンタル日付まわりの共通ヘルパー

/** ローカル日付を YYYY-MM-DD で返す */
export function toISODate(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** YYYY-MM-DD に日数を加算して YYYY-MM-DD を返す */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** レンタル終了日（開始日 + 日数 - 1） */
export function rentalEndDate(startISO: string, rentalDays: number): string {
  return addDays(startISO, rentalDays - 1);
}

/** YYYY-MM-DD → YYYY/MM/DD */
export function formatJP(iso: string): string {
  return iso.replaceAll("-", "/");
}
