export const config = { runtime: 'nodejs' };

const endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const key = process.env.ZHIPU_API_KEY;
  if (!key) return new Response('Missing ZHIPU_API_KEY', { status: 500 });
  const { url, content } = await req.json();
  const model = process.env.MODEL_NAME || 'glm-4.6v';
  const system = '你是资深产品研究专家，请基于用户提供的原文进行结构化研判。只返回严格的 JSON。';
  const user = `来源 URL: ${url}
内容快照: ${String(content || '').substring(0, 20000)}

输出 JSON 字段：
- title
- productName
- tag: '竞品研究'|'用户反馈'|'需求灵感'|'深度思考'|'系统向导'|'随手记'
- structuredAnalysis
- summary
仅返回 JSON`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  const text = await upstream.text();
  if (!upstream.ok) return new Response(text || 'Upstream Error', { status: upstream.status });
  let data: any = {};
  try {
    const j = JSON.parse(text);
    const c = j?.choices?.[0]?.message?.content ?? j?.choices?.[0]?.message ?? '';
    data = typeof c === 'string' ? JSON.parse(c) : c;
  } catch {
    return new Response('Invalid upstream format', { status: 502 });
  }
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
