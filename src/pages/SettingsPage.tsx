import { useApp } from "../store";

export default function SettingsPage() {
  const s = useApp();

  if (s.role !== "parent") {
    return (
      <>
        <div className="section-title">设置</div>
        <div className="empty">
          🔐 请点击右上角 🔐 并输入账号密码进入家长模式后管理设置。
          <br />学生模式下仅可使用被允许的功能。
        </div>
      </>
    );
  }

  const perm = s.settings.permConfig;

  return (
    <>
      <div className="section-title">🔒 学生模式权限控制</div>
      <div className="perm-panel">
        <div style={{ fontSize: 11, color: "#a0aec0", marginBottom: 10 }}>勾选 = 学生模式下禁用该功能（家长模式不受限）</div>
        {([
          ["realtimeCheck", "拼写实时校验"],
          ["rtReveal", "校验时显示单词字母"],
          ["previewWords", "预览本轮单词"],
        ] as const).map(([key, label]) => (
          <label key={key} className="p-row">
            <input type="checkbox" checked={perm[key]}
              onChange={(e) => useApp.getState().updateSettings({ permConfig: { ...perm, [key]: e.target.checked } })} />
            {label}
          </label>
        ))}
      </div>

      <div className="section-title">默认设置</div>
      <div className="switch-row">
        <label>
          <input type="checkbox" checked={s.settings.realtimeCheck}
            onChange={(e) => useApp.getState().updateSettings({ realtimeCheck: e.target.checked })} />
          拼写实时校验
        </label>
        <label>
          <input type="checkbox" checked={s.settings.timerEnabled}
            onChange={(e) => useApp.getState().updateSettings({ timerEnabled: e.target.checked })} />
          倒计时默写
        </label>
        <label>
          <select value={s.settings.timerSec} onChange={(e) => useApp.getState().updateSettings({ timerSec: Number(e.target.value) })}>
            {[10, 15, 20, 30, 60].map((n) => <option key={n} value={n}>{n}秒/题</option>)}
          </select>
        </label>
      </div>
      <div className="switch-row">
        <label>
          字体大小：
          <select value={s.settings.fontSize} onChange={(e) => useApp.getState().updateSettings({ fontSize: e.target.value as typeof s.settings.fontSize })}>
            <option value="small">小</option>
            <option value="normal">标准</option>
            <option value="large">大</option>
            <option value="xlarge">特大</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={s.settings.darkTheme}
            onChange={(e) => useApp.getState().updateSettings({ darkTheme: e.target.checked })} />
          暗色主题
        </label>
      </div>

      <div className="section-title">账号</div>
      <div style={{ fontSize: 13, color: "#4a5568", marginBottom: 10 }}>
        登录账号：{s.email}（此密码即家长模式验证密码）
      </div>
      <div className="actions">
        <button className="btn btn-ghost" onClick={() => useApp.getState().exitParent()}>退出家长模式</button>
        <button className="btn btn-ghost" style={{ background: "#fed7d7", color: "#c53030" }}
          onClick={() => { if (confirm("确认退出登录？")) useApp.getState().signOut(); }}>
          退出登录
        </button>
      </div>
    </>
  );
}
