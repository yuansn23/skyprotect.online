// Cloudflare Pages Function — 服务端代理到 teamorouter 图片生成 API
// 路由：POST /api/generate
// 作用：把用户提示词转发给上游，隐藏 API Key，并统一返回 base64 图片。
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求体不是有效的 JSON' }, 400);
  }

  const prompt = (body.prompt || '').toString().trim();
  if (!prompt) {
    return json({ error: '请输入提示词' }, 400);
  }
  if (prompt.length > 4000) {
    return json({ error: '提示词过长（最多 4000 字符）' }, 400);
  }

  const apiKey = env.TEAMOROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: '服务端未配置 TEAMOROUTER_API_KEY 环境变量' }, 500);
  }

  // 只允许标准 gpt-image 尺寸，其余回退到 1024x1024
  const size = ['1024x1024', '1024x1536', '1536x1024'].includes(body.size)
    ? body.size
    : '1024x1024';

  const upstreamBody = {
    model: 'gpt-image-2.5-sunburst',
    prompt,
    n: 1,
    size,
  };

  let upstream;
  try {
    upstream = await fetch('https://api.teamorouter.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch (e) {
    return json({ error: `无法连接图片服务：${e.message}` }, 502);
  }

  const text = await upstream.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!upstream.ok || !data) {
    const msg = data?.error?.message || data?.message || `上游返回 ${upstream.status}`;
    return json({ error: `生成失败：${msg}` }, upstream.status || 502);
  }

  const first = data?.data?.[0] || {};
  const image = first.b64_json || first.url || null;
  if (!image) {
    return json({ error: '上游未返回图片数据' }, 502);
  }

  return json({
    image,
    revised_prompt: first.revised_prompt || null,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
