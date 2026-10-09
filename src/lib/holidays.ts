// 日本の祝日を計算で求める（「国民の祝日に関する法律」2020年以降の規定）。
// ネットの祝日データに頼らず端末内で完結させるため。法改正や臨時の祝日があればここを直す。
// 春分・秋分の日は 1980〜2099 年で有効な近似式。

const FIXED: [number, number, string][] = [
  [1, 1, "元日"],
  [2, 11, "建国記念の日"],
  [2, 23, "天皇誕生日"],
  [4, 29, "昭和の日"],
  [5, 3, "憲法記念日"],
  [5, 4, "みどりの日"],
  [5, 5, "こどもの日"],
  [8, 11, "山の日"],
  [11, 3, "文化の日"],
  [11, 23, "勤労感謝の日"],
];

// 第 n 月曜日（ハッピーマンデー）
const HAPPY_MONDAY: [number, number, string][] = [
  [1, 2, "成人の日"],
  [7, 3, "海の日"],
  [9, 3, "敬老の日"],
  [10, 2, "スポーツの日"],
];

function nthMonday(year: number, month: number, n: number): number {
  const firstWd = new Date(year, month - 1, 1).getDay();
  return 1 + ((8 - firstWd) % 7) + (n - 1) * 7;
}

function equinox(year: number, base: number): number {
  const t = year - 1980;
  return Math.floor(base + 0.242194 * t - Math.floor(t / 4));
}

const key = (m: number, d: number) => `${m}-${d}`;
const cache = new Map<number, Map<string, string>>();

/** その年の祝日。キーは "月-日"、日付順 */
export function holidaysOf(year: number): Map<string, string> {
  const hit = cache.get(year);
  if (hit) return hit;

  const base = new Map<string, string>();
  for (const [m, d, name] of FIXED) base.set(key(m, d), name);
  for (const [m, n, name] of HAPPY_MONDAY) base.set(key(m, nthMonday(year, m, n)), name);
  base.set(key(3, equinox(year, 20.8431)), "春分の日");
  base.set(key(9, equinox(year, 23.2488)), "秋分の日");

  const all = new Map(base);
  const isHoliday = (dt: Date) => all.has(key(dt.getMonth() + 1, dt.getDate()));

  // 国民の休日：前日と翌日が祝日にはさまれた平日（日曜でない日）
  for (let dt = new Date(year, 0, 2); dt.getFullYear() === year; dt.setDate(dt.getDate() + 1)) {
    const prev = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - 1);
    const next = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
    const k = key(dt.getMonth() + 1, dt.getDate());
    if (
      !base.has(k) &&
      dt.getDay() !== 0 &&
      base.has(key(prev.getMonth() + 1, prev.getDate())) &&
      base.has(key(next.getMonth() + 1, next.getDate()))
    ) {
      all.set(k, "国民の休日");
    }
  }

  // 振替休日：祝日が日曜なら、その後の最初の「祝日でない日」
  for (const k of base.keys()) {
    const [m, d] = k.split("-").map(Number);
    if (new Date(year, m - 1, d).getDay() !== 0) continue;
    const sub = new Date(year, m - 1, d + 1);
    while (isHoliday(sub)) sub.setDate(sub.getDate() + 1);
    all.set(key(sub.getMonth() + 1, sub.getDate()), "振替休日");
  }

  const sorted = new Map(
    [...all.entries()].sort(([a], [b]) => {
      const [am, ad] = a.split("-").map(Number);
      const [bm, bd] = b.split("-").map(Number);
      return am - bm || ad - bd;
    }),
  );
  cache.set(year, sorted);
  return sorted;
}

export function holidayName(date: Date): string | undefined {
  return holidaysOf(date.getFullYear()).get(key(date.getMonth() + 1, date.getDate()));
}
