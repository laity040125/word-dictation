import { useApp } from "../store";
import { MODE_LABEL } from "../lib/types";
import { calcStreak, dateStr, speak } from "../lib/util";
import type { QuizMode } from "../lib/types";

const MODES: { mode: QuizMode; ico: string; t: string; d: string; section: string }[] = [
  { mode: "smart", ico: "🧠", t: "智能推荐复习", d: "按错误+遗忘曲线", section: "smart" },
  { mode: "ebbing", ico: "📅", t: "到期复习", d: "艾宾浩斯计划", section: "smart" },
  { mode: "learn-card", ico: "🃏", t: "卡片学习", d: "翻卡看释义+例句", section: "learn" },
  { mode: "learn-list", ico: "📋", t: "列表学习", d: "逐词浏览详情", section: "learn" },
  { mode: "choice", ico: "🔘", t: "选择题", d: "看释义选单词", section: "learn" },
  { mode: "learned-quiz", ico: "✍️", t: "学后默写", d: "只测刚学过的", section: "learn" },
  { mode: "ce", ico: "🇨🇳→🇬🇧", t: "中→英默写", d: "看中文写英文", section: "quiz" },
  { mode: "ec", ico: "🇬🇧→🇨🇳", t: "英→中默写", d: "看英文写中文", section: "quiz" },
  { mode: "listen", ico: "🔊", t: "听音拼写", d: "听发音写单词", section: "quiz" },
  { mode: "review", ico: "🔁", t: "错词复习", d: "专攻易错词", section: "quiz" },
];

export default function HomePage() {
  const s = useApp();
  const bookWords = s.words.filter((w) => w.book_id === s.curBookId);
  const P = (id: string) => s.progress[id] || { learned: false, mastered: false };
  const learned = bookWords.filter((w) => P(w.id).learned).length;
  const mastered = bookWords.filter((w) => P(w.id).mastered).length;
  const wrongCnt = bookWords.filter((w) => s.wrong[w.id]).length;
  const now = Date.now();
  const dueCnt = bookWords.filter(
    (w) => s.review[w.id] && new Date(s.review[w.id].next_review).getTime() <= now
  ).length;
  const today = dateStr(new Date());
  const todayStat = s.stats[today] || { learn: 0, quiz: 0, right: 0, wrong: 0 };
  const streak = calcStreak(s.stats);
  const activeDays = Object.keys(s.stats).length;

  const heatmap = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateStr(d);
    const n = (s.stats[key]?.quiz || 0) + (s.stats[key]?.learn || 0);
    const bg = n === 0 ? "#edf2f7" : n < 10 ? "#c3dafe" : n < 30 ? "#667eea" : "#764ba2";
    heatmap.push(<div key={key} style={{ background: bg }} title={key + " · " + n + " 次"} />);
  }

  const rtCheck = useApp.getState().effectiveSetting("realtimeCheck");

  return (
    <>
      <div className="book-selector">
        <div className="breadcrumb">当前学习范围</div>
        <div className="row-between">
          <div>
            <select value={s.curGroupId ?? ""} onChange={(e) => useApp.getState().setCurGroup(e.target.value)}>
              {s.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>{" "}
            <select value={s.curBookId ?? ""} onChange={(e) => useApp.getState().setCurBook(e.target.value)}>
              {s.books.filter((b) => b.group_id === s.curGroupId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button className="small-btn" onClick={() => useApp.getState().setView("books")}>管理词库</button>
        </div>
        <div style={{ fontSize: 12, color: "#718096", marginTop: 6 }}>
          {bookWords.length > 0 ? `共 ${bookWords.length} 词` : "本词本还没有单词，去「词库」或「导入/导出」添加"}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><div className="num">{streak}</div><div className="lbl">连续打卡(天)</div></div>
        <div className="stat"><div className="num">{todayStat.learn + todayStat.quiz}</div><div className="lbl">今日学习(词)</div></div>
        <div className="stat"><div className="num">{activeDays}</div><div className="lbl">累计活跃(天)</div></div>
        <div className="stat"><div className="num">{mastered}</div><div className="lbl">已掌握</div></div>
      </div>

      {dueCnt > 0 && (
        <div className="review-alert">
          <div className="row-between">
            <div style={{ fontSize: 14, color: "#744210" }}><b>🔔 有 {dueCnt} 个单词到了复习时间</b></div>
            <button className="btn btn-primary" style={{ flex: "0 0 auto", width: "auto", padding: "8px 16px", fontSize: 13 }}
              onClick={() => useApp.getState().startQuiz("ebbing")}>去复习</button>
          </div>
        </div>
      )}

      <div className="section-title">学习足迹（近30天）</div>
      <div id="heatmap">{heatmap}</div>

      <div className="stat-row" style={{ marginTop: 16 }}>
        <div className="stat"><div className="num">{bookWords.length}</div><div className="lbl">本词本</div></div>
        <div className="stat"><div className="num">{learned}</div><div className="lbl">已学习</div></div>
        <div className="stat"><div className="num">{wrongCnt}</div><div className="lbl">错词</div></div>
        <div className="stat"><div className="num">{dueCnt}</div><div className="lbl">推荐复习</div></div>
      </div>

      {(["smart", "learn", "quiz"] as const).map((sec) => (
        <div key={sec}>
          <div className="section-title">
            {sec === "smart" ? "智能推荐" : sec === "learn" ? "学习模式（先学后默写）" : "默写模式"}
          </div>
          <div className="mode-pick">
            {MODES.filter((m) => m.section === sec).map((m) => (
              <div key={m.mode} className="mode-card" onClick={() => useApp.getState().startQuiz(m.mode)}>
                <div className="ico">{m.ico}</div>
                <div className="t">{m.t}</div>
                <div className="d">{m.d}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="section-title">本轮范围</div>
      <div className="switch-row">
        {([
          ["all", "全部"], ["notlearned", "未学习"], ["learned", "已学习"],
          ["notmastered", "未掌握"], ["wrong", "仅错词"],
        ] as const).map(([v, l]) => (
          <label key={v}>
            <input type="radio" name="scope" checked={s.scope.scope === v} onChange={() => useApp.getState().setScope({ scope: v })} /> {l}
          </label>
        ))}
      </div>
      <div className="switch-row">
        {([["shuffle", "打乱顺序"], ["seq", "顺序默写"], ["rev", "倒序默写"]] as const).map(([v, l]) => (
          <label key={v}>
            <input type="radio" name="order" checked={s.scope.order === v} onChange={() => useApp.getState().setScope({ order: v })} /> {l}
          </label>
        ))}
      </div>
      <div className="row-between" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
        <label style={{ fontSize: 13, color: "#4a5568" }}>
          每轮题数：
          <select value={String(s.scope.batchSize)} onChange={(e) => useApp.getState().setScope({ batchSize: e.target.value === "all" ? "all" : Number(e.target.value) })}
            style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, marginLeft: 4 }}>
            {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="all">全部</option>
          </select>
        </label>
      </div>
      <div className="switch-row" style={{ marginTop: 8 }}>
        <label>
          <input type="checkbox" checked={s.settings.realtimeCheck && useApp.getState().effectiveSetting("realtimeCheck")}
            onChange={(e) => useApp.getState().updateSettings({ realtimeCheck: e.target.checked })} />
          拼写实时校验{s.role === "student" && s.settings.permConfig.realtimeCheck ? "（家长已禁用）" : ""}
        </label>
        <label>
          <input type="checkbox" checked={s.settings.timerEnabled} onChange={(e) => useApp.getState().updateSettings({ timerEnabled: e.target.checked })} />
          倒计时默写
        </label>
        {s.settings.timerEnabled && (
          <label>
            <select value={s.settings.timerSec} onChange={(e) => useApp.getState().updateSettings({ timerSec: Number(e.target.value) })}
              style={{ padding: "3px 6px", border: "1px solid #e2e8f0", borderRadius: 6 }}>
              {[10, 15, 20, 30, 60].map((n) => <option key={n} value={n}>{n}秒/题</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="row-between" style={{ marginTop: 8 }}>
        <button className="btn btn-ghost" style={{ flex: "0 0 auto", width: "auto", padding: "8px 14px" }}
          onClick={() => useApp.getState().signOut()}>切换账号</button>
      </div>
      <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 10 }}>
        实时校验：{rtCheck ? "已开启" : "未开启"} · 当前模式：{s.role === "parent" ? "家长（全功能）" : "学生（受限）"} · {MODE_LABEL.ce}
      </div>
<div style={{ fontSize: 11, color: "#a0aec0", marginTop: 6 }}>
{s.role === "student" && s.settings.permConfig.previewWords ? "👁 预览本轮单词已由家长禁用" : "提示：数据实时云端同步，换设备登录同一账号即可继续"}
    </div>
  </>
);
}

// 避免未使用告警
void speak;
