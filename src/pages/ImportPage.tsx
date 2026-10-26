import { useState } from "react";
import { useApp } from "../store";

export default function ImportPage() {
  const s = useApp();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  function parseLines(): { en: string; zh: string }[] {
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const parts = l.split(/[,，\t]/);
      return { en: parts[0] || "", zh: parts.slice(1).join(",") || "" };
    }).filter((r) => r.en && r.zh);
  }

  async function doImport(autoPhon: boolean) {
    if (s.role !== "parent") { s.toast("导入需家长模式"); return; }
    const rows = parseLines();
    if (rows.length === 0) { s.toast("没有可导入的行（格式：英文,中文）"); return; }
    setBusy(true);
    setStatus("导入中…");
    setProgress(0);
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
      const err = await useApp.getState().addWord(rows[i].en, rows[i].zh);
      if (!err) n++;
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }
    setStatus(`✅ 成功导入 ${n} / ${rows.length} 个单词` + (autoPhon ? "，开始联网查音标…" : ""));
    if (autoPhon) {
      const missing = useApp.getState().words.filter((w) => w.book_id === s.curBookId && !w.phon);
      const { fetchPhonetic } = await import("../lib/util");
      let done = 0;
      for (const w of missing) {
        const res = await fetchPhonetic(w.en);
        if (res) await useApp.getState().updateWord(w.id, { phon: res.phon, ex: res.ex });
        done++;
        setProgress(Math.round((done / missing.length) * 100));
        setStatus(`查音标 ${done}/${missing.length}…`);
        await new Promise((r) => setTimeout(r, 300));
      }
      setStatus(`✅ 完成：导入 ${n} 词，补全音标 ${done} 个`);
    }
    setBusy(false);
  }

  function exportTxt() {
    const words = s.words.filter((w) => w.book_id === s.curBookId);
    const content = words.map((w) => `${w.en},${w.zh}`).join("\n");
    download(content, "词本导出.txt");
  }

  function exportJson() {
    const data = {
      groups: s.groups.map((g) => ({
        ...g,
        books: s.books.filter((b) => b.group_id === g.id).map((b) => ({
          ...b,
          words: s.words.filter((w) => w.book_id === b.id),
        })),
      })),
    };
    download(JSON.stringify(data, null, 2), "词库备份.json");
  }

  function download(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="section-title">导入单词</div>
      <div className="book-selector" style={{ marginBottom: 12 }}>
        <div className="breadcrumb">导入目标</div>
        <div className="row-between">
          <select value={s.curGroupId ?? ""} onChange={(e) => useApp.getState().setCurGroup(e.target.value)}>
            {s.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>{" "}
          <select value={s.curBookId ?? ""} onChange={(e) => useApp.getState().setCurBook(e.target.value)}>
            {s.books.filter((b) => b.group_id === s.curGroupId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#718096", marginBottom: 8 }}>
        每行一个单词，格式：<code>英文,中文</code>（中文可含多个释义）。音标留空，可导入后自动联网补全。
      </div>
      <textarea value={text} placeholder={"apple,苹果\nbook,书,书本"} onChange={(e) => setText(e.target.value)} />
      <div className="actions" style={{ marginTop: 10 }}>
        <label className="btn btn-ghost" style={{ textAlign: "center", cursor: "pointer" }}>
          选择文件
          <input type="file" accept=".txt,.csv" style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              f.text().then(setText);
            }} />
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={() => doImport(true)}>
          {busy ? "处理中…" : "导入并自动查音标"}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => doImport(false)}>仅导入</button>
      </div>
      {status && <div style={{ fontSize: 13, marginTop: 8, color: "#4a5568" }}>{status}</div>}
      {busy && (
        <div className="progress" style={{ marginTop: 8 }}>
          <div style={{ width: progress + "%" }} />
        </div>
      )}

      <div className="section-title">导出</div>
      <div className="actions">
        <button className="btn btn-ghost" onClick={exportTxt}>导出当前词本 (txt)</button>
        <button className="btn btn-ghost" onClick={exportJson}>导出全部词库 (JSON)</button>
      </div>
      <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 12 }}>
        💡 旧版单文件应用的数据可通过「导出全部(JSON备份)」导出后，用旧版的导出 JSON 对照手工整理成「英文,中文」格式粘贴导入。
      </div>
    </>
  );
}
