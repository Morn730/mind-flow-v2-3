
// Sidebar management
function injectSidebar() {
  let container = document.getElementById('mindflow-sidebar-container');
  if (container) {
    container.classList.toggle('open');
    return;
  }

  container = document.createElement('div');
  container.id = 'mindflow-sidebar-container';
  
  const closeBtn = document.createElement('div');
  closeBtn.id = 'mindflow-sidebar-close';
  closeBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5">
      <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  closeBtn.onclick = () => container.classList.remove('open');
  
  const iframe = document.createElement('iframe');
  iframe.id = 'mindflow-sidebar-iframe';
  iframe.src = chrome.runtime.getURL('sidebar.html');
  iframe.allow = "clipboard-read; clipboard-write";
  
  container.appendChild(closeBtn);
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Trigger animation
  setTimeout(() => container.classList.add('open'), 50);
}

// Data extraction logic
function extractPageData() {
  const imgs = Array.from(document.querySelectorAll('img'))
    .filter(img => {
      // Filter out small icons or transparent pixels
      const rect = img.getBoundingClientRect();
      const isVisible = rect.width > 150 && rect.height > 150;
      const isDataUrl = img.src.startsWith('data:');
      const isHttp = img.src.startsWith('http');
      return isVisible && (isHttp || isDataUrl);
    })
    .map(img => img.src)
    .slice(0, 15); // limit to 15 assets

  const content = document.body.innerText.substring(0, 25000);
  
  return {
    title: document.title,
    url: window.location.href,
    content: content,
    images: imgs
  };
}

// Listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "OPEN_SIDEBAR") {
    injectSidebar();
  } else if (request.action === "GET_EXTRACTED_DATA") {
    sendResponse(extractPageData());
  }
  return true;
});
