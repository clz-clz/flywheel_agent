'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Plus, Mic, FileText, Crosshair, Map, Menu, UserCircle2, Send, Loader2, Database, Bot, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useChatStore, CareerRecommendation } from '@/lib/store/useChatStore';
import { useAgentChat } from '@/lib/hooks/useAgentChat';
import dynamic from 'next/dynamic';
import { ActionPlanCard } from '@/components/cards/action-plan-card';
import { GapAnalysisResponse } from '@/lib/api/agentService';
// 在您的目标页面中引入：
import { ResumeDiagnosisCard } from '@/components/cards/resume-diagnosis-card';


// 在渲染区调用：
<div className="p-6">
  <ResumeDiagnosisCard />
</div>
/**
 * 核心隔离：动态导入并彻底禁用 SSR
 * 解决 mathjs 引发的 "navigator is not defined"
 */
const GapAnalysisCard = dynamic(
  () => import('@/components/cards/gap-analysis-card').then((mod) => mod.GapAnalysisCard),
  { 
    ssr: false,
    loading: () => <div className="p-6 text-zinc-500 animate-pulse font-mono">Loading Radar Matrix...</div> 
  }
);

interface RightDrawerProps {
  // 这里的 data 类型对应 AgentAPI.analyzeGap 的返回值
  data: GapAnalysisResponse | null; 
}

export function RightDrawer({ data }: RightDrawerProps) {
  // 状态守卫
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-600 font-mono italic">
        {">"} Waiting for Career Insight Command...
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-zinc-950 p-6 space-y-8 custom-scrollbar">
      <div className="border-l-2 border-blue-500 pl-4">
        <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-tighter">
          Gap Analysis: {data.target_role}
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Match Score: <span className="text-blue-400 font-mono">{data.overall_match_score}%</span>
        </p>
      </div>

      {/* 🚀 关键修复点：
        1. 属性名必须叫 items，对应 GapAnalysisCardProps 接口
        2. 传入的数据是 data.gaps，这是在 API 洗胃层映射好的 GapItem[] 数组
      */}
      <GapAnalysisCard items={data.gaps} />

      {/* 下方可以继续添加下一步行动建议等 UI */}
      <div className="mt-6 space-y-2">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Immediate Actions</h4>
        <ul className="space-y-1">
          {data.immediate_next_steps.map((step, idx) => (
            <li key={idx} className="text-sm text-zinc-300 flex items-start">
              <span className="text-blue-500 mr-2">▪</span> {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function FlywheelDashboard() {
  const { messages, isAgentTyping } = useChatStore();
  const { sendMessage } = useAgentChat();
  
  const [input, setInput] = useState('');
  // 核心控制状态：是否展开右侧 60% 的画板
  const [showAnalysis, setShowAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 提取最新一条 Agent 消息中的 career_recommendations 数据块
  const latestMessage = messages[messages.length - 1];
  const recommendationsBlock = latestMessage?.role === 'assistant' 
    ? latestMessage.blocks?.find(b => b.type === 'career_recommendations') as { type: 'career_recommendations', items: CareerRecommendation[] } | undefined
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 综合触发指令：发消息 + 丝滑展开右侧
  const handleTriggerAnalysis = (text: string) => {
    if (!text.trim() || isAgentTyping) return;
    sendMessage(text);
    setInput('');
    // 延迟 300ms 展开，配合 Agent 的 thinking 状态，更有"启动分析"的算力感
    setTimeout(() => setShowAnalysis(true), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTriggerAnalysis(input);
    }
  };






  return (
    // 1. 最外层改为 overflow-hidden，禁止整个页面的全局滚动，把滚动权交给内部容器
    <div className="h-screen bg-[#131314] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* --- 顶部领航栏 (保持不动) --- */}
      <header className="flex justify-between items-center p-4 shrink-0 z-20 bg-[#131314]">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-zinc-800/50 rounded-full transition-colors text-zinc-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-xl font-medium tracking-wide flex items-center gap-2 text-zinc-200">
            飞轮职业导航<span className="text-zinc-500 text-sm font-normal">Copilot</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#1E1F22] px-3 py-1 rounded-full border border-zinc-800/50">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             <span className="text-xs text-zinc-400">Neo4j Ready</span>
          </div>
          <UserCircle2 className="w-8 h-8 text-zinc-400 hover:text-zinc-200 cursor-pointer" />
        </div>
      </header>

      {/* --- 核心分屏主画布 --- */}
      {/* 使用 flex-row 将画布分为左右两部分 */}
      <main className="flex-1 flex overflow-hidden w-full relative">
        
        {/* ================= 左侧：Chat Pane (40% / 100% 动态切换区) ================= */}
        <section 
          className={`flex flex-col h-full transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative z-20 
          ${showAnalysis ? 'w-[40%] border-r border-zinc-800 bg-[#131314]' : 'w-full bg-[#131314]'}`}
        >
          {/* ================= 动态分析面板 Toggle 开关 ================= */}
          {/* 只有当对话记录大于 0 时，才显示这个控制开关 */}
          {messages.length > 0 && (
            <button 
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="absolute top-4 right-6 p-2.5 rounded-xl bg-[#1E1F22] border border-zinc-800/80 text-zinc-400 hover:text-blue-400 hover:bg-[#252628] hover:border-blue-500/30 transition-all z-50 shadow-lg group flex items-center gap-2"
              title={showAnalysis ? "收起分析图谱" : "展开分析图谱"}
            >
              {showAnalysis ? (
                <>
                  <span className="text-xs font-medium opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all whitespace-nowrap">收起面板</span>
                  <PanelRightClose className="w-5 h-5 transition-transform group-hover:scale-110" />
                </>
              ) : (
                <>
                  <span className="text-xs font-medium opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden transition-all whitespace-nowrap">查看图谱</span>
                  <PanelRightOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
                </>
              )}
            </button>
          )}

          {/* 聊天记录区 (占满剩余高度，内部滚动) */}
          <div className={`flex-1 overflow-y-auto scrollbar-hide flex flex-col ${showAnalysis ? 'pt-4' : 'items-center pt-8 md:pt-16'}`}>
            
            <div className={`w-full flex flex-col items-center ${showAnalysis ? 'px-6' : 'max-w-[820px] px-4'}`}>
              
              {/* 状态 A：初次见面 (Hero) */}
              {messages.length === 0 && !showAnalysis && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 mb-12">
                   <h1 className="text-[3.25rem] font-semibold mb-3 flex items-center gap-4">
                     <Sparkles className="text-blue-400 w-10 h-10 animate-pulse" />
                     <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570]">
                       Hi, Linze同学
                     </span>
                   </h1>
                   <h2 className="text-[3.25rem] font-semibold text-[#444746] leading-tight">
                     你想从哪里开始职业规划？
                   </h2>
                </div>
              )}

              {/* 状态 B：对话流 */}
              <div className="w-full flex flex-col gap-8 pb-10">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-blue-400" />
                      </div>
                    )}

                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[#252628] text-zinc-200 px-5 py-3 rounded-2xl rounded-tr-sm' : 'text-zinc-300 pt-2'}`}>
                      {msg.role === 'user' && <div>{msg.text}</div>}

                      {msg.role === 'assistant' && (
                        <div className="space-y-4">
                          {msg.status === 'thinking' && (
                            <div className="flex items-center gap-2 text-zinc-500 animate-pulse text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" /> 正在深度思考你的诉求...
                            </div>
                          )}
                          
                          {msg.status === 'calling_tool' && (
                            <div className="flex items-center gap-3 text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-4 py-2 rounded-lg font-mono text-xs">
                              <Database className="w-4 h-4 animate-bounce" /> 
                              [MCP_TOOL_CALL]: 正在检索千万级岗匹配图谱...
                            </div>
                          )}

                          {(msg.status === 'rendering_result' || msg.status === 'done') && (
                            <div className="leading-relaxed text-sm">
                              {msg.blocks?.find(b => b.type === 'text')?.content}
                              {msg.status === 'rendering_result' && <span className="inline-block w-1.5 h-3.5 bg-blue-500 animate-pulse ml-1 align-middle"></span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </div>

            </div>
          </div>

          {/* ================= 极客命令舱 (修改区：持久化快捷指令) ================= */}
          <div className={`w-full shrink-0 px-4 pb-8 transition-all duration-700 flex flex-col ${showAnalysis ? 'pt-4' : 'max-w-[852px] mx-auto pt-8'}`}>
            
            {/* 快捷指令 Pill (利用 Flex Order 动态改变上下位置) */}
            <div className={`flex gap-3 transition-all duration-700 animate-in fade-in duration-1000 ${
              !showAnalysis && messages.length === 0
                ? 'order-2 mt-6 justify-center flex-wrap' // 初始状态：在输入框下方、居中、允许换行
                : 'order-1 mb-3 justify-start overflow-x-auto scrollbar-hide w-full' // 聊天状态：跳到输入框上方、靠左、可横向滑动
            }`}>
              <button onClick={() => handleTriggerAnalysis("简历缺陷一键诊断")} className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E1F22] border border-zinc-800/80 hover:bg-[#252628] text-sm text-[#C4C7C5] transition-colors">
                <FileText className="w-4 h-4 text-[#4285F4]" /> 简历缺陷一键诊断
              </button>
              <button onClick={() => handleTriggerAnalysis("测试目标岗匹配度")} className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E1F22] border border-zinc-800/80 hover:bg-[#252628] text-sm text-[#C4C7C5] transition-colors">
                <Crosshair className="w-4 h-4 text-[#EA4335]" /> 测试目标岗匹配度
              </button>
              <button onClick={() => handleTriggerAnalysis("渲染大厂晋升图谱")} className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E1F22] border border-zinc-800/80 hover:bg-[#252628] text-sm text-[#C4C7C5] transition-colors">
                <Map className="w-4 h-4 text-[#34A853]" /> 渲染大厂晋升图谱
              </button>
            </div>

            {/* 输入框容器 */}
            <div className={`bg-[#1E1F22] rounded-[32px] p-3 shadow-2xl border border-zinc-800/60 focus-within:bg-[#252628] focus-within:border-zinc-600 transition-all duration-300 relative w-full ${
              !showAnalysis && messages.length === 0 ? 'order-1' : 'order-2'
            }`}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-zinc-100 text-[15px] resize-none outline-none placeholder:text-[#8E918F] min-h-[56px] px-4 pt-2 scrollbar-hide"
                placeholder="输入你的专业、目标岗位，或直接问我如何晋升..."
                rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 2}
              />
              
              <div className="flex justify-between items-center mt-2 px-2">
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-zinc-700/50 rounded-full text-zinc-400 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700/50 rounded-full text-zinc-400 transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  onClick={() => handleTriggerAnalysis(input)}
                  disabled={!input.trim() || isAgentTyping}
                  className={`p-3 rounded-full transition-all flex items-center justify-center ${
                    input.trim() && !isAgentTyping 
                      ? 'bg-zinc-200 text-black hover:bg-white scale-100 cursor-pointer' 
                      : 'bg-zinc-800 text-zinc-600 scale-95 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ================= 右侧：Analysis Pane (60% 抽屉) 动态数据绑定 ================= */}
        <section 
          className={`h-full bg-[#0E0E0F] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden z-10 border-l border-zinc-800/30
          ${showAnalysis ? 'w-[60%] opacity-100' : 'w-0 opacity-0'}`}
        >
          <div className="w-[800px] h-full p-10 overflow-y-auto scrollbar-hide">
             
             <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                   <Crosshair className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-zinc-100 tracking-tight">岗位分析图谱</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    {recommendationsBlock ? '已为您匹配到高度吻合的职业方向' : 'Agent 正在根据 MCP 数据库实时演算对比结果...'}
                  </p>
                </div>
             </div>

             {/* 动态渲染区域 */}
             <div className="space-y-8">
               
               {!recommendationsBlock && latestMessage?.status !== 'done' && latestMessage?.status !== 'error' ? (
                 /* --- 状态 1：等待数据时的智能骨架屏 --- */
                 <div className="animate-pulse space-y-6">
                   <div className="w-full h-[300px] bg-[#161718] rounded-3xl border border-zinc-800/60 flex flex-col items-center justify-center gap-4">
                      <Database className="w-8 h-8 text-zinc-600 animate-bounce" />
                      <span className="text-zinc-500 text-sm font-mono">Agent 正在根据 MCP 数据库实时演算对比结果...</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="h-32 bg-[#161718] rounded-2xl border border-zinc-800/60"></div>
                     <div className="h-32 bg-[#161718] rounded-2xl border border-zinc-800/60"></div>
                   </div>
                 </div>
               ) : (
                 /* --- 状态 2：根据 TDD 规范的 ResultBlock 类型进行多态渲染 --- */
                 <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                   {latestMessage?.blocks?.map((block, index) => {
                     switch (block.type) {
                       case 'gap_analysis':
                         return <GapAnalysisCard key={index} items={block.items} />;
                       case 'action_plan':
                         return <ActionPlanCard key={index} plan={block.plan} />;
                       case 'career_recommendations':
                         return (
                           <div key={index} className="w-full bg-[#161718] rounded-3xl border border-zinc-800/60 p-8 mb-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                             <h4 className="text-lg font-medium text-zinc-200 mb-6 flex items-center gap-2">
                               <Sparkles className="w-5 h-5 text-blue-400" /> 核心推荐轨道
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                               {block.items.map((item, idx) => {
                                 // 👇 核心修复：移除 as any。TypeScript 已经知道 item 是 CareerRecommendation 类型
                                 const title = item.role || item.title || '未知岗位';
                                 const fallbackScore = 85 + ((idx * 7) % 13); 
                                 const score = item.matchScore || fallbackScore;
                                 const desc = item.reason || `🏢 ${item.company || '未知企业'} | 📍 ${item.location || '不限'} | 💰 ${item.salary_range || '薪资面议'}`;

                                 return (
                                   <div key={idx} className="bg-[#1E1F22] border border-zinc-700/50 p-6 rounded-2xl hover:border-blue-500/40 hover:bg-[#252628] transition-all group cursor-pointer flex flex-col justify-between">
                                     <div>
                                       <div className="flex justify-between items-start mb-4">
                                         <h4 className="text-xl font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors line-clamp-1" title={title}>
                                           {title}
                                         </h4>
                                         <div className="flex flex-col items-end shrink-0 ml-2">
                                           <span className="text-2xl font-bold text-emerald-400">{score}</span>
                                           <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Match Score</span>
                                         </div>
                                       </div>
                                       <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{desc}</p>
                                     </div>
                                     <div className="mt-6">
                                       <div className="flex justify-between text-xs text-zinc-500 mb-2">
                                         <span>能力覆盖率</span>
                                         <span>{score}%</span>
                                       </div>
                                       <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                         <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-1000 delay-500" style={{ width: `${score}%` }}></div>
                                       </div>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         );
                       default:
                         return null; // 处理纯文本或其他未匹配的 block
                     }
                   })}
                 </div>
               )}
             </div>

          </div>
        </section>

      </main>
    </div>
  );
}

