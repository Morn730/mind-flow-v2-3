export const config = { runtime: 'edge' };

const endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const key = process.env.ZHIPU_API_KEY;
  if (!key) return new Response('Missing ZHIPU_API_KEY', { status: 500 });
  const { items, dimensions, context } = await req.json();
  const model = process.env.MODEL_NAME || 'glm-4.6v';
  const prompt = `你是一个顶级的产品战略专家。请根据以下素材，为这几个产品生成一份深度的对标矩阵。
对标品牌: ${items.map((i: any) => i.productName).join(', ')}
对比维度: ${dimensions.join(', ')}
补充背景: ${context || ''}
素材内容:
${items.map((i: any) => `[${i.productName}] ${i.content}`).join('\n\n')}
请返回 JSON 格式，包含：
1. headers
2. rows
3. summary
4. strategies(type,title,content)`;
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '只返回 JSON。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    }),
  });
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
