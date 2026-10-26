import { useState } from "react";
import { useApp } from "../store";
import { dateStr } from "../lib/util";

export default function ReportPage() {
  const s = useApp();
  const [days, setDays] = useState(14);

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(dateStr(d));
  }
  const statOf = (d: string) => s.stats[d] || { learn: 0, quiz: 0, right: 0, wrong: 0 };
  const maxN = Math.max(1, ...dates.map((d) => statOf(d).quiz + statOf(d).learn));

  const totalQuiz = dates.reduce((a, d) => a + statOf(d).quiz, 0);
  const totalRight = dates.reduce((a, d) => a + statOf(d).right, 0);
  const accPct = totalQuiz ? Math.round((totalRight / totalQuiz) * 100) : 0;
  const accClass = accPct >= 80 ? "good" : accPct >= 60 ? "mid" : "bad";

  const weak = s.words
    .filter((w) => s.wrong[w.id])
    .sort((a, b) => s.wrong[b.id].wrong_count - s.wrong[a.id].wrong_count)
    .slice(0, 20);

  const bookWords = s.words.filter((w) => w.book_id === s.curBookId);
  const mastered = bookWords.filter((w) => s.progress[w.id]?.mastered).length;
  const learnedOnly = bookWords.filter((w) => s.progress[w.id]?.learned && !s.progress[w.id]?.mastered).length;
  const fresh = bookWords.length - mastered - learnedOnly;
  const total = Math.max(1, bookWords.length);

  const best = [...s.leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div className="section-title" style={{ margin: 0, border: "none" }}>📊 学习报告</div>
        <div className="switch-row" style={{ margin: 0 }}>
          {[7, 14, 30].map((n) => (
            <label key={n} style={{ fontWeight: days === n ? 600 : 400 }} onClick={() => setDays(n)}>
              近{n}天
            </label>
          ))}
        </div>
      </div>

      <div className="report-card">
        <div className="report-title">近{days}天打卡趋势</div>
        <div className="trend-chart">
          {dates.map((d) => {
            const n = statOf(d).quiz + statOf(d).learn;
            return (
              <div key={d} className="trend-bar">
                <div className={"bar" + (n === 0 ? " empty" : "")} style={{ height: (n / maxN) * 100 + "%" }} />
                <div className="lbl">{d.slice(5)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: "#718096" }}>
          活跃 {dates.filter((d) => statOf(d).quiz + statOf(d).learn > 0).length} / {days} 天 · 累计默写 {totalQuiz} 次
        </div>
      </div>

      <div className="report-card">
        <div className="report-title">正确率统计（近{days}天）</div>
        <div className="acc-row">
          <span className="lbl">总正确率</span>
          <div className="acc-bar"><div className={"fill " + accClass} style={{ width: accPct + "%" }} /></div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{accPct}%</span>
        </div>
        <div style={{ fontSize: 12, color: "#718096" }}>
          答对 {totalRight} / {totalQuiz}
        </div>
      </div>

      <div className="report-card">
        <div className="report-title">薄弱词排行 Top 20</div>
        {weak.length === 0 ? (
          <div className="empty">暂无错词 🎉</div>
        ) : (
          <div className="word-list" style={{ maxHeight: 300 }}>
            {weak.map((w) => (
              <div key={w.id} className="weak-row" style={{ cursor: "pointer" }} onClick={() => useApp.getState().startQuiz("review")}>
                <div>
                  <div className="en">{w.en}</div>
                  <div className="zh">{w.zh}</div>
                </div>
                <span className="err-cnt">×{s.wrong[w.id].wrong_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="report-card">
        <div className="report-title">掌握进度（当前词本）</div>
        <div className="prog-bar">
          <div className="seg mastered" style={{ width: (mastered / total) * 100 + "%" }} />
          <div className="seg learned" style={{ width: (learnedOnly / total) * 100 + "%" }} />
          <div className="seg new" style={{ width: (fresh / total) * 100 + "%" }} />
        </div>
        <div style={{ fontSize: 12, color: "#718096", marginTop: 8 }}>
          已掌握 {mastered} · 已学未掌握 {learnedOnly} · 未学 {fresh} · 共 {bookWords.length}
        </div>
      </div>

      <div className="report-card">
        <div className="report-title">🏆 成绩排行榜（历史最佳 Top 10）</div>
        {best.length === 0 ? (
          <div className="empty">完成一轮默写后上榜</div>
        ) : (
          <div>
            {best.map((e, i) => (
              <div key={i} className="weak-row">
                <div>
                  <div className="en">#{i + 1} {e.score} 分</div>
                  <div className="zh">{e.date} · {e.right}/{e.total} 正确 · 用时 {e.time}s</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
