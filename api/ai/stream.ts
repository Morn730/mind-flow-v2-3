export const config = { runtime: 'nodejs' };

const endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const key = process.env.ZHIPU_API_KEY;
  if (!key) return new Response('Missing ZHIPU_API_KEY', { status: 500 });
  const { history, message, context } = await req.json();
  const model = process.env.MODEL_NAME || 'glm-4.6v';
  const messages = [
    { role: 'system', content: `你是一个专业的 AI 产品经理助手。${context || ''}` },
    ...(Array.isArray(history) ? history.map((h: any) => ({ role: h.role, content: h.parts?.[0]?.text || h.text || '' })) : []),
    { role: 'user', content: message },
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new Response(text || 'Upstream Error', { status: upstream.status });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
