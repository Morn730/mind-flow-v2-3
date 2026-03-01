
// 监听插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 向当前活跃标签页发送指令
  chrome.tabs.sendMessage(tab.id, { action: "OPEN_SIDEBAR" }).catch((err) => {
    // 如果页面还没加载完或者没有权限，尝试注入脚本（兜底逻辑）
    console.log("发送消息失败，可能 content script 尚未就绪:", err);
  });
});

// 处理来自侧边栏的长连接或消息（如果需要）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "LOG") {
    console.log("Extension Log:", request.message);
  }
});
