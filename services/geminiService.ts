
import { KnowledgeItem } from "../types";

export class GeminiService {
  private get apiKey() {
    return (
      (globalThis as any).__ZHIPU_KEY__ ||
      (globalThis as any).process?.env?.ZHIPU_API_KEY ||
      (globalThis as any).process?.env?.API_KEY
    );
  }
  private get model() {
    return (
      (globalThis as any).__ZHIPU_MODEL__ ||
      (globalThis as any).process?.env?.MODEL_NAME ||
      "glm-4.6v"
    );
  }
  private get baseApi() {
    try {
      // 与当前仓库目录结构对齐：/api/ai/*
      return (globalThis as any).location ? "/api/ai" : null;
    } catch {
      return null;
    }
  }
  private readonly endpoint =
    "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  private ensureKey() {
    if (!this.apiKey) {
      throw new Error("缺少 ZHIPU_API_KEY 环境变量");
    }
  }

  private async callZhipu(messages: Array<{ role: string; content: any }>, opts?: Record<string, any>) {
    this.ensureKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 30000);
    const body = {
      model: this.model,
      messages,
      ...opts,
    };
    let res: Response;
    try {
      res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      try {
        const j = JSON.parse(text);
        const code = j?.error?.code || j?.code || res.status;
        const msg = j?.error?.message || j?.message || text;
        throw new Error(`Zhipu API 错误(${code}): ${msg}`);
      } catch {
        throw new Error(text || `Zhipu API 请求失败: ${res.status}`);
      }
    }
    return res.json();
  }

  private tryParseJSON(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      throw new Error("AI 返回数据格式错误");
    }
  }

  /**
   * Analyzes provided raw text content from a source URL.
   */
  async analyzeRawContent(url: string, rawContent: string) {
    if (!rawContent || rawContent.length < 50) throw new Error("内容过短，无法进行有效分析");
    if (this.baseApi) {
      const r = await fetch(`${this.baseApi}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, content: rawContent }),
      });
      const txt = await r.text();
      if (!r.ok) {
        throw new Error(txt || `后端代理错误: ${r.status}`);
      }
      return this.tryParseJSON(txt);
    }

    const system =
      "你是资深产品研究专家，请基于用户提供的原文进行结构化研判。只返回严格的 JSON。";
    const user = `来源 URL: ${url}
内容快照: ${rawContent.substring(0, 20000)}

输出 JSON 字段：
- title: 分析后的标题
- productName: 品牌或产品名称（尽量简短）
- tag: 必须取值之一：'竞品研究','用户反馈','需求灵感','深度思考','系统向导','随手记'
- structuredAnalysis: Markdown 格式的深度分析
- summary: 一句话摘要
仅返回 JSON，不要解释文本。`;

    const data = await this.callZhipu(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.3 }
    );
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.message ??
      "";
    return this.tryParseJSON(typeof text === "string" ? text : JSON.stringify(text));
  }

  /**
   * URL-based extraction using Search Grounding.
   */
  async extractWebContent(url: string) {
    const system = "你将收到一个网页 URL，请根据常识推断网页主要信息并给出要点总结。";
    const user = `请深度解析这个网页的内容：${url}
若无法直接访问，请基于 URL 与常识猜测内容结构，返回 300-600 字摘要。`;
    const data = await this.callZhipu(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.7 }
    );
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.message ??
      "未能获取到网页详细信息";
    return this.analyzeRawContent(url, String(text));
  }

  /**
   * Generates a matrix comparison for multiple products.
   */
  async generateMatrixAnalysis(items: KnowledgeItem[], dimensions: string[], userContext: string = "") {
    if (this.baseApi) {
      const r = await fetch(`${this.baseApi}/matrix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, dimensions, context: userContext }),
      });
      const txt = await r.text();
      if (!r.ok) {
        throw new Error(txt || `后端代理错误: ${r.status}`);
      }
      return this.tryParseJSON(txt);
    }
    const prompt = `你是一个顶级的产品战略专家。请根据以下素材，为这几个产品生成一份深度的对标矩阵。
    
对标品牌: ${items.map(i => i.productName).join(', ')}
对比维度: ${dimensions.join(', ')}
补充背景: ${userContext}

素材内容:
${items.map(i => `[${i.productName}] ${i.content}`).join('\n\n')}

请返回 JSON 格式，包含：
1. headers: 表头数组 (第一项通常是'维度')
2. rows: 二维数组，每一行代表一个品牌，包含各维度数据
3. summary: 整体战略研判摘要
4. strategies: 包含 type ('opportunity', 'risk', 'action'), title, content 的数组`;

    const system = "只返回 JSON，不要包含多余解释。";
    const data = await this.callZhipu(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { temperature: 0.5 }
    );
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.message ??
      "";
    return this.tryParseJSON(typeof text === "string" ? text : JSON.stringify(text));
  }

  async *streamChat(history: any[], message: string, contextItems: KnowledgeItem[]) {
    const contextText = contextItems.length > 0
      ? `基于以下知识库背景回答：\n\n${contextItems.map(i => `[${i.title}] ${i.content}`).join('\n\n')}`
      : "当前没有提供背景资料，请基于你的知识库回答。";

    if (this.baseApi) {
      const res = await fetch(`${this.baseApi}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message, context: contextText }),
      });
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const delta =
                obj?.choices?.[0]?.delta?.content ??
                obj?.choices?.[0]?.message?.content ??
                obj?.data ?? "";
              if (typeof delta === "string") {
                yield delta;
              } else if (Array.isArray(delta)) {
                yield delta.map((d) => (typeof d === "string" ? d : d?.text || "")).join("");
              }
            } catch {
              yield payload;
            }
          }
        }
        return;
      }
    }
    this.ensureKey();

    const messages = [
      { role: "system", content: `你是一个专业的 AI 产品经理助手，擅长竞品调研、需求挖掘和策略分析。${contextText}` },
      ...history.map((h: any) => ({ role: h.role, content: h.parts?.[0]?.text || h.text || "" })),
      { role: "user", content: message },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    }).catch((e) => {
      clearTimeout(timeout);
      throw e;
    });
    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Zhipu 流式接口错误: ${res.status}`);
    }
    clearTimeout(timeout);
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const obj = JSON.parse(payload);
          const delta =
            obj?.choices?.[0]?.delta?.content ??
            obj?.choices?.[0]?.message?.content ??
            obj?.data ?? "";
          if (typeof delta === "string") {
            yield delta;
          } else if (Array.isArray(delta)) {
            yield delta.map((d) => (typeof d === "string" ? d : d?.text || "")).join("");
          }
        } catch {
          yield payload;
        }
      }
    }
  }
}

export const gemini = new GeminiService();
// Expose to window for the browser extension to interact with
(window as any).geminiServiceInstance = gemini;
