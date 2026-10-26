import { createClient } from "@supabase/supabase-js";

// 直连地址（本地开发用，电脑挂代理可直连 Supabase）
const directUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!directUrl || !key) {
  console.warn(
    "未配置 Supabase 环境变量：请复制 .env.example 为 .env.local 并填入 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
  );
}

// 生产环境（部署在 Vercel 上）走同域 /api/sb 服务端代理：
// 大陆直连 *.supabase.co 会被 SNI 阻断，由 Vercel 服务器中转即可访问。
const baseUrl =
  import.meta.env.PROD && typeof location !== "undefined"
    ? `${location.origin}/api/sb`
    : directUrl || "https://placeholder.supabase.co";

export const supabase = createClient(baseUrl, key || "placeholder-anon-key");
