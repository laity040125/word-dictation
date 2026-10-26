// Vercel Serverless 代理：把 /api/sb/* 的请求原样转发到 Supabase 项目域名
// 作用：大陆手机直连 *.supabase.co 被墙，走 Vercel 服务器中转即可访问
// ESM（package.json type: module）

const UPSTREAM = "https://vwxkapkfgpyeaszcvjyt.supabase.co";

export default async function handler(req, res) {
  try {
    // 去掉 /api/sb 前缀，保留剩余路径与查询串
    const url = req.url || "";
    const idx = url.indexOf("/sb/");
    const rest = idx >= 0 ? url.slice(idx + 3) : url.replace(/^\/sb/, "");
    const target = UPSTREAM + rest;

    // 转发请求头（去掉 host/长度/压缩相关，避免干扰）
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const lk = k.toLowerCase();
      if (["host", "content-length", "accept-encoding", "connection", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for"].includes(lk)) continue;
      headers[k] = v;
    }

    // 读取请求体
    let body;
    if (!["GET", "HEAD"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
      if (body.length === 0) body = undefined;
    }

    const resp = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    // 回传状态码与响应头（过滤 hop-by-hop 头）
    const respHeaders = {};
    resp.headers.forEach((v, k) => {
      const lk = k.toLowerCase();
      if (["content-encoding", "content-length", "transfer-encoding", "connection"].includes(lk)) return;
      respHeaders[k] = v;
    });
    Object.entries(respHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(resp.status);
    const buf = Buffer.from(await resp.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.status(502);
    res.json({ error: "proxy_failed", message: String(e && e.message || e) });
  }
}
