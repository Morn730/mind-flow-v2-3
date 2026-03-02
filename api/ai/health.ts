export const config = { runtime: 'nodejs' };

export default async function handler() {
  const hasKey = Boolean(process.env.ZHIPU_API_KEY && process.env.ZHIPU_API_KEY.length > 0);
  const env = process.env.VERCEL_ENV || 'unknown';
  const model = process.env.MODEL_NAME || 'glm-4.6v';
  return new Response(JSON.stringify({ ok: true, hasKey, env, model }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
