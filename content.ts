
/**
 * 智能正文提取引擎
 * 过滤掉导航、广告、页脚，只保留核心价值内容
 */
const extractPageContent = () => {
  const url = window.location.href;
  const title = document.title;
  
  // 智能选择器：优先寻找 article, main 等语义化标签
  const mainElement = document.querySelector('article') || 
                      document.querySelector('main') || 
                      document.querySelector('.content') || 
                      document.body;

  // 清除脚本、样式和不可见元素
  const clone = mainElement.cloneNode(true) as HTMLElement;
  const toRemove = clone.querySelectorAll('script, style, nav, footer, iframe, ads');
  toRemove.forEach(el => el.remove());

  const text = clone.innerText
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
    .substring(0, 15000); // 限制字符数，避免 API 溢出

  return { title, url, text };
};

// 监听来自 Popup 的指令
// Use globalThis cast to avoid "Cannot find name 'chrome'" error in extension environment
(globalThis as any).chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === "GET_CONTENT") {
    const data = extractPageContent();
    sendResponse(data);
  }
});

export {};
