import { useEffect, useRef, useState } from "react";
import { useApp } from "../store";
import { MODE_LABEL } from "../lib/types";
import { speak } from "../lib/util";

export default function QuizPage() {
  const s = useApp();
  const q = s.quiz!;
  const [ans, setAns] = useState("");
  const [timer, setTimer] = useState(s.settings.timerSec);
  const [lastChoice, setLastChoice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const w = q.queue[q.idx];
  const isSpell = ["ce", "listen", "review", "learned-quiz", "smart", "ebbing"].includes(q.mode);

  // 切题后重置
  useEffect(() => {
    setAns("");
    inputRef.current?.focus();
    if (q.mode === "listen") setTimeout(() => speak(w.en), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.idx]);

  // 倒计时
  useEffect(() => {
    if (!s.settings.timerEnabled || q.answered || q.feedback === "retry") return;
    setTimer(s.settings.timerSec);
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(id);
          useApp.getState().skipQuestion();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.idx, q.feedback, s.settings.timerEnabled]);

  const progressPct = ((q.idx + 1) / q.queue.length) * 100;
  const rtCheck = useApp.getState().effectiveSetting("realtimeCheck");
  const rtReveal = useApp.getState().effectiveSetting("rtReveal");

  const head = (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: "#667eea", fontWeight: 600 }}>{MODE_LABEL[q.mode]}</span>
        <span style={{ fontSize: 13, color: "#718096" }}>
          第 {q.idx + 1} / {q.queue.length} 题{s.settings.timerEnabled && !q.answered ? ` · ${timer}s` : ""}
        </span>
      </div>
      <div className="progress"><div style={{ width: progressPct + "%" }} /></div>
    </>
  );

  function submit() {
    if (!ans.trim()) { s.toast("请输入答案或点跳过"); return; }
    useApp.getState().answer(ans);
  }

  // ---------- 卡片学习 ----------
  if (q.mode === "learn-card") {
    return (
      <div className="quiz-box">
        {head}
        <div className="flip-card">
          <div className={"flip-inner" + (q.cardFlipped ? " flipped" : "")} onClick={() => useApp.getState().flipCard()}>
            <div className="flip-face flip-front">
              <div className="word">{w.en}</div>
              <div className="phon">{w.phon}</div>
              <div className="tap-hint">点击卡片翻面看释义</div>
            </div>
            <div className="flip-face flip-back">
              <div className="zh">{w.zh}</div>
              {w.ex && <div className="ex">📝 {w.ex}</div>}
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => speak(w.en)}>🔊 朗读</button>
          <button className="btn btn-ghost" onClick={() => speak(w.en, true)}>🐢 慢读</button>
          <button className="btn btn-primary" onClick={() => useApp.getState().nextQuestion()}>下一个 →</button>
        </div>
      </div>
    );
  }

  // ---------- 列表学习 ----------
  if (q.mode === "learn-list") {
    const learnedCnt = q.queue.filter((x) => x.learned).length;
    return (
      <div className="quiz-box">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: "#667eea", fontWeight: 600 }}>列表学习</span>
          <span style={{ fontSize: 13, color: "#718096" }}>共 {q.queue.length} 词 · 已学 {learnedCnt}</span>
        </div>
        <div className="progress"><div style={{ width: (learnedCnt / q.queue.length) * 100 + "%" }} /></div>
        <div className="card-list" style={{ textAlign: "left" }}>
          {q.queue.map((x, i) => (
            <div key={x.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="en">{i + 1}. {x.en}</span>{" "}
                  {x.learned && <span className="tag learned">已学</span>}
                </div>
                <div>
                  <button className="small-btn" onClick={() => speak(x.en)}>🔊</button>
                  <button className="small-btn" style={{ marginLeft: 4 }} onClick={() => useApp.getState().markLearned(i)}>
                    {x.learned ? "✓" : "标记已学"}
                  </button>
                </div>
              </div>
              <div className="learn-detail">{x.phon}</div>
              <div className="learn-detail"><b>释义：</b>{x.zh}</div>
              {x.ex && <div className="learn-detail ex">例句：{x.ex}</div>}
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => useApp.getState().setView("home")}>返回首页</button>
          <button className="btn btn-ghost" onClick={() => { q.queue.forEach((_, i) => useApp.getState().markLearned(i)); s.toast("已全部标记为已学"); }}>全部已学</button>
          <button className="btn btn-primary" onClick={() => useApp.getState().startQuiz("learned-quiz")}>学完去默写</button>
        </div>
      </div>
    );
  }

  // ---------- 选择题 ----------
  if (q.mode === "choice") {
    return (
      <div className="quiz-box">
        {head}
        <div className="prompt-text">{w.zh}</div>
        <div className="prompt-hint">选择正确的英文单词</div>
        <div className="choice-options">
          {q.choiceOptions.map((opt) => {
            const isAnswer = opt === w.en;
            return (
              <button
                key={opt}
                className={"choice-opt" + (q.answered && isAnswer ? " correct" : q.answered && opt === lastChoice && !isAnswer ? " wrong" : "")}
                disabled={q.answered}
                onClick={() => { setLastChoice(opt); useApp.getState().chooseOption(opt); }}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className={"feedback " + (q.feedback === "ok" ? "ok" : q.feedback === "bad" ? "bad" : "")} style={{ display: q.answered ? "block" : "none" }}>
          {q.feedbackText}
        </div>
        {q.answered && (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => useApp.getState().nextQuestion()}>下一题 →</button>
          </div>
        )}
      </div>
    );
  }

  // ---------- 默写题（ce/ec/listen/review/learned-quiz/smart/ebbing） ----------
  let prompt = "", hint = "";
  if (q.mode === "ce") { prompt = w.zh; hint = "请拼写对应的英文单词"; }
  else if (q.mode === "ec") { prompt = w.en; hint = w.phon ? "音标：" + w.phon : "请写出中文意思"; }
  else if (q.mode === "listen") { hint = "点击喇叭听发音，拼写单词"; }
  else if (q.mode === "review") { prompt = w.zh; hint = "错词复习 · 拼写英文"; }
  else if (q.mode === "learned-quiz") { prompt = w.zh; hint = "学后默写 · 拼写刚学的词"; }
  else if (q.mode === "smart") { prompt = w.zh; hint = "智能推荐 · 拼写英文"; }
  else if (q.mode === "ebbing") { prompt = w.zh; hint = "到期复习 · 拼写英文"; }

  const rtHtml = (() => {
    if (!rtCheck || !isSpell) return null;
    const target = w.en.toLowerCase();
    const inp = ans.toLowerCase();
    return (
      <div className="rt-box">
        {target.split("").map((ch, i) => {
          if (i < inp.length)
            return <span key={i} className={inp[i] === ch ? "rt-ok" : "rt-bad"}>{ch}</span>;
          return <span key={i} className={rtReveal ? "rt-reveal" : "rt-rest"}>{rtReveal ? ch : "·"}</span>;
        })}
      </div>
    );
  })();

  return (
    <div className="quiz-box">
      {head}
      {q.mode === "listen" && <div className="speaker" onClick={() => speak(w.en)}>🔊</div>}
      <div className="prompt-text">{prompt || "🔊"}</div>
      <div className="prompt-hint">{hint}</div>
      <input
        ref={inputRef}
        className="answer"
        value={ans}
        disabled={q.answered}
        placeholder="Enter 提交 · Esc 跳过"
        onChange={(e) => setAns(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); q.answered ? useApp.getState().nextQuestion() : submit(); }
          if (e.key === "Escape") { e.preventDefault(); if (!q.answered) useApp.getState().skipQuestion(); }
        }}
      />
      {rtHtml}
      <div className="actions">
        {!q.answered && q.feedback !== "retry" && (
          <button className="btn btn-ghost" onClick={() => useApp.getState().skipQuestion()}>跳过</button>
        )}
        {!q.answered && q.feedback === "retry" && (
          <button className="btn btn-ghost" onClick={() => useApp.getState().revealAnswer()}>放弃看答案</button>
        )}
        {!q.answered && (
          <button className="btn btn-primary" onClick={submit}>{q.feedback === "retry" ? "🔄 再试一次" : "提交"}</button>
        )}
      </div>
      {q.answered && (
        <>
          <div className={"feedback " + q.feedback}>{q.feedbackText}</div>
          <div className="word-meta">{w.phon ? "音标：" + w.phon : ""}</div>
          <div className="actions">
            <button className="btn btn-primary" autoFocus onClick={() => useApp.getState().nextQuestion()}>下一题 →</button>
          </div>
        </>
      )}
    </div>
  );
}

