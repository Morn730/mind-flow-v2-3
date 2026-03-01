
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "OPEN_SIDEBAR" });
});

// 如果 manifest 中配置了 popup.html，该监听器可能不生效。
// 我们在 content.js 中已经处理了初始化逻辑。
// 下面是兼容旧版点击的代码：
document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: "OPEN_SIDEBAR" });
    window.close(); // 立即关闭空白 popup
});
