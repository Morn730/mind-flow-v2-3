
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { INITIAL_PROJECTS, DEFAULT_DIMENSIONS, ICONS } from './constants';
import { AppState, KnowledgeItem, DataSourceTag, Project, ModalType, User } from './types';
import { gemini } from './services/geminiService';
import { AuthScreen } from './components/AuthScreen';

// --- Components: Markdown Renderer ---
const MarkdownRenderer: React.FC<{ content: string; compact?: boolean }> = ({ content, compact = false }) => {
  if (typeof content !== 'string') return <div className="text-red-400 text-xs">Error: Content is not text</div>;

  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className={`font-black text-slate-900 bg-indigo-50 px-1 rounded-md mx-0.5 box-decoration-clone ${compact ? 'text-inherit' : ''}`}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`space-y-1 ${compact ? 'text-sm' : ''}`}>
      {content.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className={compact ? "h-1.5" : "h-3"} />;

        if (trimmed.startsWith('###')) {
           return <h3 key={index} className={`${compact ? 'text-base mt-2 mb-1' : 'text-xl mt-6 mb-3'} font-black text-slate-900 tracking-tight`}>{parseBold(trimmed.replace(/^###\s*/, ''))}</h3>;
        }
        if (trimmed.startsWith('## ')) {
           return <h2 key={index} className={`${compact ? 'text-lg mt-3 mb-2' : 'text-2xl mt-8 mb-4'} font-black text-slate-900 tracking-tight`}>{parseBold(trimmed.replace(/^##\s*/, ''))}</h2>;
        }
        if (trimmed.startsWith('# ')) {
           return <h1 key={index} className={`${compact ? 'text-xl mt-4 mb-2' : 'text-3xl mt-10 mb-6'} font-black text-slate-900 tracking-tighter`}>{parseBold(trimmed.replace(/^#\s*/, ''))}</h1>;
        }
        if (trimmed.startsWith('####')) {
            return <h4 key={index} className={`${compact ? 'text-sm mt-2 mb-1' : 'text-lg mt-4 mb-2'} font-bold text-slate-800`}>{parseBold(trimmed.replace(/^####\s*/, ''))}</h4>;
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
           return (
             <div key={index} className={`flex gap-2 pl-1 items-start ${compact ? 'mb-1' : 'mb-2'}`}>
                <span className="text-indigo-400 shrink-0 mt-[0.4rem] text-[0.6rem]">●</span>
                <p className={`text-slate-700 leading-relaxed ${compact ? 'text-sm' : 'text-[16px]'}`}>{parseBold(trimmed.replace(/^[*|-]\s*/, ''))}</p>
             </div>
           );
        }
        if (trimmed.startsWith('> ')) {
            return (
                <blockquote key={index} className={`border-l-4 border-indigo-200 pl-3 py-1 my-2 bg-slate-50 italic text-slate-600 ${compact ? 'text-xs' : ''}`}>
                    {parseBold(trimmed.replace(/^>\s*/, ''))}
                </blockquote>
            )
        }
        return <p key={index} className={`text-slate-600 font-medium tracking-wide ${compact ? 'leading-relaxed text-sm mb-1' : 'leading-8 text-[16px] mb-2'}`}>{parseBold(line)}</p>;
      })}
    </div>
  );
};

// --- Component: Chat Message ---
const ChatMessage: React.FC<{ role: 'user' | 'model'; text: string }> = ({ role, text }) => {
  return (
    <div className={`flex w-full mb-4 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
       <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm leading-relaxed whitespace-pre-wrap ${role === 'user' ? 'bg-slate-900 text-white rounded-br-none text-sm' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
          {role === 'model' ? <MarkdownRenderer content={text} compact={true} /> : text}
       </div>
    </div>
  );
};

// --- Helper: Brand Normalization ---
const normalizeBrandName = (newName: string, existingItems: KnowledgeItem[]): string => {
  if (!newName) return "Unknown";
  const cleanNew = newName.trim();
  const lowerNew = cleanNew.toLowerCase();
  const existingBrands = Array.from(new Set(
    existingItems.map(i => i.productName).filter(n => n && n !== 'Analyzing...' && n !== 'Unknown' && n !== 'AI Processing') as string[]
  ));
  for (const existing of existingBrands) {
    const lowerExisting = existing.toLowerCase();
    if (lowerNew === lowerExisting) return existing;
    if (lowerNew.length > 3 && lowerExisting.length > 3) {
        if (lowerNew.includes(lowerExisting)) return existing; 
        if (lowerExisting.includes(lowerNew)) return existing;
    }
  }
  return cleanNew;
};

// --- Component: Knowledge Card ---
const KnowledgeCard: React.FC<{ 
  item: KnowledgeItem; 
  onClick: () => void; 
  onDelete: () => void; 
  onRetry: () => void;
  onMove: () => void; // New Prop
}> = ({ item, onClick, onDelete, onRetry, onMove }) => {
  const domain = item.url ? new URL(item.url).hostname : 'mindflow.ai';
  const isError = !!item.error;
  
  return (
    <div onClick={onClick} className={`relative group bg-white rounded-[24px] border border-slate-100/50 p-6 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full shadow-sm ${isError ? 'border-red-100 bg-red-50/20' : ''}`}>
      
      {/* Action Buttons (Delete & Move) */}
      <div className="absolute right-3 top-3 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={(e) => { e.stopPropagation(); onMove(); }} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="转移到...">
             <ICONS.Move />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="删除">
             <ICONS.Delete />
          </button>
      </div>

      {item.isLoading ? (
          <div className="flex flex-col h-full animate-pulse">
             <div className="flex items-center gap-4 mb-4 opacity-50">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <div className="h-2 bg-slate-100 rounded w-1/3" />
                    <div className="h-2 bg-slate-100 rounded w-1/4" />
                </div>
             </div>
             <div className="h-4 bg-slate-100 rounded w-3/4 mb-3 opacity-50" />
             <div className="flex-1 space-y-2 opacity-50">
                 <div className="h-2 bg-slate-100 rounded" />
                 <div className="h-2 bg-slate-100 rounded" />
             </div>
             <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="h-2 bg-slate-100 rounded w-1/4 opacity-50" />
                <span className="text-[9px] font-black text-indigo-400 uppercase animate-pulse">Analyzing...</span>
             </div>
          </div>
      ) : isError ? (
          <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4 text-red-500">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wide">Analysis Failed</span>
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-2 truncate">{item.url}</h3>
              <p className="text-xs text-red-400 mb-6 flex-1 leading-relaxed break-words font-mono bg-red-50/50 p-2 rounded">{item.error}</p>
              <button onClick={(e) => { e.stopPropagation(); onRetry(); }} className="w-full py-2 rounded-lg bg-white border border-red-100 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-colors shadow-sm">Retry Analysis</button>
          </div>
      ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-50 overflow-hidden p-2 group-hover:bg-white transition-all shadow-inner group-hover:scale-110">
                {item.tag === '随手记' ? (
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                ) : (
                    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" alt="favicon" />
                )}
                </div>
                <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em] truncate block mb-0.5">{item.productName}</span>
                <span className="text-[8px] font-bold text-slate-300 uppercase truncate block tracking-wider">{item.tag === '随手记' ? 'Memo' : domain}</span>
                </div>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">{item.title}</h3>
            <p className="text-[11px] text-slate-400 line-clamp-2 mb-6 flex-1 leading-relaxed">{item.summary || item.content.substring(0, 40)}</p>
            <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-[8px] font-black text-slate-300 tracking-[0.15em] uppercase">
                <span>{item.timestamp}</span>
                <span className={`font-bold ${item.tag === '系统向导' ? 'text-indigo-400' : 'text-slate-300 group-hover:text-indigo-400'} transition-colors`}>{item.tag}</span>
            </div>
          </>
      )}
    </div>
  );
};

// --- Component: Report Card ---
const ReportCard: React.FC<{ item: KnowledgeItem; onClick: () => void; onDelete: () => void }> = ({ item, onClick, onDelete }) => (
   <div onClick={onClick} className="group relative bg-white rounded-2xl p-0 border border-slate-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-xl cursor-pointer h-[280px] overflow-hidden flex flex-col">
      <div className="h-32 bg-gradient-to-br from-indigo-500 to-violet-600 p-5 flex flex-col justify-between relative overflow-hidden">
         <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-colors"><ICONS.Delete /></button>
         </div>
         <div className="relative z-10">
            <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-sm">深度研判</span>
         </div>
         <h3 className="relative z-10 text-lg font-black text-white leading-tight">{item.title}</h3>
         
         {/* Decor */}
         <div className="absolute -bottom-4 -right-4 text-white/10 transform rotate-12">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
         </div>
      </div>
      <div className="flex-1 p-5 flex flex-col justify-between">
         <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">{item.summary}</p>
         <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Created {item.timestamp}</span>
         </div>
      </div>
   </div>
);

// --- Component: Empty State ---
const EmptyState: React.FC<{ text: string, subtext: string }> = ({ text, subtext }) => (
   <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-60">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      </div>
      <h3 className="text-lg font-black text-slate-900 mb-1">{text}</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">{subtext}</p>
   </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  
  const [state, setState] = useState<AppState>(() => {
    // Default initial state, will be overwritten if user logs in
    const defaultProjectId = INITIAL_PROJECTS[0]?.id || null;
    return {
      currentTab: 'knowledge',
      selectedProjectId: defaultProjectId,
      projects: INITIAL_PROJECTS,
      isAnalyzing: false,
      isAnalysisModalOpen: false,
      selectedProductNames: [],
      viewingItemId: null,
      knowledgeFilter: defaultProjectId === 'tutorial-001' ? 'others' : 'competitors',
      selectedBrand: null,
    };
  });

  const [inputUrl, setInputUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
      message: string;
      targetProjectId: string;
      targetFilter: 'competitors' | 'others' | 'memos';
  } | null>(null);

  const processingRef = useRef<Set<string>>(new Set()); 
  
  const [detailViewMode, setDetailViewMode] = useState<'analysis' | 'original'>('analysis');
  const [memoPreviewMode, setMemoPreviewMode] = useState(false);

  const [analysisConfig, setAnalysisConfig] = useState<{ dimensions: string; context: string }>({
    dimensions: DEFAULT_DIMENSIONS.join('，'), 
    context: ''
  });

  const [modalState, setModalState] = useState<{ type: ModalType; projectId?: string; value: string }>({
    type: 'none',
    value: ''
  });

  // State for Move Modal
  const [moveModalState, setMoveModalState] = useState<{
    isOpen: boolean;
    itemId: string | null;
    targetProjectId: string;
    targetTag: DataSourceTag;
  }>({
    isOpen: false,
    itemId: null,
    targetProjectId: '',
    targetTag: '竞品研究'
  });
  
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoFormData, setMemoFormData] = useState({ title: '', summary: '' });

  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatContextIds, setChatContextIds] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load User from session or local storage if available
  useEffect(() => {
    const cachedUser = localStorage.getItem('mindflow_current_user') || sessionStorage.getItem('mindflow_current_user');
    if (cachedUser) {
       loadUserData(cachedUser, !!localStorage.getItem('mindflow_current_user'));
    }
  }, []);

  // Save State whenever it changes - Data Isolation Logic
  useEffect(() => {
    if (user) {
        localStorage.setItem(`mindflow_data_${user}`, JSON.stringify(state));
        localStorage.setItem('mindflow_state', JSON.stringify(state)); // "Hot" state for extension
    }
  }, [state, user]);

  const loadUserData = (username: string, rememberMe: boolean = false) => {
    setUser(username);
    
    // Manage persistence based on "Remember Me"
    if (rememberMe) {
        localStorage.setItem('mindflow_current_user', username);
        sessionStorage.removeItem('mindflow_current_user');
    } else {
        sessionStorage.setItem('mindflow_current_user', username);
        localStorage.removeItem('mindflow_current_user');
    }

    const savedData = localStorage.getItem(`mindflow_data_${username}`);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            setState(parsed);
        } catch (e) {
            console.error("Failed to load user data", e);
        }
    } else {
        // New user gets default state
        const defaultProjectId = INITIAL_PROJECTS[0]?.id || null;
        setState({
            currentTab: 'knowledge',
            selectedProjectId: defaultProjectId,
            projects: INITIAL_PROJECTS,
            isAnalyzing: false,
            isAnalysisModalOpen: false,
            selectedProductNames: [],
            viewingItemId: null,
            knowledgeFilter: defaultProjectId === 'tutorial-001' ? 'others' : 'competitors',
            selectedBrand: null,
        });
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mindflow_current_user');
    sessionStorage.removeItem('mindflow_current_user');
    localStorage.removeItem('mindflow_state'); 
  };

  // Listener for Extension Sync via window.postMessage
  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MINDFLOW_IMPORT') {
         const { projectId, item } = event.data.payload;
         if (!item || !projectId) return;
         
         setState(prev => {
             const targetProjectIndex = prev.projects.findIndex(p => p.id === projectId);
             if (targetProjectIndex === -1) return prev;

             const targetProject = prev.projects[targetProjectIndex];
             // Prevent duplicates if clicked multiple times quickly
             if (targetProject.knowledgeBase.some(k => k.id === item.id)) return prev;

             const newProjects = [...prev.projects];
             newProjects[targetProjectIndex] = {
                 ...targetProject,
                 knowledgeBase: [item, ...targetProject.knowledgeBase]
             };

             return {
                 ...prev,
                 projects: newProjects,
                 selectedProjectId: projectId, // Switch to the project receiving data
                 currentTab: 'knowledge',
                 knowledgeFilter: item.tag === '竞品研究' ? 'competitors' : 'others',
                 viewingItemId: null, // Don't auto-open, let user see the list item
                 selectedBrand: null
             };
         });
      }
    };
    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  const activeProject = useMemo(() => 
    state.projects.find(p => p.id === state.selectedProjectId) || null
  , [state.projects, state.selectedProjectId]);

  const visibleKnowledgeItems = useMemo(() => {
     if (!activeProject) return [];
     // FIX: We no longer filter out items with errors, allowing users to see and retry failed analyses.
     let items = activeProject.knowledgeBase.filter(i => i.sourceType !== 'report');
     if (state.knowledgeFilter === 'competitors') {
        items = items.filter(i => i.tag === '竞品研究');
        if (state.selectedBrand) {
           const normalize = (s: string) => s?.trim().toUpperCase();
           items = items.filter(i => normalize(i.productName || '') === normalize(state.selectedBrand!) || i.isLoading);
        }
     } else if (state.knowledgeFilter === 'others') {
        items = items.filter(i => i.tag !== '竞品研究' && i.tag !== '随手记');
     } else if (state.knowledgeFilter === 'memos') {
        items = items.filter(i => i.tag === '随手记');
     }
     return items;
  }, [activeProject, state.knowledgeFilter, state.selectedBrand]);

  const displayItems = useMemo(() => {
    if (!activeProject) return [];
    if (state.currentTab === 'reports') {
      return activeProject.knowledgeBase.filter(i => i.sourceType === 'report');
    }
    return visibleKnowledgeItems;
  }, [activeProject, state.currentTab, visibleKnowledgeItems]);

  // Update Brainstorming Context Logic
  useEffect(() => {
    if (isBrainstorming && activeProject) {
      // 默认选中：项目下所有资料（核心竞品、需求灵感、随手记 (Memos)、系统向导、以及报告）
      // 只要不是 error 状态
      const validItems = activeProject.knowledgeBase.filter(item => !item.error);
      const allIds = validItems.map(item => item.id);
      setChatContextIds(new Set(allIds));
    }
  }, [isBrainstorming, activeProject]);

  useEffect(() => {
    if (isBrainstorming) {
      setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatHistory, isBrainstorming, isChatting]);

  useEffect(() => {
    if (!activeProject) return;
    const pendingItems = activeProject.knowledgeBase.filter(
        item => item.sourceType === 'extension' && item.isLoading && item.rawContent && !processingRef.current.has(item.id)
    );
    if (pendingItems.length > 0) {
        pendingItems.forEach(async (item) => {
            processingRef.current.add(item.id); 
            try {
                const result = await gemini.analyzeRawContent(item.url || 'Extension', item.rawContent!);
                let rawName = result.productName?.trim();
                if (!rawName || rawName.length > 20) {
                    rawName = rawName?.split(/[,，\s|]/)[0] || "Unknown";
                }
                const finalProductName = normalizeBrandName(rawName, activeProject.knowledgeBase);
                setState(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => {
                        if (p.id === activeProject.id) {
                            return {
                                ...p,
                                knowledgeBase: p.knowledgeBase.map(kbItem => {
                                    if (kbItem.id === item.id) {
                                        return {
                                            ...kbItem,
                                            title: result.title || kbItem.title,
                                            productName: finalProductName, 
                                            tag: kbItem.tag || result.tag as DataSourceTag || '竞品研究',
                                            content: result.structuredAnalysis || "分析失败",
                                            rawContent: kbItem.rawContent, 
                                            summary: result.summary,
                                            isLoading: false,
                                            error: undefined 
                                        };
                                    }
                                    return kbItem;
                                })
                            };
                        }
                        return p;
                    })
                }));
            } catch (e: any) {
                console.error("Auto Analysis Failed for item:", item.id);
                setState(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => {
                        if (p.id === activeProject.id) {
                            return {
                                ...p,
                                knowledgeBase: p.knowledgeBase.map(kbItem => {
                                    if (kbItem.id === item.id) {
                                        return { ...kbItem, isLoading: false, error: e.message || '未知错误', summary: '分析失败' };
                                    }
                                    return kbItem;
                                })
                            };
                        }
                        return p;
                    })
                }));
            } finally {
                processingRef.current.delete(item.id);
            }
        });
    }
  }, [activeProject]);

  const isTutorial = activeProject?.id === 'tutorial-001';

  const brands = useMemo(() => {
    const brandMap = new Map<string, string>();
    activeProject?.knowledgeBase.forEach(i => {
      if (i.productName && i.tag === '竞品研究' && !i.error && !i.isLoading) {
          const key = i.productName.trim().toUpperCase();
          if (!brandMap.has(key)) {
              brandMap.set(key, i.productName.trim());
          }
      }
    });
    return Array.from(brandMap.values()).sort();
  }, [activeProject]);

  const viewingItem = useMemo(() => 
    activeProject?.knowledgeBase.find(i => i.id === state.viewingItemId)
  , [activeProject, state.viewingItemId]);
  
  useEffect(() => {
    if (state.viewingItemId) {
      setDetailViewMode('analysis');
      setMemoPreviewMode(false);
    }
  }, [state.viewingItemId]);

  const handleModalSubmit = () => {
    const trimmedValue = modalState.value.trim();
    if (modalState.type === 'create') {
      if (!trimmedValue) return;
      const newProject: Project = { id: Math.random().toString(36).substr(2, 9), name: trimmedValue, knowledgeBase: [], updatedAt: Date.now() };
      setState(s => ({ 
          ...s, 
          projects: [newProject, ...s.projects], 
          selectedProjectId: newProject.id, 
          currentTab: 'knowledge', 
          viewingItemId: null, 
          selectedBrand: null, 
          knowledgeFilter: 'competitors' 
      }));
    } else if (modalState.type === 'rename' && modalState.projectId) {
      if (!trimmedValue) return;
      setState(s => ({ ...s, projects: s.projects.map(p => p.id === modalState.projectId ? { ...p, name: trimmedValue } : p) }));
    } else if (modalState.type === 'delete' && modalState.projectId) {
      const idToDelete = modalState.projectId;
      setState(s => {
        const remaining = s.projects.filter(p => p.id !== idToDelete);
        const finalProjects = remaining.length === 0 ? INITIAL_PROJECTS : remaining;
        const newSelectedId = s.selectedProjectId === idToDelete ? (finalProjects[0]?.id || null) : s.selectedProjectId;
        return { 
            ...s, 
            projects: finalProjects, 
            selectedProjectId: newSelectedId, 
            viewingItemId: null,
            knowledgeFilter: newSelectedId === 'tutorial-001' ? 'others' : 'competitors' 
        };
      });
    }
    setModalState({ type: 'none', value: '' });
  };

  const createMemo = () => {
    if (!state.selectedProjectId || !memoFormData.title.trim()) return;
    const newMemo: KnowledgeItem = {
      id: `memo-${Date.now()}`,
      title: memoFormData.title.trim(),
      productName: '我的笔记',
      tag: '随手记',
      sourceType: 'manual',
      content: '',
      timestamp: new Date().toLocaleDateString(),
      summary: memoFormData.summary.trim() || '暂无描述',
      isLoading: false
    };
    setState(s => ({
      ...s,
      projects: s.projects.map(p => 
        p.id === s.selectedProjectId 
          ? { ...p, knowledgeBase: [newMemo, ...p.knowledgeBase] } 
          : p
      )
    }));
    setMemoFormData({ title: '', summary: '' });
    setShowMemoModal(false);
    setTimeout(() => {
        setState(s => ({ ...s, viewingItemId: newMemo.id }));
    }, 100);
  };

  const updateItemContent = (itemId: string, newContent?: string, newTitle?: string) => {
     if (!state.selectedProjectId) return;
     setState(s => ({
        ...s,
        projects: s.projects.map(p => {
           if (p.id === s.selectedProjectId) {
              return {
                 ...p,
                 knowledgeBase: p.knowledgeBase.map(item => 
                    item.id === itemId 
                        ? { 
                            ...item, 
                            ...(newContent !== undefined ? { content: newContent } : {}),
                            ...(newTitle !== undefined ? { title: newTitle } : {}) 
                          } 
                        : item
                 )
              };
           }
           return p;
        })
     }));
  };

  const insertFormat = (startTag: string, endTag: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea || !state.selectedProjectId || !state.viewingItemId || !viewingItem) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newContent = before + startTag + selection + endTag + after;
    updateItemContent(state.viewingItemId, newContent);
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + startTag.length, end + startTag.length);
    }, 0);
  };

  const deleteItem = (itemId: string) => {
    if (!state.selectedProjectId) return;
    setState(s => ({
      ...s,
      projects: s.projects.map(p => 
        p.id === s.selectedProjectId 
          ? { ...p, knowledgeBase: p.knowledgeBase.filter(i => i.id !== itemId) } 
          : p
      )
    }));
  };

  // --- Logic for Moving Items ---
  const openMoveModal = (item: KnowledgeItem) => {
    if (!state.selectedProjectId) return;

    // Intelligent Default Tag:
    // If current tag is NOT '竞品研究' or '需求灵感' (e.g. Memo, Report), default to '需求灵感' (Others).
    // Otherwise keep the original tag.
    let defaultTargetTag: DataSourceTag = '需求灵感';
    if (item.tag === '竞品研究' || item.tag === '需求灵感') {
        defaultTargetTag = item.tag;
    }

    setMoveModalState({
      isOpen: true,
      itemId: item.id,
      targetProjectId: state.selectedProjectId, // Default to current project
      targetTag: defaultTargetTag
    });
  };

  const executeMoveItem = () => {
    const { itemId, targetProjectId, targetTag } = moveModalState;
    if (!itemId || !targetProjectId || !state.selectedProjectId) return;

    setState(prev => {
        // 1. Locate Source Project
        const sourceProjectIndex = prev.projects.findIndex(p => p.id === prev.selectedProjectId);
        if (sourceProjectIndex === -1) return prev;
        
        const sourceProject = prev.projects[sourceProjectIndex];
        const itemToMove = sourceProject.knowledgeBase.find(i => i.id === itemId);
        
        if (!itemToMove) return prev; // Item not found

        // 2. Prepare Moved Item
        const movedItem = { ...itemToMove, tag: targetTag };

        // 3. Create new Projects Array (shallow copy of array)
        const newProjects = [...prev.projects];

        // 4. Update Source Project (Remove Item)
        // We create a new object for source project
        newProjects[sourceProjectIndex] = {
            ...sourceProject,
            knowledgeBase: sourceProject.knowledgeBase.filter(i => i.id !== itemId)
        };

        // 5. Update Target Project (Add Item)
        const targetProjectIndex = newProjects.findIndex(p => p.id === targetProjectId);
        if (targetProjectIndex === -1) return prev; // Safety check

        // Note: If sourceIndex === targetIndex, newProjects[targetProjectIndex] now refers to the 
        // UPDATED source project (with item removed) because we assigned it in step 4.
        // So we are correctly adding it back to the list that has the item removed.
        const targetProject = newProjects[targetProjectIndex];
        
        newProjects[targetProjectIndex] = {
            ...targetProject,
            knowledgeBase: [movedItem, ...targetProject.knowledgeBase]
        };

        return { ...prev, projects: newProjects };
    });

    // Determine filter based on targetTag for the toast action
    let targetFilter: 'competitors' | 'others' | 'memos' = 'others';
    if (targetTag === '竞品研究') targetFilter = 'competitors';
    if (targetTag === '随手记') targetFilter = 'memos';

    setSuccessToast({
        message: "转移成功",
        targetProjectId,
        targetFilter
    });

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        setSuccessToast(null);
    }, 5000);

    setMoveModalState(prev => ({ ...prev, isOpen: false }));
  };


  const processUrlAnalysis = async (tempId: string, url: string, content: string | null = null, forcedTag?: DataSourceTag) => {
      if (!state.selectedProjectId) return;
      try {
          let result;
          if (content) {
              result = await gemini.analyzeRawContent(url, content);
          } else {
              result = await gemini.extractWebContent(url);
          }
          let rawName = result.productName?.trim();
          if (!rawName || rawName.length > 20) {
             rawName = rawName?.split(/[,，\s|]/)[0] || "Unknown";
          }
          const currentProject = state.projects.find(p => p.id === state.selectedProjectId);
          const finalProductName = normalizeBrandName(rawName, currentProject ? currentProject.knowledgeBase : []);
          setState(s => ({
            ...s,
            projects: s.projects.map(p => {
                if (p.id === s.selectedProjectId) {
                    return {
                        ...p,
                        knowledgeBase: p.knowledgeBase.map(item => {
                            if (item.id === tempId) {
                                return {
                                    ...item,
                                    title: result.title || "Mind Insight",
                                    productName: finalProductName, 
                                    url: result.url || url.substring(0, 50),
                                    tag: forcedTag || result.tag as DataSourceTag || '竞品研究',
                                    content: result.structuredAnalysis || "",
                                    rawContent: content || result.originalTextContent || "未能获取到原文快照。",
                                    timestamp: new Date().toLocaleDateString(),
                                    summary: result.summary,
                                    isLoading: false,
                                    error: undefined 
                                };
                            }
                            return item;
                        })
                    };
                }
                return p;
            })
          }));
      } catch (e: any) {
          console.error(e);
          setState(s => ({
            ...s,
            projects: s.projects.map(p => {
                if (p.id === s.selectedProjectId) {
                    return {
                        ...p,
                        knowledgeBase: p.knowledgeBase.map(item => {
                            if (item.id === tempId) {
                                return {
                                    ...item,
                                    isLoading: false,
                                    error: e.message || "解析失败，请检查网络或重试"
                                };
                            }
                            return item;
                        })
                    };
                }
                return p;
            })
          }));
      }
  };

  const startExtraction = async () => {
    if (!inputUrl || !state.selectedProjectId) return;
    let targetUrl = inputUrl;
    let extractedContent: string | null = null;
    if (inputUrl.startsWith("URL:") && inputUrl.includes("CONTENT:")) {
      const urlMatch = inputUrl.match(/URL:\s*(.*?)\n/);
      const contentMatch = inputUrl.match(/CONTENT:\s*([\s\S]*)/);
      targetUrl = urlMatch ? urlMatch[1].trim() : "Extension Import";
      extractedContent = contentMatch ? contentMatch[1].trim() : null;
    }

    if (activeProject) {
       const normalize = (u: string) => u.trim().replace(/\/$/, '').toLowerCase();
       const targetNormalized = normalize(targetUrl);
       // FIX: If duplicate found but it has an error, we allow re-extraction to overwrite it.
       const duplicateItem = activeProject.knowledgeBase.find(item => {
          if (!item.url) return false;
          return normalize(item.url) === targetNormalized;
       });
       
       if (duplicateItem && !duplicateItem.error) {
          setErrorMessage("已添加"); 
          setInputUrl(''); 
          return;
       }
       // If it was a duplicate but had an error, remove the old one first.
       if (duplicateItem && duplicateItem.error) {
          deleteItem(duplicateItem.id);
       }
    }

    setIsExtracting(true); 
    const tempId = Math.random().toString(36).substr(2, 9);
    let targetTag: DataSourceTag = '竞品研究';
    if (state.knowledgeFilter === 'others') {
        targetTag = '需求灵感';
    }
    const tempItem: KnowledgeItem = {
      id: tempId,
      title: "正在解析 URL 内容...",
      productName: "Analyzing...",
      url: targetUrl,
      tag: targetTag,
      sourceType: 'extension', 
      content: "",
      timestamp: new Date().toLocaleDateString(),
      summary: "AI 正在深度解析内容...",
      isLoading: true,
      rawContent: extractedContent || undefined
    };
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === s.selectedProjectId ? { ...p, knowledgeBase: [tempItem, ...p.knowledgeBase] } : p)
    }));
    setInputUrl('');
    setIsExtracting(false); 
    await processUrlAnalysis(tempId, targetUrl, extractedContent, targetTag);
  };

  const retryItem = async (item: KnowledgeItem) => {
     if (!state.selectedProjectId || !item.url) return;
     setState(s => ({
        ...s,
        projects: s.projects.map(p => {
            if (p.id === s.selectedProjectId) {
                return {
                    ...p,
                    knowledgeBase: p.knowledgeBase.map(i => i.id === item.id ? { ...i, isLoading: true, error: undefined, summary: "正在重试解析..." } : i)
                };
            }
            return p;
        })
     }));
     await processUrlAnalysis(item.id, item.url, item.rawContent, item.tag);
  };

  const runMatrixAnalysis = async () => {
    if (!activeProject || state.selectedProductNames.length < 2) return;
    const tempId = `rep-${Date.now()}`;
    const reportTitle = `${state.selectedProductNames.join(' vs ')} 深度对比`;
    const customDimensions = analysisConfig.dimensions.split(/[,，]/).map(d => d.trim()).filter(Boolean);
    const finalDimensions = customDimensions.length > 0 ? customDimensions : DEFAULT_DIMENSIONS;
    const loadingItem: KnowledgeItem = {
        id: tempId,
        title: reportTitle,
        tag: '深度思考',
        sourceType: 'report',
        content: '',
        timestamp: new Date().toLocaleDateString(),
        summary: 'Mind Flow 正在深度研判中，请稍候...',
        isLoading: true,
        productName: 'AI Processing',
    };
    setState(s => ({ 
        ...s, 
        isAnalyzing: true, 
        isAnalysisModalOpen: false, 
        currentTab: 'reports', 
        selectedBrand: null,
        viewingItemId: null,
        projects: s.projects.map(p => p.id === s.selectedProjectId ? { ...p, knowledgeBase: [loadingItem, ...p.knowledgeBase] } : p)
    }));
    try {
      const targetItems = activeProject.knowledgeBase.filter(i => state.selectedProductNames.includes(i.productName || ''));
      const resultJSON = await gemini.generateMatrixAnalysis(targetItems, finalDimensions, analysisConfig.context);
      setState(s => ({
        ...s,
        projects: s.projects.map(p => {
            if (p.id === s.selectedProjectId) {
                return {
                    ...p,
                    knowledgeBase: p.knowledgeBase.map(item => {
                        if (item.id === tempId) {
                            return {
                                ...item,
                                content: JSON.stringify(resultJSON), 
                                summary: `Mind Flow 自动化深度研判结果。`,
                                productName: '研究报告',
                                isLoading: false
                            };
                        }
                        return item;
                    })
                };
            }
            return p;
        })
      }));
    } catch (e) {
      setErrorMessage("矩阵报告生成失败");
      setState(s => ({
        ...s,
        projects: s.projects.map(p => p.id === s.selectedProjectId ? { ...p, knowledgeBase: p.knowledgeBase.filter(i => i.id !== tempId) } : p)
      }));
    } finally {
      setState(s => ({ ...s, isAnalyzing: false }));
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeProject) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);
    try {
      const contextItems = activeProject.knowledgeBase.filter(item => chatContextIds.has(item.id));
      const apiHistory = chatHistory.map(msg => ({
         role: msg.role,
         parts: [{ text: msg.text }]
      }));
      const stream = gemini.streamChat(apiHistory, userMsg, contextItems);
      let fullResponse = "";
      for await (const chunk of stream) {
        fullResponse += chunk;
        setChatHistory(prev => {
           const lastMsg = prev[prev.length - 1];
           if (lastMsg && lastMsg.role === 'model') {
              const newHistory = [...prev];
              newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
              return newHistory;
           } else {
              return [...prev, { role: 'model', text: fullResponse }];
           }
        });
      }
    } catch (e: any) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', text: `Error: ${e.message || "Something went wrong."}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const renderReportView = (content: string) => {
    let data;
    if (typeof content !== 'string') {
        data = content;
    } else {
        try {
          data = JSON.parse(content);
        } catch (e) {
          return <MarkdownRenderer content={content} />;
        }
    }
    if (!data || typeof data !== 'object') {
        return <MarkdownRenderer content={String(data || content)} />;
    }
    return (
      <div className="space-y-16 animate-in slide-in-from-bottom-8 duration-500 pb-20">
        {data.summary && (
          <div className="bg-indigo-50/50 rounded-[32px] p-10 border border-indigo-100">
             <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4">Executive Summary</h3>
             <p className="text-indigo-900/80 text-lg leading-relaxed font-medium">{data.summary}</p>
          </div>
        )}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-8 bg-indigo-600 rounded-full"/>
            <h3 className="text-2xl font-black text-slate-900">核心维度矩阵</h3>
          </div>
          <div className="overflow-x-auto rounded-[24px] border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {data.headers?.map((h: string, i: number) => (
                    <th key={i} className={`p-6 text-xs font-black uppercase tracking-widest text-slate-500 ${i === 0 ? 'sticky left-0 bg-slate-50 z-10 border-r border-slate-200' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows?.map((row: string[], idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    {row.map((cell: string, i: number) => (
                      <td key={i} className={`p-6 text-sm font-medium leading-relaxed text-slate-700 min-w-[200px] ${i === 0 ? 'sticky left-0 bg-white group-hover:bg-slate-50/50 font-black text-slate-900 border-r border-slate-100 z-10 w-48' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {data.strategies && (
          <section>
             <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-8 bg-emerald-500 rounded-full"/>
                <h3 className="text-2xl font-black text-slate-900">策略研判</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.strategies.map((strat: any, idx: number) => {
                  const styles = {
                    opportunity: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-600', title: 'text-emerald-900' },
                    risk: { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'text-rose-600', title: 'text-rose-900' },
                    action: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600', title: 'text-blue-900' }
                  }[strat.type as string] || { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-600', title: 'text-slate-900' };

                  return (
                    <div key={idx} className={`${styles.bg} border ${styles.border} p-8 rounded-[32px] hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
                       <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2 bg-white rounded-lg shadow-sm ${styles.icon}`}>
                             {strat.type === 'opportunity' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeWidth={3}/></svg>}
                             {strat.type === 'risk' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={3}/></svg>}
                             {strat.type === 'action' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeWidth={3}/></svg>}
                          </div>
                          <span className={`text-xs font-black uppercase tracking-widest ${styles.title}`}>{strat.title}</span>
                       </div>
                       <p className="text-slate-700 font-medium leading-relaxed text-sm">
                         {strat.content}
                       </p>
                    </div>
                  );
                })}
             </div>
          </section>
        )}
      </div>
    );
  };

  if (!user) {
    return <AuthScreen onLogin={loadUserData} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed left-4 top-1/2 -translate-y-1/2 z-[500] group/sidebar transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] translate-x-0 opacity-100">
        <nav className="bg-white/95 backdrop-blur-3xl border border-white/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-[32px] py-6 px-4 flex flex-col items-start gap-5 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] h-fit min-h-[160px] max-h-[85vh] w-[78px] group-hover/sidebar:w-64 overflow-hidden">
          <div className="flex items-center gap-4 px-1 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0 animate-gradient bg-gradient-to-tr from-indigo-600 to-violet-500">
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={3}/></svg>
            </div>
            <span className="text-sm font-black tracking-widest text-slate-900 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap uppercase">Mind Flow</span>
          </div>
          <div className="w-full h-[1px] bg-slate-100 shrink-0" />
          <div className="flex-1 flex flex-col gap-2 items-start overflow-y-auto no-scrollbar w-full">
            {state.projects.map(p => (
              <div key={p.id} className={`group/item flex items-center gap-3 w-full p-1 rounded-2xl transition-all cursor-pointer ${state.selectedProjectId === p.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                onClick={() => setState(s => ({ 
                  ...s, 
                  selectedProjectId: p.id, 
                  viewingItemId: null, 
                  currentTab: 'knowledge', 
                  knowledgeFilter: p.id === 'tutorial-001' ? 'others' : 'competitors', 
                  selectedBrand: null 
                }))}>
                <div className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all border-2 flex items-center justify-center shrink-0 ${state.selectedProjectId === p.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-50 group-hover/item:border-indigo-100'}`}>
                  {p.name.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 flex items-center justify-between opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 delay-150 overflow-hidden pr-2">
                  <span className="text-xs font-bold text-slate-600 truncate whitespace-nowrap mr-2">{p.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); setModalState({ type: 'delete', projectId: p.id, value: p.name }); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"><ICONS.Delete /></button>
                </div>
              </div>
            ))}
            <div onClick={() => setModalState({ type: 'create', value: '' })} className="group/add flex items-center gap-3 w-full p-1 rounded-2xl hover:bg-indigo-50/50 transition-all cursor-pointer mt-2">
              <div className="w-10 h-10 border-2 border-dashed border-slate-200 text-slate-300 rounded-xl flex items-center justify-center group-hover/add:border-indigo-400 group-hover/add:text-indigo-400 shrink-0 transition-colors">
                <ICONS.Plus />
              </div>
              <span className="text-xs font-bold text-slate-400 group-hover/add:text-indigo-500 opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap font-black">创建新项目</span>
            </div>
          </div>

          <div className="w-full pt-4 mt-auto border-t border-slate-100 shrink-0">
             <div className="flex items-center gap-3 p-1 rounded-2xl group/user overflow-hidden">
                 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black shrink-0">
                    {user?.substring(0, 1).toUpperCase()}
                 </div>
                 <div className="flex-1 min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 flex flex-col">
                    <span className="text-xs font-bold text-slate-900 truncate">{user}</span>
                    <button onClick={handleLogout} className="text-[10px] text-indigo-500 font-bold hover:underline text-left">退出登录</button>
                 </div>
             </div>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col transition-all duration-500 ml-28 mr-6">
        <header className="sticky top-0 z-[400] h-32 flex items-end justify-between bg-[#F8F9FB]/80 backdrop-blur-md px-4 pb-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 group cursor-default">
              <h1 className="text-xl font-black tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                {activeProject?.name || "尚未选择项目"}
              </h1>
              {activeProject && !isTutorial && (
                <button onClick={() => setModalState({ type: 'rename', projectId: activeProject.id, value: activeProject.name })} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <ICONS.Edit />
                </button>
              )}
            </div>
            
            <nav className={`flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 ${isTutorial ? 'invisible pointer-events-none select-none' : ''}`}>
               <div className="flex bg-white/50 p-1 rounded-xl border border-slate-200/60 shadow-sm">
                  {[
                    { id: 'competitors', label: '核心竞品', tab: 'knowledge' },
                    { id: 'others', label: '调研灵感', tab: 'knowledge' },
                    { id: 'memos', label: '随手记', tab: 'knowledge' }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setState(s => ({ ...s, currentTab: 'knowledge', knowledgeFilter: item.id as any, viewingItemId: null, selectedBrand: null }))}
                      className={`px-5 py-1.5 rounded-lg text-[11px] font-black transition-all ${state.currentTab === 'knowledge' && state.knowledgeFilter === item.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                      {item.label}
                    </button>
                  ))}
               </div>
               
               <div className="w-[1px] h-4 bg-slate-300 mx-2" />
               
               <button 
                 onClick={() => setState(s => ({ ...s, currentTab: 'reports', viewingItemId: null }))}
                 className={`px-6 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-2 transition-all ${state.currentTab === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}
               >
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth={2.5}/></svg>
                 研究报告
               </button>
            </nav>
          </div>

          <div className="flex items-center gap-4 mb-1">
             {state.knowledgeFilter === 'memos' ? (
                 <button 
                   onClick={() => setShowMemoModal(true)}
                   className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 px-5 py-3 rounded-xl text-[11px] font-black shadow-sm transition-all flex items-center gap-2"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    新建笔记
                 </button>
             ) : (
                <div className="relative group/input">
                    <input 
                      value={inputUrl} onChange={e => setInputUrl(e.target.value)}
                      placeholder="粘贴 URL，Pro 引擎深度解析..." 
                      className="w-56 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-medium focus:ring-4 ring-indigo-500/5 outline-none transition-all shadow-sm group-hover/input:border-indigo-200" 
                      onKeyPress={e => e.key === 'Enter' && startExtraction()}
                    />
                    <button onClick={startExtraction} disabled={isExtracting} className="absolute right-1 top-1 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      {isExtracting ? <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <ICONS.Url />}
                    </button>
                 </div>
             )}
             
             <button onClick={() => { setIsBrainstorming(true); setState(s => ({ ...s, viewingItemId: null })); }} className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 px-5 py-3 rounded-xl text-[11px] font-black shadow-sm transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                AI 头脑风暴
             </button>

             <button 
               onClick={() => {
                 if (brands.length === 0) {
                   setErrorMessage("暂无竞品数据。请先采集内容（需 AI 判定为【竞品研究】）。");
                   return;
                 }
                 if (brands.length < 2) {
                   setErrorMessage("对比矩阵至少需要 2 个不同的竞品品牌。");
                   return;
                 }
                 setState(s => ({ ...s, isAnalysisModalOpen: true, selectedProductNames: brands }));
               }}
               className={`px-6 py-3 rounded-xl text-[11px] font-black shadow-lg transition-all ${brands.length < 2 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 active:scale-95 shadow-slate-200'}`}
             >
                竞品矩阵分析
             </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden px-4 pb-4">
            <div className={`h-full overflow-y-auto no-scrollbar pt-6 pb-24 transition-opacity duration-300 ${state.viewingItemId || isBrainstorming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {state.currentTab === 'knowledge' && state.knowledgeFilter === 'competitors' && brands.length > 0 && !isTutorial && (
                  <div className="flex flex-wrap gap-2 mb-8 animate-in slide-in-from-left-4 duration-300">
                    <button onClick={() => setState(s => ({ ...s, selectedBrand: null }))} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${!state.selectedBrand ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>全部</button>
                    {brands.map(brand => (
                      <button key={brand} onClick={() => setState(s => ({ ...s, selectedBrand: brand }))} className={`max-w-[160px] truncate px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${state.selectedBrand === brand ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>{brand}</button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayItems.map(item => (
                    state.currentTab === 'reports' ? 
                    <ReportCard key={item.id} item={item} onClick={() => setState(s => ({ ...s, viewingItemId: item.id }))} onDelete={() => deleteItem(item.id)} /> :
                    <KnowledgeCard 
                        key={item.id} 
                        item={item} 
                        onClick={() => !item.error && !item.isLoading && setState(s => ({ ...s, viewingItemId: item.id }))} 
                        onDelete={() => deleteItem(item.id)} 
                        onRetry={() => retryItem(item)}
                        onMove={() => openMoveModal(item)} // Pass move handler
                    />
                  ))}
                  {displayItems.length === 0 && (
                    <EmptyState text={state.currentTab === 'reports' ? "暂无研究报告" : state.knowledgeFilter === 'memos' ? "暂无随手记" : "列表空空如也"} subtext={state.currentTab === 'reports' ? "启动对标矩阵来生成深度研判。" : state.knowledgeFilter === 'memos' ? "点击上方“新建笔记”开始记录。" : "调整筛选条件或添加新的采集内容。"} />
                  )}
                </div>
            </div>

            {/* Viewing Item Modal */}
            {state.viewingItemId && viewingItem && (
                <div className="absolute inset-0 z-50 pt-4 px-0 pb-0 flex flex-col pointer-events-none"> 
                   <div className="pointer-events-auto flex-1 bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 fade-in duration-500">
                      
                     {/* Modal Header */}
                     <div className="shrink-0 z-[10] px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md">
                       <button onClick={() => setState(s => ({ ...s, viewingItemId: null }))} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-[10px] transition-all uppercase tracking-widest group">
                          <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={3}/></svg>
                          </div>
                          返回列表
                       </button>

                       {/* Central Title / Switcher */}
                       {viewingItem.tag === '随手记' ? (
                           <div className="flex-1 mx-8 flex justify-center">
                                <input 
                                    value={viewingItem.title} 
                                    onChange={(e) => updateItemContent(viewingItem.id, undefined, e.target.value)}
                                    className="w-full max-w-sm text-center bg-transparent outline-none font-bold text-slate-700 text-sm focus:bg-slate-50 rounded-lg px-3 py-1.5 transition-colors border border-transparent focus:border-slate-100 placeholder:text-slate-300"
                                    placeholder="Untitled Memo"
                                />
                           </div>
                       ) : viewingItem.sourceType !== 'report' && viewingItem.sourceType !== 'manual' ? (
                         <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setDetailViewMode('analysis')} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${detailViewMode === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>AI 提取</button>
                            <button onClick={() => setDetailViewMode('original')} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${detailViewMode === 'original' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>实时网页</button>
                         </div>
                       ) : <div className="w-10" />}

                       {/* Right Actions */}
                       <div className="flex items-center gap-3">
                         {viewingItem.tag === '随手记' ? (
                             <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setMemoPreviewMode(false)} title="Edit Mode" className={`p-2 rounded-md transition-all ${!memoPreviewMode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => setMemoPreviewMode(true)} title="Preview Mode" className={`p-2 rounded-md transition-all ${memoPreviewMode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </button>
                             </div>
                         ) : (
                             <>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{viewingItem.tag}</span>
                                <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                    {(viewingItem.sourceType === 'report' || viewingItem.productName === 'AI Processing') ? '研究报告' : viewingItem.productName}
                                </span>
                             </>
                         )}
                       </div>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col bg-white">
                        {/* Memo Editor View */}
                        {viewingItem.tag === '随手记' ? (
                            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                {/* Toolbar (Only in Edit Mode) */}
                                {!memoPreviewMode && (
                                    <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto shrink-0 bg-white z-10 sticky top-0">
                                        {[
                                            { label: 'Bold', tag: '**', end: '**', icon: <span className="font-bold">B</span> },
                                            { label: 'Italic', tag: '*', end: '*', icon: <span className="italic font-serif">I</span> },
                                            { spacer: true },
                                            { label: 'H1', tag: '# ', end: '', icon: <span className="font-black text-xs">H1</span> },
                                            { label: 'H2', tag: '## ', end: '', icon: <span className="font-bold text-xs">H2</span> },
                                            { spacer: true },
                                            { label: 'List', tag: '- ', end: '', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> },
                                            { label: 'Quote', tag: '> ', end: '', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg> }
                                        ].map((tool: any, idx) => (
                                            tool.spacer ? <div key={idx} className="w-[1px] h-4 bg-slate-200 mx-2" /> :
                                            <button 
                                                key={idx}
                                                onClick={() => insertFormat(tool.tag, tool.end)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                                                title={tool.label}
                                            >
                                                {tool.icon}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="flex-1 relative">
                                    {memoPreviewMode ? (
                                        <div className="w-full h-full p-8 md:p-12 overflow-y-auto no-scrollbar bg-white">
                                            <article className="max-w-3xl mx-auto">
                                                <MarkdownRenderer content={viewingItem.content || '*开始书写...*'} />
                                            </article>
                                        </div>
                                    ) : (
                                        <textarea 
                                            ref={textareaRef}
                                            className="w-full h-full p-8 md:p-12 resize-none outline-none text-lg text-slate-800 leading-relaxed bg-white placeholder:text-slate-300 font-sans"
                                            placeholder="开始书写你的想法... (支持 Markdown)"
                                            value={viewingItem.content}
                                            onChange={(e) => updateItemContent(viewingItem.id, e.target.value)}
                                        />
                                    )}
                                </div>
                                <div className="px-6 py-3 border-t border-slate-50 text-[9px] font-black text-slate-300 uppercase tracking-widest flex justify-between shrink-0 bg-white">
                                    <span>Created: {viewingItem.timestamp}</span>
                                    <span className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                        Auto-saved
                                    </span>
                                </div>
                            </div>
                        ) : detailViewMode === 'analysis' ? (
                            <div className="p-12 md:p-20 max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500 w-full">
                               <h2 className="text-3xl md:text-4xl font-black mb-10 tracking-tight leading-tight text-slate-900">{viewingItem.title}</h2>
                               
                               {viewingItem.sourceType === 'report' ? (
                                 renderReportView(viewingItem.content)
                               ) : (
                                 <article className="max-w-none">
                                    <div className="w-10 h-1.5 bg-indigo-600 rounded-full mb-10" />
                                    <MarkdownRenderer content={viewingItem.content} />
                                 </article>
                               )}
                               
                               <div className="mt-20 pt-10 border-t border-slate-50 flex flex-col gap-2">
                                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest Metadata">Metadata</span>
                                  <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400">
                                     <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2}/></svg> 采集于 {viewingItem.timestamp}</span>
                                     {viewingItem.url && <a href={viewingItem.url} target="_blank" className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeWidth={2}/></svg> 原始链接</a>}
                                  </div>
                               </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col bg-slate-100 animate-in fade-in duration-300">
                               <div className="h-12 bg-white border-b border-slate-100 flex items-center px-6 shrink-0 gap-4">
                                  <div className="flex gap-1.5">
                                     <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                     <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                     <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                  </div>
                                  <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5 mx-4">
                                     <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" /></svg>
                                     <span className="text-[10px] font-mono text-slate-400 truncate w-full">{viewingItem.url}</span>
                                  </div>
                                  <button onClick={() => window.open(viewingItem.url, '_blank')} className="text-indigo-600 text-[10px] font-black hover:underline uppercase">Open Link ↗</button>
                                </div>
                               <div className="flex-1 w-full h-full relative bg-white overflow-hidden">
                                  <iframe src={viewingItem.url} className="w-full h-full border-0" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" allowFullScreen title="Live Preview" />
                                  <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center text-slate-300">
                                     <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-200 rounded-full animate-spin mb-4" />
                                     <p className="text-[10px] font-black uppercase tracking-widest">Connecting to remote site...</p>
                                  </div>
                               </div>
                            </div>
                        )}
                     </div>
                   </div>
                </div>
            )}

            {isBrainstorming && (
                <div className="absolute inset-0 z-50 pt-4 px-0 pb-0 flex flex-col pointer-events-none"> 
                   <div className="pointer-events-auto flex-1 bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 fade-in duration-500">
                      
                      {/* Brainstorming Header */}
                      <div className="shrink-0 z-[10] px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md">
                           <button onClick={() => setIsBrainstorming(false)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-[10px] transition-all uppercase tracking-widest group">
                              <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={3}/></svg>
                              </div>
                              返回列表
                           </button>

                           <div className="flex flex-col items-center">
                               <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                  AI 头脑风暴
                               </h2>
                               <span className="text-[9px] font-bold text-slate-400 tracking-wide mt-0.5">
                                  已选中 {chatContextIds.size} 份资料
                               </span>
                           </div>

                           <div className="w-20" /> {/* Spacer */}
                      </div>

                      {/* Main Brainstorming Area with Sidebar */}
                      <div className="flex-1 flex overflow-hidden">
                         {/* Left Sidebar: Context Selection */}
                         <div className="w-72 shrink-0 border-r border-slate-100 bg-slate-50/50 flex flex-col">
                            <div className="p-5 pb-3">
                               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Context Knowledge</h3>
                               <p className="text-[10px] text-slate-400 font-medium">勾选需要 AI 参考的知识卡片</p>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 no-scrollbar">
                                {activeProject?.knowledgeBase
                                    .filter(item => !item.error)
                                    .map(item => {
                                      const isSelected = chatContextIds.has(item.id);
                                      return (
                                        <div 
                                          key={item.id} 
                                          onClick={() => {
                                             setChatContextIds(prev => {
                                                const next = new Set(prev);
                                                if (next.has(item.id)) next.delete(item.id);
                                                else next.add(item.id);
                                                return next;
                                             });
                                          }}
                                          className={`group flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-100'}`}
                                        >
                                           <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                                              {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                           </div>
                                           <div className="flex-1 min-w-0">
                                              <h4 className={`text-xs font-bold leading-snug mb-0.5 line-clamp-2 ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{item.title}</h4>
                                              <div className="flex items-center gap-1.5">
                                                 <span className={`text-[9px] font-bold uppercase tracking-wide ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>{item.productName}</span>
                                              </div>
                                           </div>
                                        </div>
                                      );
                                    })
                                }
                            </div>
                         </div>

                         {/* Right Chat Area */}
                         <div className="flex-1 flex flex-col bg-[#F8F9FB] relative">
                             <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-6 scroll-smooth">
                                 {chatHistory.length === 0 && (
                                     <div className="flex flex-col items-center justify-center h-full opacity-60">
                                         <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 text-indigo-400 shadow-sm border border-indigo-100">
                                             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                         </div>
                                         <h3 className="text-xl font-black text-slate-900 mb-2">AI 头脑风暴</h3>
                                         <p className="text-sm font-medium text-slate-500 text-center max-w-sm leading-relaxed">
                                             在左侧勾选你关注的资料，然后开始提问。
                                         </p>
                                     </div>
                                 )}
                                 {chatHistory.map((msg, i) => (
                                     <ChatMessage key={i} role={msg.role} text={msg.text} />
                                 ))}
                                 {isChatting && chatHistory[chatHistory.length-1]?.role === 'user' && (
                                     <div className="flex w-full mb-4 justify-start">
                                         <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex gap-2 items-center">
                                             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                         </div>
                                     </div>
                                 )}
                                 <div ref={chatEndRef} />
                             </div>
                             
                             <div className="shrink-0 p-6 bg-white border-t border-slate-100 z-10">
                                 <div className="relative max-w-4xl mx-auto w-full">
                                     <input
                                         value={chatInput}
                                         onChange={(e) => setChatInput(e.target.value)}
                                         onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                         placeholder="向 AI 提问..."
                                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 pr-16 text-sm font-medium focus:ring-4 ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                                     />
                                     <button
                                         onClick={handleSendMessage}
                                         disabled={!chatInput.trim() || isChatting}
                                         className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all flex items-center justify-center shadow-lg shadow-indigo-200 disabled:shadow-none"
                                     >
                                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" /></svg>
                                     </button>
                                 </div>
                             </div>
                         </div>
                      </div>
                   </div>
                </div>
            )}
            
            {state.isAnalysisModalOpen && (
              <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-8">
                   <h2 className="text-xl font-black mb-6">配置矩阵分析维度</h2>
                   <div className="space-y-4 mb-8">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">对比维度 (以逗号分隔)</label>
                        <input 
                          value={analysisConfig.dimensions} 
                          onChange={e => setAnalysisConfig(prev => ({ ...prev, dimensions: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 ring-indigo-500/5 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">特殊研判指令 (可选)</label>
                        <textarea 
                          value={analysisConfig.context} 
                          onChange={e => setAnalysisConfig(prev => ({ ...prev, context: e.target.value }))}
                          className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 ring-indigo-500/5 outline-none resize-none"
                        />
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setState(s => ({ ...s, isAnalysisModalOpen: false }))} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-sm uppercase tracking-wider transition-all">取消</button>
                      <button onClick={runMatrixAnalysis} className="flex-1 py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-slate-200 transition-all">开始深度研判</button>
                   </div>
                </div>
              </div>
            )}

            {showMemoModal && (
              <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-8">
                   <h2 className="text-xl font-black mb-6">新建笔记</h2>
                   <div className="space-y-4 mb-8">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">笔记标题</label>
                        <input 
                          value={memoFormData.title} 
                          onChange={e => setMemoFormData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 ring-indigo-500/5 outline-none"
                          placeholder="例如：关于 AI 搜索的竞品观察"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">简要描述</label>
                        <input 
                          value={memoFormData.summary} 
                          onChange={e => setMemoFormData(prev => ({ ...prev, summary: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 ring-indigo-500/5 outline-none"
                          placeholder="一句话描述这篇笔记的内容"
                        />
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setShowMemoModal(false)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-sm uppercase tracking-wider transition-all">取消</button>
                      <button onClick={createMemo} className="flex-1 py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-slate-200 transition-all">确认创建</button>
                   </div>
                </div>
              </div>
            )}

            {/* Move Item Modal */}
            {moveModalState.isOpen && (
              <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden p-8 flex flex-col animate-in zoom-in-95 duration-200">
                  <h2 className="text-xl font-black mb-6 text-slate-900">转移知识卡片</h2>
                  
                  <div className="space-y-5 mb-8">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">目标项目</label>
                      <select
                        value={moveModalState.targetProjectId}
                        onChange={(e) => setMoveModalState(s => ({ ...s, targetProjectId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {state.projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">目标分类 (页签)</label>
                      <select
                        value={moveModalState.targetTag}
                        onChange={(e) => setMoveModalState(s => ({ ...s, targetTag: e.target.value as DataSourceTag }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="竞品研究">核心竞品</option>
                        <option value="需求灵感">调研灵感 / 需求灵感</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setMoveModalState(s => ({ ...s, isOpen: false }))}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
                    >
                      取消
                    </button>
                    <button 
                      onClick={executeMoveItem}
                      className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-200 transition-all"
                    >
                      确认转移
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* General Modal: Create / Rename / Delete Project */}
            {modalState.type !== 'none' && (
              <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden p-8 flex flex-col animate-in zoom-in-95 duration-200">
                  <h2 className="text-xl font-black mb-6 text-slate-900">
                    {modalState.type === 'create' && '创建新项目'}
                    {modalState.type === 'rename' && '重命名项目'}
                    {modalState.type === 'delete' && '确认删除项目'}
                  </h2>
                  
                  {modalState.type === 'delete' ? (
                    <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                      确定要删除项目 <span className="font-black text-slate-900">“{modalState.value}”</span> 吗？此操作不可撤销，项目内的所有采集资料和研报都将被永久移除。
                    </p>
                  ) : (
                    <div className="mb-8">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">项目名称</label>
                      <input 
                        autoFocus
                        value={modalState.value}
                        onChange={e => setModalState(s => ({ ...s, value: e.target.value }))}
                        onKeyPress={e => e.key === 'Enter' && handleModalSubmit()}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        placeholder="输入项目名称..."
                      />
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setModalState({ type: 'none', value: '' })}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
                    >
                      取消
                    </button>
                    <button 
                      onClick={handleModalSubmit}
                      className={`flex-1 py-4 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-all ${modalState.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-slate-900 hover:bg-indigo-600 shadow-slate-200'}`}
                    >
                      {modalState.type === 'delete' ? '确认删除' : '确 定'}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </main>
      
      {/* Success Toast with Navigation Action */}
      {successToast && (
        <div className="fixed bottom-8 right-8 z-[1000] bg-slate-900 text-white pl-6 pr-2 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-8 duration-300 flex items-center gap-4 border border-slate-800">
           <div className="flex items-center gap-3">
               <div className="bg-emerald-500 rounded-full p-1">
                   <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
               </div>
               <span className="font-bold text-sm tracking-wide">{successToast.message}</span>
           </div>
           
           <div className="h-6 w-[1px] bg-slate-700 mx-1"></div>
           
           <button 
             onClick={() => {
                setState(s => ({
                    ...s,
                    selectedProjectId: successToast.targetProjectId,
                    knowledgeFilter: successToast.targetFilter,
                    currentTab: 'knowledge',
                    viewingItemId: null,
                    selectedBrand: null
                }));
                setSuccessToast(null);
             }}
             className="px-4 py-2 hover:bg-slate-800 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 group"
           >
             去查看
             <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
           </button>

           <button onClick={() => setSuccessToast(null)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors ml-1">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-8 right-8 z-[1000] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-8 duration-300 flex items-center gap-3">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           <span className="font-bold text-sm">{errorMessage}</span>
           <button onClick={() => setErrorMessage(null)} className="ml-4 hover:opacity-70">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      )}
    </div>
  );
};

export default App;
