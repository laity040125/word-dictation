import { useState } from "react";
import { useApp } from "../store";

export default function BooksPage() {
  const s = useApp();
  const [newGroup, setNewGroup] = useState("");
  const [newBook, setNewBook] = useState("");
  const [newWordEn, setNewWordEn] = useState("");
  const [newWordZh, setNewWordZh] = useState("");
  const [search, setSearch] = useState("");
  const [selBook, setSelBook] = useState<string | null>(null);
  const [batchSel, setBatchSel] = useState<Set<string>>(new Set());
  const [editWord, setEditWord] = useState<{ id: string; en: string; zh: string; phon: string } | null>(null);

  const parent = s.role === "parent";
  const selGroupId = s.curGroupId;
  const bookWords = s.words
    .filter((w) => w.book_id === (selBook || s.curBookId))
    .filter((w) => !search || w.en.toLowerCase().includes(search.toLowerCase()) || w.zh.includes(search));

  async function addWord() {
    const err = await useApp.getState().addWord(newWordEn, newWordZh);
    if (err) s.toast(err);
    else { s.toast("已添加"); setNewWordEn(""); setNewWordZh(""); }
  }

  return (
    <>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div className="section-title" style={{ margin: 0, border: "none" }}>组别 / 单词本管理</div>
        {parent && (
          <input type="text" placeholder="新组别名" value={newGroup} style={{ width: 100, fontSize: 12, padding: 8 }}
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newGroup.trim()) { useApp.getState().addGroup(newGroup.trim()); setNewGroup(""); } }} />
        )}
        {parent && <button className="small-btn primary" onClick={() => { if (newGroup.trim()) { useApp.getState().addGroup(newGroup.trim()); setNewGroup(""); } }}>新建组别</button>}
      </div>
      <div className="group-bar">
        {s.groups.map((g) => (
          <span key={g.id}
            className={"group-chip" + (g.id === selGroupId ? " active" : "")}
            onClick={() => { useApp.getState().setCurGroup(g.id); setSelBook(null); }}
            >
              {g.name}{" "}
              {parent && (
              <span title="重命名组别" style={{ marginLeft: 2, opacity: .7 }}
            onClick={(e) => {
            e.stopPropagation();
          const name = prompt("重命名组别", g.name);
        if (name && name.trim()) useApp.getState().renameGroup(g.id, name.trim());
                }}>✏️</span>
            )}
          </span>
        ))}
      </div>

      <div className="row-between" style={{ margin: "10px 0" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#4a5568" }}>单词本</div>
        {parent && (
          <>
            <input type="text" placeholder="新单词本名" value={newBook} style={{ width: 120, fontSize: 12, padding: 8 }}
              onChange={(e) => setNewBook(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newBook.trim() && selGroupId) { useApp.getState().addBook(selGroupId, newBook.trim()); setNewBook(""); } }} />
            <button className="small-btn primary" onClick={() => { if (newBook.trim() && selGroupId) { useApp.getState().addBook(selGroupId, newBook.trim()); setNewBook(""); } }}>新建单词本</button>
          </>
        )}
      </div>
      <div className="word-list" style={{ maxHeight: 200 }}>
        {s.books.filter((b) => b.group_id === selGroupId).map((b) => (
          <div key={b.id} className={"word-item" + ((selBook || s.curBookId) === b.id ? " selected-book" : "")} style={{ cursor: "pointer" }}
            onClick={() => setSelBook(b.id)}>
            <span className="en">📖 {b.name}</span>
              <span>
              <span className="zh">{s.words.filter((w) => w.book_id === b.id).length} 词</span>
              {parent && (
            <>
            <button className="small-btn" style={{ marginLeft: 8 }}
            onClick={(e) => {
              e.stopPropagation();
              const name = prompt("重命名单词本", b.name);
                if (name && name.trim()) useApp.getState().renameBook(b.id, name.trim());
                  }}>✏️ 重命名</button>
                  <button className="small-btn danger" style={{ marginLeft: 4 }}
                onClick={(e) => { e.stopPropagation(); if (confirm("删除单词本「" + b.name + "」及其所有单词？")) useApp.getState().deleteBook(b.id); }}>
              删除
            </button>
          </>
              )}
            </span>
          </div>
        ))}
        {s.books.filter((b) => b.group_id === selGroupId).length === 0 && <div className="empty">暂无单词本</div>}
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div className="section-title" style={{ margin: 0, border: "none" }}>单词（{bookWords.length}）</div>
          {parent && (
            <>
              {batchSel.size > 0 && (
                <button className="small-btn danger"
                  onClick={async () => {
                    if (!confirm("删除选中的 " + batchSel.size + " 个单词？")) return;
                    for (const id of batchSel) await useApp.getState().deleteWord(id);
                    setBatchSel(new Set());
                  }}>
                  🗑 删除选中({batchSel.size})
                </button>
              )}
              <input type="text" placeholder="英文" value={newWordEn} style={{ width: 90, fontSize: 12, padding: 8, textAlign: "left" }}
                onChange={(e) => setNewWordEn(e.target.value)} />
              <input type="text" placeholder="中文" value={newWordZh} style={{ width: 110, fontSize: 12, padding: 8, textAlign: "left" }}
                onChange={(e) => setNewWordZh(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWord()} />
              <button className="small-btn primary" onClick={addWord}>添加</button>
            </>
          )}
        </div>
        <input type="text" placeholder="搜索单词…" value={search} style={{ width: "100%", marginBottom: 10, textAlign: "left", fontSize: 13, padding: "8px 12px" }}
          onChange={(e) => setSearch(e.target.value)} />
        <div className="word-list">
          {bookWords.map((w) => {
            const p = s.progress[w.id];
            const editing = editWord?.id === w.id;
              return (
                <div key={w.id} className="word-item">
                  {editing && editWord ? (
                    <div style={{ width: "100%" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="text" value={editWord.en} placeholder="英文" style={{ flex: "1 1 100px", fontSize: 13, padding: "6px 8px", textAlign: "left" }}
                        onChange={(e) => setEditWord({ ...editWord, en: e.target.value })} />
                        <input type="text" value={editWord.zh} placeholder="中文释义" style={{ flex: "1.5 1 140px", fontSize: 13, padding: "6px 8px", textAlign: "left" }}
                      onChange={(e) => setEditWord({ ...editWord, zh: e.target.value })} />
                  <input type="text" value={editWord.phon} placeholder="音标（可留空）" style={{ flex: "1 1 120px", fontSize: 13, padding: "6px 8px", textAlign: "left" }}
                  onChange={(e) => setEditWord({ ...editWord, phon: e.target.value })} />
                    <button className="small-btn primary"
                      onClick={async () => {
                      if (!editWord.en.trim() || !editWord.zh.trim()) { s.toast("英文和释义不能为空"); return; }
                      await useApp.getState().updateWord(w.id, { en: editWord.en.trim(), zh: editWord.zh.trim(), phon: editWord.phon.trim() });
                      setEditWord(null);
                    s.toast("已保存");
                    }}>保存</button>
                  <button className="small-btn" onClick={() => setEditWord(null)}>取消</button>
                </div>
                </div>
                  ) : (
                <>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            {parent && (
          <input type="checkbox" checked={batchSel.has(w.id)}
                          onChange={(e) => {
                            const n = new Set(batchSel);
                            e.target.checked ? n.add(w.id) : n.delete(w.id);
                            setBatchSel(n);
                          }} />
                      )}
                      <div>
                        <div className="en">
                          {w.en}
                          {p?.mastered && <span className="tag mastered">已掌握</span>}
                          {!p?.mastered && p?.learned && <span className="tag learned">已学</span>}
                          {s.wrong[w.id] && <span className="tag wrong" style={{ background: "#fed7d7", color: "#742a2a" }}>错{s.wrong[w.id].wrong_count}</span>}
                        </div>
                        <div className="zh">{w.zh} {w.phon}</div>
                      </div>
                    </label>
                    {parent && (
                      <span style={{ whiteSpace: "nowrap" }}>
                        <button className="small-btn"
                          onClick={() => setEditWord({ id: w.id, en: w.en, zh: w.zh, phon: w.phon })}>✏️ 编辑</button>
                        <button className="small-btn danger" style={{ marginLeft: 4 }}
                          onClick={() => { if (confirm("删除 " + w.en + "？")) useApp.getState().deleteWord(w.id); }}>删除</button>
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {bookWords.length === 0 && <div className="empty">暂无单词</div>}
        </div>
      </div>
      {!parent && <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 10 }}>🔐 词库编辑需家长模式（右上角 🔐 输入密码）</div>}
    </>
  );
}
