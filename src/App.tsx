import { useEffect, useState } from "react";
import { useApp } from "./store";
import LoginPage from "./pages/LoginPage";
import StudentsPage from "./pages/StudentsPage";
import HomePage from "./pages/HomePage";
import QuizPage from "./pages/QuizPage";
import ResultPage from "./pages/ResultPage";
import BooksPage from "./pages/BooksPage";
import WrongPage from "./pages/WrongPage";
import ReportPage from "./pages/ReportPage";
import ImportPage from "./pages/ImportPage";
import SettingsPage from "./pages/SettingsPage";

const NAV = [
  { key: "home", label: "首页" },
  { key: "books", label: "词库" },
  { key: "wrong", label: "错词本" },
  { key: "report", label: "报告" },
  { key: "import", label: "导入/导出" },
];

export default function App() {
  const s = useApp();
  const [pwdModal, setPwdModal] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  useEffect(() => {
    useApp.getState().init();
  }, []);

  if (!s.ready) return <div className="view" style={{ color: "#fff" }}>加载中…</div>;
  if (!s.session) return <LoginPage />;
  if (!s.studentId) return <StudentsPage />;

  const quizView = s.view === "quiz" || s.view === "result";

  return (
    <div className="app">
      <header>
        <div className="row-between">
          <div>
            <h1>📝 英语单词默写</h1>
            <div className="sub">云端同步 · 手机电脑数据互通</div>
            <div className="ctx">
              {s.students.find((x) => x.id === s.studentId)?.avatar}{" "}
              {s.students.find((x) => x.id === s.studentId)?.name} · {s.email}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              className="mode-badge"
              style={{ display: s.role === "parent" ? "inline-block" : "none" }}
              title="点击退出家长模式"
              onClick={() => useApp.getState().exitParent()}
            >
              🔐 家长模式
            </span>
            <button className="theme-toggle" title="家长入口" style={{ fontSize: 14 }} onClick={() => { setPwdModal(true); setPwdErr(""); setPwd(""); }}>🔐</button>
            <button
              className="theme-toggle"
              title="切换暗色主题"
              onClick={() => useApp.getState().updateSettings({ darkTheme: !s.settings.darkTheme })}
            >
              {s.settings.darkTheme ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {!quizView && (
        <nav>
          {NAV.map((n) => (
            <button key={n.key} className={s.view === n.key ? "active" : ""} onClick={() => useApp.getState().setView(n.key)}>
              {n.label}
              {n.key === "wrong" && Object.keys(s.wrong).length > 0 && (
                <span className="count-pill">{Object.keys(s.wrong).length}</span>
              )}
            </button>
          ))}
        </nav>
      )}

      <section className="view">
        {s.view === "home" && <HomePage />}
        {quizView && <QuizPage />}
        {s.view === "result" && <ResultPage />}
        {s.view === "books" && <BooksPage />}
        {s.view === "wrong" && <WrongPage />}
        {s.view === "report" && <ReportPage />}
        {s.view === "import" && <ImportPage />}
        {s.view === "settings" && <SettingsPage />}
      </section>

      {pwdModal && (
        <div className="modal-mask" onClick={(e) => e.target === e.currentTarget && setPwdModal(false)}>
          <div className="modal-box">
            <div className="modal-title">🔐 家长入口</div>
            <div className="modal-desc">输入账号密码进入家长模式</div>
            <input
              type="password" value={pwd} autoFocus
              placeholder="输入密码"
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const err = await useApp.getState().enterParent(pwd);
                  if (err) setPwdErr(err);
                  else { setPwdModal(false); useApp.getState().setView("settings"); }
                }
              }}
            />
            {pwdErr && <div className="err-text">{pwdErr}</div>}
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setPwdModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const err = await useApp.getState().enterParent(pwd);
                  if (err) setPwdErr(err);
                  else { setPwdModal(false); useApp.getState().setView("settings"); }
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={"toast" + (s.toastMsg ? " show" : "")}>{s.toastMsg}</div>
    </div>
  );
}
