
let pageData = null;
let mindFlowTabId = null;
let analysisResult = null;

document.addEventListener('DOMContentLoaded', async () => {
    const el = {
        viewLoading: document.getElementById('view-loading'),
        viewReady: document.getElementById('view-ready'),
        viewAssets: document.getElementById('view-assets'),
        viewError: document.getElementById('view-error'),
        viewSuccess: document.getElementById('view-success'),
        footerActions: document.getElementById('footer-actions'),
        
        tabAnalysis: document.getElementById('tab-analysis'),
        tabAssets: document.getElementById('tab-assets'),
        
        aiSummary: document.getElementById('ai-summary'),
        aiDetail: document.getElementById('ai-detail'),
        btnSave: document.getElementById('btn-save'),
        projectSelect: document.getElementById('project-select'),
        tagSelect: document.getElementById('tag-select'),
        headerLoader: document.getElementById('header-loader'),
        saveBarBtn: document.getElementById('save-bar-btn'),
        saveProjectSelect: document.getElementById('save-project-select'),
        saveTagSelect: document.getElementById('save-tag-select')
    };

    /**
     * 严格视图状态机
     * @param {'loading' | 'ready' | 'assets' | 'error' | 'success'} state 
     */
    function setUIState(state) {
        [el.viewLoading, el.viewReady, el.viewAssets, el.viewError, el.viewSuccess].forEach(v => v.classList.remove('state-active'));
        el.footerActions.classList.remove('hidden');
        if (el.btnSave) el.btnSave.disabled = true;
        if (el.projectSelect) el.projectSelect.disabled = true;
        if (el.tagSelect) el.tagSelect.disabled = true;
        if (el.btnSave) el.btnSave.innerHTML = `<span>等待研判完成</span>`;

        switch(state) {
            case 'loading':
                el.viewLoading.classList.add('state-active');
                break;
            case 'ready':
                el.viewReady.classList.add('state-active');
                if (el.btnSave) el.btnSave.disabled = false;
                if (el.projectSelect) el.projectSelect.disabled = false;
                if (el.tagSelect) el.tagSelect.disabled = false;
                if (el.btnSave) el.btnSave.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>保存至 Mind Flow</span>
                `;
                break;
            case 'assets':
                el.viewAssets.classList.add('state-active');
                break;
            case 'error':
                el.viewError.classList.add('state-active');
                if (el.btnSave) el.btnSave.disabled = true;
                break;
            case 'success':
                el.viewSuccess.classList.add('state-active');
                break;
        }
    }

    // 初始化：开始 Loading
    setUIState('loading');

    // 1. 获取页面原始数据
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
        pageData = await chrome.tabs.sendMessage(currentTab.id, { action: "GET_EXTRACTED_DATA" });
    } catch (e) {
        document.getElementById('error-msg').textContent = "无法访问页面内容，请刷新重试";
        setUIState('error');
        return;
    }

    // 2. 寻找活跃的 Mind Flow 主应用
    const tabs = await chrome.tabs.query({});
    const foundTab = tabs.find(t => t.title && t.title.includes("Mind Flow"));
    
    if (foundTab) {
        mindFlowTabId = foundTab.id;
        initProjectList();
        runAIAnalysis();
    } else {
        el.viewLoading.innerHTML = `
            <div class="px-8 text-center space-y-6">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest">请先打开并登录 Mind Flow 主应用</p>
                <div class="flex items-center gap-2 justify-center">
                  <button id="btn-open-app" class="px-8 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-100">立即进入主应用</button>
                  <button id="btn-set-base" class="px-3 py-3 bg-white border border-slate-200 text-[10px] font-black rounded-xl uppercase tracking-widest hover:border-indigo-200">设置地址</button>
                </div>
            </div>
        `;
        document.getElementById('btn-open-app').onclick = async () => {
          const obj = await chrome.storage.sync.get({ mindflow_base_url: 'http://localhost:3000/' });
          const base = obj.mindflow_base_url || 'http://localhost:3000/';
          window.open(base, '_blank');
        };
        document.getElementById('btn-set-base').onclick = async () => {
          const input = prompt('请输入主应用地址（例如：https://your-project.vercel.app 或 http://localhost:3000/）');
          if (input && /^https?:\/\//.test(input.trim())) {
            await chrome.storage.sync.set({ mindflow_base_url: input.trim().replace(/\/$/, '/') });
            alert('已保存，点击“立即进入主应用”前往');
          } else {
            alert('地址格式不正确');
          }
        };
    }

    /**
     * 调用主应用的 AI 引擎进行深度分析
     */
    async function runAIAnalysis() {
        el.headerLoader.classList.remove('hidden');
        try {
            // 45s 超时保护
            const exec = chrome.scripting.executeScript({
                target: { tabId: mindFlowTabId },
                func: async (url, content) => {
                    if (window.geminiServiceInstance) {
                        try {
                          return await window.geminiServiceInstance.analyzeRawContent(url, content);
                        } catch (e) {
                          return { __error__: e && e.message ? e.message : "AI 调用失败" };
                        }
                    }
                    return { __error__: "主应用未暴露 AI 服务实例" };
                },
                args: [pageData.url, pageData.content]
            });
            const results = await Promise.race([
                exec,
                new Promise((_, rej) => setTimeout(() => rej(new Error("AI 调用超时，请检查密钥或网络")), 45000))
            ]);
            
            analysisResult = results[0].result;
            if (analysisResult && !analysisResult.__error__) {
                // 渲染 AI 结果
                el.aiSummary.textContent = analysisResult.summary;
                el.aiDetail.innerHTML = formatMarkdown(analysisResult.structuredAnalysis);
                // 内嵌图片查看器（基于当前页抽取的图片）
                setupInlineAssets(pageData?.images || []);
                // 成功解析后，才进入 Ready 状态
                setUIState('ready');
                // 顶部保存按钮显示并复用底部逻辑
                const headerBtn = document.getElementById('btn-save-header');
                if (headerBtn) {
                  headerBtn.classList.remove('hidden');
                  headerBtn.onclick = () => el.btnSave.click();
                }
            } else if (analysisResult && analysisResult.__error__) {
                document.getElementById('error-msg').textContent = analysisResult.__error__;
                setUIState('error');
            } else {
                throw new Error("AI 解析结果为空");
            }
        } catch (e) {
            document.getElementById('error-msg').textContent = "AI 引擎连接超时，请保持主站活跃";
            setUIState('error');
        } finally {
            el.headerLoader.classList.add('hidden');
        }
    }

    /**
     * 初始化项目列表选择器
     */
    async function initProjectList() {
        const results = await chrome.scripting.executeScript({
            target: { tabId: mindFlowTabId },
            func: () => localStorage.getItem('mindflow_state')
        });

        if (results?.[0]?.result) {
            const state = JSON.parse(results[0].result);
            const opts = state.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            if (el.projectSelect) el.projectSelect.innerHTML = opts;
            if (el.saveProjectSelect) el.saveProjectSelect.innerHTML = opts;
            if (el.saveProjectSelect && el.projectSelect) {
                el.saveProjectSelect.value = el.projectSelect.value || state.projects[0]?.id || '';
                el.saveProjectSelect.onchange = () => { el.projectSelect.value = el.saveProjectSelect.value; };
                el.projectSelect.onchange = () => { el.saveProjectSelect.value = el.projectSelect.value; };
            }
            if (el.saveTagSelect && el.tagSelect) {
                el.saveTagSelect.value = el.tagSelect.value || '竞品研究';
                el.saveTagSelect.onchange = () => { el.tagSelect.value = el.saveTagSelect.value; };
                el.tagSelect.onchange = () => { el.saveTagSelect.value = el.tagSelect.value; };
            }
        }
    }

    /**
     * 点击“保存至 Mind Flow”后的逻辑
     */
    el.btnSave.onclick = async () => {
        el.btnSave.disabled = true;
        el.btnSave.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;
        
        const newItem = {
            id: 'clipper-' + Date.now(),
            title: analysisResult.title || pageData.title,
            url: pageData.url,
            productName: analysisResult.productName || '未知产品',
            tag: el.tagSelect.value,
            sourceType: 'extension',
            content: analysisResult.structuredAnalysis,
            rawContent: pageData.content,
            timestamp: new Date().toLocaleDateString(),
            summary: analysisResult.summary,
            isLoading: false
        };

        try {
            await chrome.scripting.executeScript({
                target: { tabId: mindFlowTabId },
                func: (pid, item) => {
                    const currentUser = localStorage.getItem('mindflow_current_user');
                    const key = `mindflow_data_${currentUser}`;
                    const raw = localStorage.getItem(key);
                    if (!raw) return;
                    
                    const state = JSON.parse(raw);
                    state.projects = state.projects.map(p => {
                        if (p.id === pid) p.knowledgeBase.unshift(item); // 插入最前面
                        return p;
                    });
                    
                    localStorage.setItem(key, JSON.stringify(state));
                    localStorage.setItem('mindflow_state', JSON.stringify(state));
                    // 发送事件通知 React 主应用刷新 UI
                    window.postMessage({ type: 'MINDFLOW_IMPORT', payload: { projectId: pid, item: item } }, '*');
                },
                args: [el.saveProjectSelect?.value || el.projectSelect.value, newItem]
            });
            
            // 【关键修复】只有这里成功了，才会进入 success 状态
            setUIState('success');
        } catch (e) {
            el.btnSave.disabled = false;
            el.btnSave.innerHTML = `<span>保存失败，点击重试</span>`;
        }
    };

    if (el.saveBarBtn) {
        el.saveBarBtn.onclick = () => {
            if (el.saveProjectSelect && el.projectSelect) el.projectSelect.value = el.saveProjectSelect.value;
            if (el.saveTagSelect && el.tagSelect) el.tagSelect.value = el.saveTagSelect.value;
            el.btnSave.click();
        };
    }

    // --- 选项卡切换控制 ---
    el.tabAnalysis.onclick = () => {
        el.tabAnalysis.classList.add('tab-active');
        el.tabAssets.classList.remove('tab-active');
        if (analysisResult) setUIState('ready');
        else setUIState('loading');
    };

    el.tabAssets.onclick = () => {
        el.tabAssets.classList.add('tab-active');
        el.tabAnalysis.classList.remove('tab-active');
        setUIState('assets');
        renderAssets();
    };

    function renderAssets() {
        if (!pageData.images || pageData.images.length === 0) {
            el.viewAssets.innerHTML = `<div class="col-span-2 py-24 text-[10px] font-black text-slate-300 uppercase text-center tracking-widest">无可用素材</div>`;
            return;
        }
        el.viewAssets.innerHTML = pageData.images.map(src => `
            <div class="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 group relative">
                <img src="${src}" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
            </div>
        `).join('');
    }

    /**
     * Markdown 简单解析器（配合 CSS prose-content）
     */
    function formatMarkdown(text) {
        if (!text) return "";
        return text.split('\n').map(line => {
            const l = line.trim();
            if (!l) return '<div class="h-2"></div>';
            if (l.startsWith('###')) return `<h3>${l.replace(/^###\s*/, '')}</h3>`;
            if (l.startsWith('##')) return `<h3>${l.replace(/^##\s*/, '')}</h3>`;
            if (l.startsWith('*') || l.startsWith('-')) return `<li>${l.replace(/^[*|-]\s*/, '')}</li>`;
            
            // 粗体转换
            const bolded = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return `<p>${bolded}</p>`;
        }).join('');
    }

    /**
     * 内嵌图片查看器：主图 + 缩略图条，并提供显示/隐藏切换
     */
    function setupInlineAssets(images) {
      const container = document.getElementById('inline-assets');
      const main = document.getElementById('asset-main');
      const thumbs = document.getElementById('asset-thumbs');
      const toggleBtn = document.getElementById('btn-toggle-assets');
      if (!container || !main || !thumbs || !toggleBtn) return;
      if (!images || images.length === 0) {
        container.classList.add('hidden');
        toggleBtn.classList.add('hidden');
        return;
      }
      toggleBtn.classList.remove('hidden');
      // 构建缩略图
      thumbs.innerHTML = images.map((src, idx) => `
        <button data-idx="${idx}" class="shrink-0 w-20 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-300 focus:outline-none">
          <img src="${src}" class="w-full h-full object-cover" />
        </button>
      `).join('');
      // 设置主图
      const setMain = (i) => {
        const src = images[i];
        main.innerHTML = `<img src="${src}" class="w-full h-full object-contain bg-white" />`;
      };
      setMain(0);
      thumbs.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-idx') || '0');
          setMain(i);
        });
      });
      // 显示/隐藏切换
      toggleBtn.addEventListener('click', () => {
        container.classList.toggle('hidden');
      });
    }
});
