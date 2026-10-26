import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  console.warn(
    "未配置 Supabase 环境变量：请复制 .env.example 为 .env.local 并填入 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key"
);
