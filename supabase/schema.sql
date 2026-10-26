-- ============================================================
-- 单词默写云端版 · Supabase schema
-- 在 Supabase 控制台 → SQL Editor 中整体执行
-- 设计：一个登录账号 = 一个家庭(family)。family_id 直接使用 auth.uid()。
-- ============================================================

-- ---------- 学生档案 ----------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  avatar text not null default '🧑‍🎓',
  created_at timestamptz not null default now()
);

-- ---------- 词库：组别 → 单词本 → 单词 ----------
create table if not exists public.word_groups (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.word_books (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.word_groups(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.word_books(id) on delete cascade,
  en text not null,
  zh text not null,
  phon text not null default '',
  ex text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (book_id, en)
);

-- ---------- 每个学生的学习进度（learned / mastered） ----------
create table if not exists public.word_progress (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  learned boolean not null default false,
  mastered boolean not null default false,
  unique (student_id, word_id)
);

-- ---------- 错词本 ----------
create table if not exists public.wrong_words (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  wrong_count int not null default 1,
  last_wrong_at timestamptz not null default now(),
  unique (student_id, word_id)
);

-- ---------- 艾宾浩斯复习计划 ----------
create table if not exists public.review_plan (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  box int not null default 0,
  next_review timestamptz not null default now(),
  last_review timestamptz not null default now(),
  unique (student_id, word_id)
);

-- ---------- 每日统计（打卡） ----------
create table if not exists public.stats_daily (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  learn int not null default 0,
  quiz int not null default 0,
  right_cnt int not null default 0,
  wrong_cnt int not null default 0,
  unique (student_id, date)
);

-- ---------- 答题记录 ----------
create table if not exists public.quiz_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  mode text not null,
  word_id uuid not null references public.words(id) on delete cascade,
  is_correct boolean not null default false,
  is_skip boolean not null default false,
  retry_used boolean not null default false,
  duration_ms int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quiz_records_student_date on public.quiz_records (student_id, created_at desc);

-- ---------- 排行榜 ----------
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  mode text not null,
  date date not null,
  total int not null,
  right_cnt int not null,
  wrong_cnt int not null,
  time_sec int not null,
  pct int not null,
  score int not null,
  ts timestamptz not null default now()
);

-- ---------- 家庭设置（含权限配置） ----------
create table if not exists public.settings (
  family_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RLS：所有表仅允许本家庭（family_id = auth.uid()）读写
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'students','word_groups','word_books','words','word_progress','wrong_words',
    'review_plan','stats_daily','quiz_records','leaderboard','settings'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists own_family_select on public.%I;', t);
    execute format('drop policy if exists own_family_write on public.%I;', t);
    execute format($f$create policy own_family_select on public.%I
      for select using (family_id = auth.uid());$f$, t);
    execute format($f$create policy own_family_write on public.%I
      for all using (family_id = auth.uid()) with check (family_id = auth.uid());$f$, t);
  end loop;
end $$;
