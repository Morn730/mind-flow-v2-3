
import React from 'react';
import { Project } from './types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'tutorial-001',
    name: '新手引导：玩转 Mind Flow',
    updatedAt: Date.now(),
    knowledgeBase: [
      { 
        id: 't1', 
        title: '🚀 如何开启 Mind Flow 采集？', 
        productName: '新手课堂',
        tag: '系统向导', 
        sourceType: 'manual', 
        content: `### 1. 核心理念：从 URL 到深度洞察
Mind Flow 不仅仅是一个书签工具，它是你的 **AI 产品参谋**。你只需要投喂一个链接，它就能帮你拆解产品的灵魂。

### 2. 操作演示
* **步骤一**：复制任意网页链接（推荐产品落地页、竞品博客或深度文章）。
* **步骤二**：粘贴到顶部的输入框中，按回车或点击右侧图标。
* **步骤三**：等待 5-10 秒，AI 引擎会自动去除广告杂质，提取核心价值、用户画像和功能亮点。

### 3. 进阶技巧
> 💡 即使是英文网页，Mind Flow 也会自动翻译并提炼成中文研报，帮助你快速跨越语言障碍，获取全球视野。`, 
        summary: '通过 AI 极速获取网页核心深度研判。',
        timestamp: '2025-01-01' 
      },
      { 
        id: 't2', 
        title: '📊 对比矩阵：流动的情报', 
        productName: '新手课堂',
        tag: '系统向导', 
        sourceType: 'manual', 
        content: `### 1. 告别 Excel 手动拉表
做竞品分析最痛苦的莫过于手动整理数十个维度的表格。Mind Flow 的 **矩阵引擎** 专为解决此痛点设计。

### 2. 如何生成矩阵？
* **积累素材**：确保你的项目中至少有 2 个标记为“竞品研究”的卡片。
* **发起对比**：点击顶部栏右侧的 **“生成矩阵”** 按钮。
* **配置维度**：在弹出的窗口中，你可以选择参与对比的品牌。AI 会默认提供“核心定位”、“商业模式”等维度，你也可以输入自定义维度（例如“会员体系”、“API开放程度”）。

### 3. 产出物
你将得到一份结构化的战略对比报告，包含：
* **核心维度横评表**：一目了然的差异对比。
* **SWOT 策略建议**：AI 基于数据给出的行动建议（蓝海机会、潜在风险）。`, 
        summary: '告别手动拉表，让 AI 帮你完成竞品横向拆解。',
        timestamp: '2025-01-01' 
      },
      { 
        id: 't4', 
        title: '🏷️ 灵感流转：科学分类信息', 
        productName: '新手课堂',
        tag: '系统向导', 
        sourceType: 'manual', 
        content: `### 1. 知识的资产化
采集只是第一步，**流动** 才是知识的价值所在。Mind Flow 提供了一套符合 PM 心智的分类体系。

### 2. 标签体系
* **🏷️ 竞品研究**：用于严肃的竞品分析，会被纳入“矩阵引擎”的计算范围。
* **💡 需求灵感**：优秀的交互设计、文案话术或 Feature，用于头脑风暴。
* **💬 用户反馈**：采集到的用户声音或评论，用于挖掘痛点。

### 3. AI 头脑风暴
当你积累了足够的卡片后，点击 **“AI 头脑风暴”**。
你可以像对话一样询问你的知识库：
> “这些竞品在 Onboarding 环节有什么共同点？”
> “帮我基于这些素材写一个 PRD 的功能描述。”`, 
        summary: '构建你个人的产品知识图谱。',
        timestamp: '2025-01-01' 
      },
    ]
  }
];

export const DEFAULT_DIMENSIONS = ["核心定位", "目标用户群", "交互创新点", "商业变现策略", "潜在破局机会"];

export const ICONS = {
  Plus: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>,
  Url: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  Delete: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2.5}/></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth={2.5}/></svg>,
  Move: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
};
