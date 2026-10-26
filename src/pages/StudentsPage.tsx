import { useState } from "react";
import { useApp } from "../store";

export default function StudentsPage() {
  const s = useApp();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🧑‍🎓");

  async function add() {
    if (!name.trim()) { s.toast("请输入学生姓名"); return; }
    await s.addStudent(name.trim(), avatar);
    setName("");
  }

  return (
    <div className="app">
      <header>
        <div className="row-between">
          <div>
            <h1>选择学生</h1>
            <div className="sub">{s.email}</div>
          </div>
          <button className="theme-toggle" onClick={() => useApp.getState().signOut()}>退出登录</button>
        </div>
      </header>
      <section className="view">
        {s.students.length === 0 && <div className="empty">还没有学生档案，先创建一个吧</div>}
        <div className="mode-pick">
          {s.students.map((st) => (
            <div key={st.id} className="student-card" onClick={() => useApp.getState().selectStudent(st.id)}>
              <div className="avatar">{st.avatar}</div>
              <div style={{ fontWeight: 600, marginTop: 6 }}>{st.name}</div>
            </div>
          ))}
        </div>
        <div className="section-title">新建学生档案</div>
        <div className="row-between">
          <select value={avatar} onChange={(e) => setAvatar(e.target.value)} style={{ flex: "0 0 auto" }}>
            {["🧑‍🎓", "👦", "👧", "🧒", "👶"].map((a) => <option key={a}>{a}</option>)}
          </select>
          <input type="text" placeholder="学生姓名" value={name} style={{ flex: 1, textAlign: "left", fontSize: 14 }}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="small-btn primary" onClick={add}>创建</button>
        </div>
      </section>
    </div>
  );
}
