import { useState } from "react";
import { useApp } from "../store";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !pwd) { setErr("请填写邮箱和密码"); return; }
    if (pwd.length < 6) { setErr("密码至少 6 位"); return; }
    setBusy(true);
    setErr("");
    const res = tab === "login"
      ? await useApp.getState().signIn(email, pwd)
      : await useApp.getState().signUp(email, pwd);
    setBusy(false);
    if (res) setErr(res);
    else if (tab === "register") useApp.getState().toast("注册成功，请创建学生档案");
  }

  return (
    <div className="app">
      <header>
        <h1>📝 英语单词默写</h1>
        <div className="sub">云端版 · 一个账号 = 一个家庭，多设备数据互通</div>
      </header>
      <section className="view">
        <div className="switch-row" style={{ justifyContent: "center" }}>
          <label onClick={() => setTab("login")} style={{ fontWeight: tab === "login" ? 600 : 400 }}>登录</label>
          <label onClick={() => setTab("register")} style={{ fontWeight: tab === "register" ? 600 : 400 }}>注册</label>
        </div>
        <input type="email" placeholder="邮箱" value={email} style={{ marginBottom: 10 }}
          onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="密码（家长密码，至少 6 位）" value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <div className="err-text">{err}</div>}
        <div className="actions">
          <button className="btn btn-primary" disabled={busy} onClick={submit}>
            {busy ? "请稍候…" : tab === "login" ? "登录" : "注册并登录"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 14 }}>
          注册即创建家庭账号；学生无需密码，登录后选择学生档案即可使用。
          密码同时作为「家长模式」的验证密码。
        </div>
      </section>
    </div>
  );
}
