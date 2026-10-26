import { create } from "zustand";
import { supabase } from "./lib/supabase";
import {
  Book, Group, LeaderEntry, QuizMode, QuizState, QuizWord, Settings,
  Student, Word, DEFAULT_SETTINGS, DayStat,
} from "./lib/types";
import { calcScore, nextReviewState, shuffle, todayStr } from "./lib/util";

export interface ScopeOptions {
  scope: "all" | "notlearned" | "learned" | "notmastered" | "wrong";
  order: "shuffle" | "seq" | "rev";
  batchSize: number | "all";
  rangeStart: number;
  rangeEnd: number;
}

interface AppState {
  ready: boolean;
  session: string | null; // auth user id
  email: string;
  students: Student[];
  studentId: string | null;
  role: "student" | "parent";
  groups: Group[];
  books: Book[];
  words: Word[];
  curGroupId: string | null;
  curBookId: string | null;
  progress: Record<string, { learned: boolean; mastered: boolean }>;
  wrong: Record<string, { wrong_count: number; last_wrong_at: string }>;
  review: Record<string, { box: number; next_review: string; last_review: string }>;
  stats: Record<string, DayStat>;
  leaderboard: LeaderEntry[];
  settings: Settings;
  scope: ScopeOptions;
  quiz: QuizState | null;
  view: string;
  toastMsg: string;

  init(): Promise<void>;
  signUp(email: string, pwd: string): Promise<string | null>;
  signIn(email: string, pwd: string): Promise<string | null>;
  signOut(): Promise<void>;
  addStudent(name: string, avatar: string): Promise<void>;
  loadStudents(): Promise<void>;
  selectStudent(id: string): Promise<void>;
  loadData(): Promise<void>;
  setView(v: string): void;
  toast(msg: string): void;
  setCurGroup(id: string): void;
  setCurBook(id: string): void;
  setScope(patch: Partial<ScopeOptions>): void;
  startQuiz(mode: QuizMode): void;
  answer(ans: string): Promise<void>;
  revealAnswer(): Promise<void>;
  skipQuestion(): Promise<void>;
  nextQuestion(): void;
  chooseOption(opt: string): Promise<void>;
  flipCard(): Promise<void>;
  markLearned(i: number): Promise<void>;
  finishAnswer(w: QuizWord, correct: boolean, skip: boolean, retryUsed: boolean): Promise<void>;
  effectiveSetting(key: "realtimeCheck" | "rtReveal" | "previewWords"): boolean;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  enterParent(pwd: string): Promise<string | null>;
  exitParent(): void;
  // 词库 CRUD
  addGroup(name: string): Promise<void>;
  renameGroup(id: string, name: string): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  addBook(groupId: string, name: string): Promise<void>;
  renameBook(id: string, name: string): Promise<void>;
  deleteBook(id: string): Promise<void>;
  addWord(en: string, zh: string): Promise<string | null>;
  updateWord(id: string, patch: Partial<Word>): Promise<void>;
  deleteWord(id: string): Promise<void>;
  importWords(rows: { en: string; zh: string }[], autoPhon: boolean): Promise<number>;
  clearWrong(): Promise<void>;
}

const RANKED_MODES: QuizMode[] = ["ce", "ec", "listen", "review", "learned-quiz", "smart", "ebbing", "choice"];
const SPELL_MODES: QuizMode[] = ["ce", "listen", "review", "learned-quiz", "smart", "ebbing"];

// ---------- 辅助（非 store 状态） ----------
function bumpStat(stats: Record<string, DayStat>, type: "learn" | "right" | "wrong", n: number): Record<string, DayStat> {
  const t = todayStr();
  const cur = stats[t] || { learn: 0, quiz: 0, right: 0, wrong: 0 };
  const next =
    type === "learn" ? { ...cur, learn: cur.learn + n }
      : type === "right" ? { ...cur, quiz: cur.quiz + n, right: cur.right + n }
        : { ...cur, quiz: cur.quiz + n, wrong: cur.wrong + n };
  return { ...stats, [t]: next };
}

async function bumpStatDb(uid: string, sid: string, type: "learn" | "right" | "wrong", n: number) {
  const t = todayStr();
  const { data } = await supabase
    .from("stats_daily")
    .select("id,learn,quiz,right_cnt,wrong_cnt")
    .eq("student_id", sid).eq("date", t).maybeSingle();
  if (data) {
    const patch =
      type === "learn" ? { learn: data.learn + n }
        : type === "right" ? { quiz: data.quiz + n, right_cnt: data.right_cnt + n }
          : { quiz: data.quiz + n, wrong_cnt: data.wrong_cnt + n };
    await supabase.from("stats_daily").update(patch).eq("id", data.id);
  } else {
    const init =
      type === "learn" ? { learn: n, quiz: 0, right_cnt: 0, wrong_cnt: 0 }
        : type === "right" ? { learn: 0, quiz: n, right_cnt: n, wrong_cnt: 0 }
          : { learn: 0, quiz: n, right_cnt: 0, wrong_cnt: n };
    await supabase.from("stats_daily").insert({ family_id: uid, student_id: sid, date: t, ...init });
  }
}

async function upsertProgress(uid: string, sid: string, wordId: string, prog: { learned: boolean; mastered: boolean }) {
  await supabase.from("word_progress").upsert(
    { family_id: uid, student_id: sid, word_id: wordId, learned: prog.learned, mastered: prog.mastered },
    { onConflict: "student_id,word_id" }
  );
}

function buildChoiceOptions(words: Word[], target: Word): string[] {
  const pool = words.filter((w) => w.book_id === target.book_id && w.id !== target.id);
  const distractors = shuffle(pool).slice(0, 3).map((w) => w.en);
  return shuffle([target.en, ...distractors]);
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  session: null,
  email: "",
  students: [],
  studentId: null,
  role: "student",
  groups: [],
  books: [],
  words: [],
  curGroupId: null,
  curBookId: null,
  progress: {},
  wrong: {},
  review: {},
  stats: {},
  leaderboard: [],
  settings: { ...DEFAULT_SETTINGS },
  scope: { scope: "all", order: "shuffle", batchSize: 20, rangeStart: 1, rangeEnd: 0 },
  quiz: null,
  view: "home",
  toastMsg: "",

  async init() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id ?? null;
    set({ ready: true, session: uid, email: data.session?.user.email ?? "" });
    if (uid) await get().loadStudents();
  },

  async signUp(email, pwd) {
    const { error } = await supabase.auth.signUp({ email, password: pwd });
    if (error) return error.message;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      set({ session: data.session.user.id, email: data.session.user.email ?? email });
      await get().loadStudents();
    }
    return null;
  },

  async signIn(email, pwd) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) return error.message;
    set({ session: data.user.id, email: data.user.email ?? email });
    await get().loadStudents();
    return null;
  },

  async signOut() {
    await supabase.auth.signOut();
    set({
      session: null, email: "", students: [], studentId: null, role: "student",
      groups: [], books: [], words: [], progress: {}, wrong: {}, review: {},
      stats: {}, leaderboard: [], curGroupId: null, curBookId: null, quiz: null, view: "home",
    });
  },

  async addStudent(name, avatar) {
    const uid = get().session!;
    const { data } = await supabase.from("students").insert({ family_id: uid, name, avatar }).select().single();
    if (data) {
      set({ students: [...get().students, data as Student] });
      await get().selectStudent(data.id);
    }
  },

  async loadStudents() {
    const uid = get().session;
    if (!uid) return;
    const { data } = await supabase.from("students").select("id,name,avatar").order("created_at");
    set({ students: (data || []) as Student[] });
  },

  async selectStudent(id) {
    set({ studentId: id, role: "student", view: "home" });
    await get().loadData();
  },

  async loadData() {
    const uid = get().session;
    const sid = get().studentId;
    if (!uid || !sid) return;
    const [groups, books, words, settingsRes] = await Promise.all([
      supabase.from("word_groups").select("id,name").order("sort_order"),
      supabase.from("word_books").select("id,group_id,name").order("sort_order"),
      supabase.from("words").select("id,book_id,en,zh,phon,ex").order("sort_order"),
      supabase.from("settings").select("data").eq("family_id", uid).maybeSingle(),
    ]);
    const [progRes, wrongRes, reviewRes, statsRes, lbRes] = await Promise.all([
      supabase.from("word_progress").select("word_id,learned,mastered").eq("student_id", sid),
      supabase.from("wrong_words").select("word_id,wrong_count,last_wrong_at").eq("student_id", sid),
      supabase.from("review_plan").select("word_id,box,next_review,last_review").eq("student_id", sid),
      supabase.from("stats_daily").select("date,learn,quiz,right_cnt,wrong_cnt").eq("student_id", sid),
      supabase.from("leaderboard").select("mode,date,total,right_cnt,wrong_cnt,time_sec,pct,score").order("score", { ascending: false }).limit(200),
    ]);
    const progress: Record<string, { learned: boolean; mastered: boolean }> = {};
    (progRes.data || []).forEach((p: { word_id: string; learned: boolean; mastered: boolean }) => {
      progress[p.word_id] = { learned: p.learned, mastered: p.mastered };
    });
    const wrong: Record<string, { wrong_count: number; last_wrong_at: string }> = {};
    (wrongRes.data || []).forEach((w: { word_id: string; wrong_count: number; last_wrong_at: string }) => {
      wrong[w.word_id] = { wrong_count: w.wrong_count, last_wrong_at: w.last_wrong_at };
    });
    const review: Record<string, { box: number; next_review: string; last_review: string }> = {};
    (reviewRes.data || []).forEach((r: { word_id: string; box: number; next_review: string; last_review: string }) => {
      review[r.word_id] = { box: r.box, next_review: r.next_review, last_review: r.last_review };
    });
    const stats: Record<string, DayStat> = {};
    (statsRes.data || []).forEach((s: { date: string; learn: number; quiz: number; right_cnt: number; wrong_cnt: number }) => {
      stats[s.date] = { learn: s.learn, quiz: s.quiz, right: s.right_cnt, wrong: s.wrong_cnt };
    });
    const leaderboard: LeaderEntry[] = (lbRes.data || []).map((e: {
      mode: string; date: string; total: number; right_cnt: number; wrong_cnt: number; time_sec: number; pct: number; score: number;
    }) => ({ mode: e.mode, date: e.date, total: e.total, right: e.right_cnt, wrong: e.wrong_cnt, time: e.time_sec, pct: e.pct, score: e.score }));
    const settings = { ...DEFAULT_SETTINGS, ...((settingsRes.data?.data as Partial<Settings>) || {}) };
    settings.permConfig = { ...DEFAULT_SETTINGS.permConfig, ...(settings.permConfig || {}) };
    document.body.classList.toggle("dark", settings.darkTheme);
    const g = (groups.data || []) as Group[];
    const b = (books.data || []) as Book[];
    const w = (words.data || []) as Word[];
    const prevG = get().curGroupId, prevB = get().curBookId;
    const curGroupId = prevG && g.some((x) => x.id === prevG) ? prevG : (g[0]?.id ?? null);
    const curBookId = prevB && b.some((x) => x.id === prevB) ? prevB : (b.find((x) => x.group_id === curGroupId)?.id ?? b[0]?.id ?? null);
    set({ groups: g, books: b, words: w, progress, wrong, review, stats, leaderboard, settings, curGroupId, curBookId });
  },

  setView(v) { set({ view: v }); },
  toast(msg) {
    set({ toastMsg: msg });
    setTimeout(() => { if (useApp.getState().toastMsg === msg) useApp.setState({ toastMsg: "" }); }, 1800);
  },
  setCurGroup(id) {
    const first = get().books.find((b) => b.group_id === id)?.id ?? null;
    set({ curGroupId: id, curBookId: first });
  },
  setCurBook(id) { set({ curBookId: id }); },
  setScope(patch) { set({ scope: { ...get().scope, ...patch } }); },

  // ---------- 组建本轮队列 ----------
  startQuiz(mode) {
    const s = get();
    const book = s.books.find((b) => b.id === s.curBookId);
    if (!book) { s.toast("请先创建单词本"); return; }
    let pool: Word[] = s.words.filter((w) => w.book_id === book.id);
    const P = (w: Word) => s.progress[w.id] || { learned: false, mastered: false };
    const sc = s.scope;
    if (mode === "review") pool = pool.filter((w) => s.wrong[w.id]);
    else if (mode === "learned-quiz") pool = pool.filter((w) => P(w).learned);
    else if (mode === "smart") {
      const now = Date.now();
      const scored = pool.map((w) => {
        let score = 0;
        const wr = s.wrong[w.id];
        if (wr) {
          score += wr.wrong_count * 10;
          score += Math.max(0, 7 - (now - new Date(wr.last_wrong_at).getTime()) / 86400000);
        }
        if (!P(w).mastered) score += 5;
        if (s.review[w.id] && new Date(s.review[w.id].next_review).getTime() <= now) score += 15;
        if (P(w).learned && !P(w).mastered) score += 3;
        return { w, score };
      }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
      pool = scored.slice(0, sc.batchSize === "all" ? 50 : sc.batchSize).map((x) => x.w);
    } else if (mode === "ebbing") {
      const now = Date.now();
      pool = pool.filter((w) => s.review[w.id] && new Date(s.review[w.id].next_review).getTime() <= now);
    } else {
      if (sc.scope === "notlearned") pool = pool.filter((w) => !P(w).learned);
      else if (sc.scope === "learned") pool = pool.filter((w) => P(w).learned);
      else if (sc.scope === "notmastered") pool = pool.filter((w) => !P(w).mastered);
      else if (sc.scope === "wrong") pool = pool.filter((w) => s.wrong[w.id]);
    }
    if (sc.rangeEnd > 0 && mode !== "smart") pool = pool.filter((_, i) => i + 1 >= sc.rangeStart && i + 1 <= sc.rangeEnd);
    if (sc.order === "shuffle") pool = shuffle(pool);
    else if (sc.order === "rev") pool = pool.slice().reverse();
    if (sc.batchSize !== "all" && mode !== "smart") pool = pool.slice(0, sc.batchSize);
    if (pool.length === 0) { s.toast("没有符合条件的单词"); return; }
    const queue: QuizWord[] = pool.map((w) => ({ ...w, ...P(w) }));
    const quiz: QuizState = {
      mode, queue, idx: 0, right: 0, wrong: 0, skip: 0, wrongThisRound: [],
      answered: false, retries: 0, startTime: Date.now(), totalTime: 0,
      feedback: "", feedbackText: "", choiceOptions: [], cardFlipped: false,
    };
    if (mode === "choice") quiz.choiceOptions = buildChoiceOptions(s.words, pool[0]);
    set({ quiz, view: "quiz" });
  },

  // ---------- 答题 ----------
  async answer(ans) {
    const s = get();
    const q = s.quiz!;
    if (q.answered) return;
    const w = q.queue[q.idx];
    let correct = false;
    if (q.mode === "ec") {
      const targets = w.zh.split(/[,/;，；、]/).map((t) => t.trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean);
      const a = ans.trim().toLowerCase().replace(/\s+/g, " ");
      correct = targets.includes(a) || targets.some((t) => t.length >= 3 && a === t.replace(/[的了地]$/, ""));
    } else if (q.mode === "choice") {
      correct = ans === w.en;
    } else {
      const a = ans.trim().toLowerCase().replace(/\s+/g, " ");
      const t = w.en.trim().toLowerCase();
      correct = !!a && (a === t || a.replace(/[\s-]/g, "") === t.replace(/[\s-]/g, ""));
    }
    if (correct) {
      set({ quiz: { ...q, answered: true, right: q.right + 1, feedback: "ok", feedbackText: "✅ 正确！" + (q.retries > 0 ? "（重试通过）" : "") } });
      await get().finishAnswer(w, true, false, q.retries > 0);
    } else if (q.retries < 1 && q.mode !== "choice") {
      set({ quiz: { ...q, retries: q.retries + 1, answered: false, feedback: "retry", feedbackText: "❌ 不对，再试一次！" } });
    } else {
      set({
        quiz: {
          ...q, answered: true, wrong: q.wrong + 1, wrongThisRound: [...q.wrongThisRound, w], feedback: "bad",
          feedbackText: q.mode === "ec" || q.mode === "choice" ? "❌ 正确释义：" + w.zh : "❌ 正确拼写：" + w.en,
        },
      });
      await get().finishAnswer(w, false, false, q.retries > 0);
    }
  },

  async revealAnswer() {
    const s = get();
    const q = s.quiz!;
    const w = q.queue[q.idx];
    set({
      quiz: {
        ...q, answered: true, wrong: q.wrong + 1, wrongThisRound: [...q.wrongThisRound, w],
        feedback: "bad", feedbackText: "❌ 正确拼写：" + w.en,
      },
    });
    await get().finishAnswer(w, false, false, true);
  },

  async skipQuestion() {
    const s = get();
    const q = s.quiz!;
    if (q.answered) { get().nextQuestion(); return; }
    const w = q.queue[q.idx];
    set({
      quiz: {
        ...q, skip: q.skip + 1, answered: true, wrongThisRound: [...q.wrongThisRound, w],
        feedback: "bad", feedbackText: q.mode === "ec" ? "⏭ 释义：" + w.zh : "⏭ 拼写：" + w.en,
      },
    });
    await get().finishAnswer(w, false, true, false);
  },

  nextQuestion() {
    const s = get();
    const q = s.quiz!;
    const idx = q.idx + 1;
    if (idx >= q.queue.length) {
      const totalTime = Math.floor((Date.now() - q.startTime) / 1000);
      const total = q.queue.length;
      const pct = total ? Math.round((q.right / total) * 100) : 0;
      if (RANKED_MODES.includes(q.mode) && total > 0 && s.studentId) {
        const score = calcScore(pct, total, totalTime);
        supabase.from("leaderboard").insert({
          family_id: s.session, student_id: s.studentId, mode: q.mode, date: todayStr(),
          total, right_cnt: q.right, wrong_cnt: q.wrong + q.skip, time_sec: totalTime, pct, score,
        }).then(() => get().loadData());
      }
      set({ quiz: { ...q, totalTime }, view: "result" });
      return;
    }
    const quiz: QuizState = { ...q, idx, answered: false, retries: 0, feedback: "", feedbackText: "", cardFlipped: false };
    if (q.mode === "choice") quiz.choiceOptions = buildChoiceOptions(get().words, q.queue[idx]);
    set({ quiz });
  },

  async chooseOption(opt) {
    const q = get().quiz!;
    if (q.answered || q.mode !== "choice") return;
    const w = q.queue[q.idx];
    const correct = opt === w.en;
    const patch: Partial<QuizState> = correct
      ? { answered: true, right: q.right + 1, feedback: "ok", feedbackText: "✅ 正确！" }
      : { answered: true, wrong: q.wrong + 1, wrongThisRound: [...q.wrongThisRound, w], feedback: "bad", feedbackText: "❌ 正确答案：" + w.en };
    set({ quiz: { ...q, ...patch } });
    await get().finishAnswer(w, correct, false, false);
  },

  async flipCard() {
    const q = get().quiz!;
    const flipped = !q.cardFlipped;
    set({ quiz: { ...q, cardFlipped: flipped } });
    if (flipped && !q.queue[q.idx].learned) await get().markLearned(q.idx);
  },

  async markLearned(i) {
    const s = get();
    const q = s.quiz!;
    const w = q.queue[i];
    if (w.learned) return;
    set({
      progress: { ...s.progress, [w.id]: { learned: true, mastered: w.mastered } },
      quiz: { ...q, queue: q.queue.map((x, j) => (j === i ? { ...x, learned: true } : x)) },
      stats: bumpStat(s.stats, "learn", 1),
    });
    await upsertProgress(s.session!, s.studentId!, w.id, { learned: true, mastered: w.mastered });
    await bumpStatDb(s.session!, s.studentId!, "learn", 1);
  },

  // ---------- 答题收尾：进度/错词/复习/统计 入库 ----------
  async finishAnswer(w, correct, skip, retryUsed) {
    const s = get();
    const uid = s.session!, sid = s.studentId!;
    const mode = s.quiz!.mode;
    const nowIso = new Date().toISOString();
    // 学习进度
    const prog = { learned: true, mastered: correct };
    set({ progress: { ...get().progress, [w.id]: prog } });
    await upsertProgress(uid, sid, w.id, prog);
    // 错词本
    if (correct) {
      if (s.wrong[w.id]) {
        const wrong = { ...get().wrong };
        delete wrong[w.id];
        set({ wrong });
        await supabase.from("wrong_words").delete().eq("student_id", sid).eq("word_id", w.id);
      }
    } else {
      const count = (s.wrong[w.id]?.wrong_count ?? 0) + 1;
      set({ wrong: { ...get().wrong, [w.id]: { wrong_count: count, last_wrong_at: nowIso } } });
      await supabase.from("wrong_words").upsert(
        { family_id: uid, student_id: sid, word_id: w.id, wrong_count: count, last_wrong_at: nowIso },
        { onConflict: "student_id,word_id" }
      );
    }
    // 艾宾浩斯
    if (SPELL_MODES.includes(mode) || mode === "ec" || mode === "choice") {
      const st = nextReviewState(s.review[w.id] || null, correct);
      set({ review: { ...get().review, [w.id]: st } });
      await supabase.from("review_plan").upsert(
        { family_id: uid, student_id: sid, word_id: w.id, ...st },
        { onConflict: "student_id,word_id" }
      );
    }
    // 统计 + 答题记录
    set({ stats: bumpStat(get().stats, correct ? "right" : "wrong", 1) });
    await bumpStatDb(uid, sid, correct ? "right" : "wrong", 1);
    await supabase.from("quiz_records").insert({
      family_id: uid, student_id: sid, mode, word_id: w.id,
      is_correct: correct, is_skip: skip, retry_used: retryUsed, duration_ms: 0, created_at: nowIso,
    });
  },

  effectiveSetting(key) {
    const s = get();
    if (s.role === "student" && s.settings.permConfig[key]) return false;
    if (key === "previewWords") return true;
    return s.settings[key] as boolean;
  },

  async updateSettings(patch) {
    const s = get();
    const settings = { ...s.settings, ...patch };
    set({ settings });
    if (patch.darkTheme !== undefined) document.body.classList.toggle("dark", patch.darkTheme);
    if (s.session) {
      await supabase.from("settings").upsert({
        family_id: s.session, data: settings, updated_at: new Date().toISOString(),
      });
    }
  },

  async enterParent(pwd) {
    const { error } = await supabase.auth.signInWithPassword({ email: get().email, password: pwd });
    if (error) return "密码错误";
    set({ role: "parent" });
    return null;
  },

  exitParent() { set({ role: "student", view: "home" }); },

  // ---------- 词库 CRUD ----------
  async addGroup(name) {
    const uid = get().session!;
    const { data } = await supabase.from("word_groups").insert({ family_id: uid, name }).select().single();
    if (data) {
      set({ groups: [...get().groups, data as Group] });
      get().setCurGroup(data.id);
    }
  },
  async renameGroup(id, name) {
    await supabase.from("word_groups").update({ name }).eq("id", id);
    set({ groups: get().groups.map((g) => (g.id === id ? { ...g, name } : g)) });
  },
  async deleteGroup(id) {
    await supabase.from("word_groups").delete().eq("id", id);
    const groups = get().groups.filter((g) => g.id !== id);
    set({ groups, books: get().books.filter((b) => b.group_id !== id), words: get().words.filter((w) => { const b = get().books.find((x) => x.id === w.book_id); return b !== undefined; }) });
    if (groups[0]) get().setCurGroup(groups[0].id);
    else set({ curGroupId: null, curBookId: null });
  },
  async addBook(groupId, name) {
    const uid = get().session!;
    const { data } = await supabase.from("word_books").insert({ family_id: uid, group_id: groupId, name }).select().single();
    if (data) set({ books: [...get().books, data as Book], curBookId: data.id });
  },
  async renameBook(id, name) {
    await supabase.from("word_books").update({ name }).eq("id", id);
    set({ books: get().books.map((b) => (b.id === id ? { ...b, name } : b)) });
  },
  async deleteBook(id) {
    await supabase.from("word_books").delete().eq("id", id);
    set({ books: get().books.filter((b) => b.id !== id), words: get().words.filter((w) => w.book_id !== id) });
    const s = get();
    if (s.curBookId === id) {
      set({ curBookId: s.books.find((b) => b.group_id === s.curGroupId)?.id ?? null });
    }
  },
  async addWord(en, zh) {
    const s = get();
    if (!s.curBookId) return "请先选择单词本";
    if (s.words.some((w) => w.book_id === s.curBookId && w.en.toLowerCase() === en.trim().toLowerCase())) return "该单词已存在";
    const { data, error } = await supabase
      .from("words").insert({ family_id: s.session!, book_id: s.curBookId, en: en.trim(), zh: zh.trim() })
      .select().single();
    if (error) return error.message;
    set({ words: [...s.words, data as Word] });
    return null;
  },
  async updateWord(id, patch) {
    await supabase.from("words").update(patch).eq("id", id);
    set({ words: get().words.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
  },
  async deleteWord(id) {
    await supabase.from("words").delete().eq("id", id);
    set({ words: get().words.filter((w) => w.id !== id) });
  },

  async importWords(rows, autoPhon) {
    let n = 0;
    for (const r of rows) {
      const err = await get().addWord(r.en, r.zh);
      if (!err) n++;
    }
    if (autoPhon) {
      const s = get();
      const { fetchPhonetic } = await import("./lib/util");
      const missing = s.words.filter((w) => w.book_id === s.curBookId && !w.phon);
      for (const w of missing) {
        const res = await fetchPhonetic(w.en);
        if (res) await get().updateWord(w.id, { phon: res.phon, ex: res.ex });
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    return n;
  },

  async clearWrong() {
    const s = get();
    if (!s.studentId) return;
    await supabase.from("wrong_words").delete().eq("student_id", s.studentId);
    set({ wrong: {} });
  },
}));
