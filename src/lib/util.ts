// 从旧版单文件 HTML 移植的纯函数工具

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function norm(s: string): string {
  return String(s).trim().toLowerCase().replace(/\s+/g, " ");
}

// 拼写校验：大小写/空格/连字符不敏感
export function checkSpelling(ans: string, target: string): boolean {
  const a = norm(ans), t = norm(target);
  if (!a || !t) return false;
  if (a === t) return true;
  return a.replace(/[\s-]/g, "") === t.replace(/[\s-]/g, "");
}

// 英→中释义匹配
export function checkMeaning(ans: string, zh: string): boolean {
  const targets = zh.split(/[,/;，；、]/).map(norm).filter(Boolean);
  const a = norm(ans);
  return (
    targets.includes(a) ||
    targets.some((t) => t.length >= 3 && a === t.replace(/[的了地]$/, ""))
  );
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

export function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function dateStr(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// 连续打卡天数：从今天（或昨天）往前数
export function calcStreak(checkin: Record<string, unknown>): number {
  const days = Object.keys(checkin).sort();
  if (days.length === 0) return 0;
  let cursor = todayStr();
  if (!checkin[cursor]) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    cursor = dateStr(y);
    if (!checkin[cursor]) return 0;
  }
  let streak = 0;
  while (checkin[cursor]) {
    streak++;
    const d = new Date(cursor + "T00:00:00");
    d.setDate(d.getDate() - 1);
    cursor = dateStr(d);
  }
  return streak;
}

/* ============ 语音合成 ============ */
export function speak(text: string, slow = false) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = slow ? 0.5 : 0.85;
  const voices = speechSynthesis.getVoices();
  const v =
    voices.find((x) => x.lang?.startsWith("en") && /female|samantha|zira|google us english/i.test(x.name)) ||
    voices.find((x) => x.lang?.startsWith("en-US")) ||
    voices.find((x) => x.lang?.startsWith("en"));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

/* ============ 艾宾浩斯复习计划 ============ */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15]; // 天

export function nextReviewState(
  prev: { box: number } | null,
  correct: boolean
): { box: number; next_review: string; last_review: string } {
  const box = correct
    ? Math.min((prev?.box ?? 0) + 1, REVIEW_INTERVALS.length - 1)
    : 0;
  const now = new Date();
  const next = new Date(now.getTime() + REVIEW_INTERVALS[box] * 86400000);
  return {
    box,
    next_review: next.toISOString(),
    last_review: now.toISOString(),
  };
}

/* ============ 联网查音标（dictionaryapi.dev） ============ */
export async function fetchPhonetic(
  word: string
): Promise<{ phon: string; ex: string } | null> {
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(
        "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word)
      );
      if (res.status === 404) return null;
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const entry = data[0];
      let phon = entry.phonetic || "";
      if (!phon && Array.isArray(entry.phonetics)) {
        const p = entry.phonetics.find((x: { text?: string }) => x.text);
        if (p) phon = p.text;
      }
      let ex = "";
      if (Array.isArray(entry.meanings) && entry.meanings.length > 0) {
        const defs = entry.meanings[0].definitions;
        if (defs?.length > 0 && defs[0].example) ex = defs[0].example;
      }
      return { phon: phon || "", ex: ex || "" };
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

/* ============ 排行榜综合评分 ============ */
export function calcScore(pct: number, total: number, time: number): number {
  const avgTime = total ? time / total : 0;
  const speedScore = Math.max(0, Math.round(100 - avgTime * 5));
  return Math.round(pct * 0.6 + speedScore * 0.4);
}
