import { useApp } from "../store";

export default function WrongPage() {
  const s = useApp();
  const items = s.words
    .filter((w) => s.wrong[w.id])
    .sort((a, b) => s.wrong[b.id].wrong_count - s.wrong[a.id].wrong_count);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div className="section-title" style={{ margin: 0, border: "none" }}>错词本 ({items.length})</div>
        {s.role === "parent" && (
          <button className="small-btn danger"
            onClick={() => { if (confirm("清空所有学生的错词本？")) useApp.getState().clearWrong(); }}>
            清空错词本
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="empty">暂无错词 🎉</div>
      ) : (
        <div className="word-list">
          {items.map((w) => (
            <div key={w.id} className="wrong-item">
              <div>
                <div className="en">{w.en}</div>
                <div className="zh">{w.zh} {w.phon}</div>
              </div>
              <span className="cnt">×{s.wrong[w.id].wrong_count}</span>
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => useApp.getState().startQuiz("review")}>🔁 错词复习</button>
        </div>
      )}
    </>
  );
}
