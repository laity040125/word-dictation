import { useApp } from "../store";
import { MODE_LABEL } from "../lib/types";
import { formatTime } from "../lib/util";

export default function ResultPage() {
  const s = useApp();
  const q = s.quiz!;
  const total = q.queue.length;
  const pct = total ? Math.round((q.right / total) * 100) : 0;
  const isLearn = q.mode === "learn-card" || q.mode === "learn-list";

  const rank = s.leaderboard.filter((e) => e.mode === q.mode);
  const todayRank = rank.filter((e) => e.date === new Date().toISOString().slice(0, 10));
  const best = rank[0];

  return (
    <div className="quiz-box">
      <div style={{ fontSize: 48 }}>{isLearn ? "📚" : "🎉"}</div>
      {isLearn ? (
        <>
          <div className="prompt-text">已学完 {total} 个单词</div>
          <div className="prompt-hint">可以试试「学后默写」巩固记忆</div>
        </>
      ) : (
        <>
          <div className="prompt-text">{pct} 分</div>
          <div className="prompt-hint">本轮共 {total} 题 · 用时 {formatTime(q.totalTime)}</div>
        </>
      )}
      <div className="stat-row" style={{ marginTop: 16 }}>
        <div className="stat"><div className="num">{q.right}</div><div className="lbl">答对</div></div>
        <div className="stat"><div className="num">{q.wrong}</div><div className="lbl">答错</div></div>
        <div className="stat"><div className="num">{q.skip}</div><div className="lbl">跳过</div></div>
      </div>
      {!isLearn && best && (
        <div className="report-card" style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#667eea", marginBottom: 6 }}>
            {MODE_LABEL[q.mode]} · 历史最佳 {best.score} 分
          </div>
          <div style={{ fontSize: 12, color: "#718096" }}>
            今日已练 {todayRank.length} 次 · 评分 = 正确率×60% + 速度分×40%
          </div>
        </div>
      )}
      <div style={{ textAlign: "left", marginTop: 10 }}>
        {q.wrongThisRound.length === 0 ? (
          <div className="empty">全部答对，太棒了！</div>
        ) : (
          <>
            <div className="section-title">本轮错词/跳过</div>
            <div className="word-list">
              {q.wrongThisRound.map((w) => (
                <div key={w.id} className="wrong-item">
                  <div>
                    <div className="en">{w.en}</div>
                    <div className="zh">{w.zh}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="actions" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={() => useApp.getState().setView("home")}>返回首页</button>
        <button className="btn btn-primary" onClick={() => useApp.getState().startQuiz(q.mode)}>再来一轮</button>
      </div>
    </div>
  );
}
