# 英语单词默写 · 云端版（方案② · Supabase 实现）

由旧版单文件 `word-dictation.html` 升级的前后端分离云端版：**手机/电脑/平板登录同一账号，数据自动云端同步**。

## 技术栈

- 前端：React 18 + TypeScript + Vite + Zustand
- 后端/数据库：Supabase（PostgreSQL + Auth + RLS 行级权限）
- 部署：Vercel / Netlify（免费层即可）

## 功能

- 注册登录（一个账号 = 一个家庭，密码即家长密码）+ 多学生档案
- 组别 → 单词本 → 单词 三级词库管理（家长模式编辑）
- 默写模式：中→英 / 英→中 / 听音拼写 / 错词复习 / 学后默写 / 选择题
- 学习模式：卡片学习 / 列表学习
- 智能推荐复习 + 艾宾浩斯到期复习（间隔 1/2/4/7/15 天）
- 错词本（按学生隔离）、答错重试一次、跳过计错
- 学习报告：打卡热力图、趋势、正确率、薄弱词排行、掌握进度、成绩排行
- 家长/学生双模式：学生模式禁用实时校验、显示字母、预览单词等防作弊项
- 导入（txt/csv + 自动联网查音标）、导出（txt / JSON）
- 暗色主题、倒计时、移动端适配

## 快速开始（本地开发）

1. **创建 Supabase 项目**：到 [supabase.com](https://supabase.com) 新建项目（免费层即可）。
2. **执行建表 SQL**：Supabase 控制台 → SQL Editor → 粘贴并执行 `supabase/schema.sql` 全部内容。
   （11 张表 + RLS 策略：所有数据仅本家庭可读写。）
3. **配置环境变量**：
   ```bash
   cp .env.example .env.local
   # 填入 Supabase → Settings → API 里的 Project URL 和 anon public key
   ```
4. **安装并启动**：
   ```bash
   npm install
   npm run dev
   ```
5. 打开 http://localhost:5173 ，注册账号 → 创建学生档案 → 到「词库」建组别/单词本/加单词（需家长模式）→ 开始默写。

> 提示：Supabase 免费层默认开启邮箱注册即可用。若注册后收不到确认邮件，可在
> Authentication → Providers → Email 中关闭 "Confirm email"。

## 部署上线（Vercel 为例）

1. 推送到 GitHub 仓库。
2. Vercel → New Project → 导入仓库，框架自动识别为 Vite。
3. 环境变量添加 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`。
4. Deploy，即可获得 `https://xxx.vercel.app`，手机浏览器打开同地址登录即可数据互通。

## 与旧版数据迁移

旧版 localStorage 数据可在旧版应用「导出全部 (JSON 备份)」后，把其中的单词整理为
`英文,中文` 每行一条的文本，在新版「导入/导出」页粘贴导入，并勾选自动查音标。

## 目录结构

```
word-dictation/
├── supabase/schema.sql   # 建表 + RLS（一次性执行）
├── src/
│   ├── lib/              # supabase 客户端 / 类型 / 纯函数工具（算法移植）
│   ├── pages/            # 登录、学生选择、首页、默写、词库、错词、报告、导入、设置
│   ├── store.ts          # Zustand 全局状态 + 云端读写逻辑
│   └── styles.css        # 沿用旧版视觉（含暗色主题与移动端适配）
└── index.html
```

## 安全说明

- 所有表启用 RLS：`family_id = auth.uid()`，换账号无法读取他人数据。
- 家长模式验证 = 用账号密码重新登录校验（Supabase Auth），前端无明文密码存储。
- 学生模式仅前端受限（与旧版一致）；服务端数据按家庭隔离。
