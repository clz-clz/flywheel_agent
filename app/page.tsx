'use client'

import React, { useState, useRef, useEffect , useCallback} from 'react';
import { Sparkles, Plus, Mic, FileText, Crosshair, Map, Menu, UserCircle2, Send, Loader2, Database, Bot, PanelRightClose, PanelRightOpen, Download, RefreshCw } from "lucide-react";
import { useChatStore, CareerRecommendation } from '@/lib/store/useChatStore';
import { useAgentChat } from '@/lib/hooks/useAgentChat';
import dynamic from 'next/dynamic';
import { ActionPlanCard } from '@/components/cards/action-plan-card';
import { AgentAPI, GapAnalysisResponse, InterviewHistoryItem , GapItem} from '@/lib/api/agentService';
import { ResumeDiagnosisCard } from '@/components/cards/resume-diagnosis-card';
import { MockInterviewPanel } from '@/components/cards/mock-interview-panel';
// 🚀 [新增] 导入晋升图谱组件
import { PromotionGraphCard } from '@/components/cards/promotion-graph-card';
import { UIMessage, ResultBlock } from '@/lib/store/useChatStore';

const GapAnalysisCard = dynamic(
  () => import('@/components/cards/gap-analysis-card').then((mod) => mod.GapAnalysisCard),
  { 
    ssr: false,
    loading: () => <div className="p-6 text-zinc-500 animate-pulse font-mono">Loading Radar Matrix...</div> 
  }
);

interface RightDrawerProps {
  data: GapAnalysisResponse | null; 
}

interface RoadmapDetailData {
  target_role?: string;
  overall_match_score?: number;
  immediate_next_steps?: string[];
  milestones?: unknown[]; 
  gaps?: GapItem[];       
}

export function RightDrawer({ data }: RightDrawerProps) {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async () => {
    if (!data?.target_role || isExporting) return;
    
    setIsExporting(true);
    try {
      const blob = await AgentAPI.exportReport(data.target_role);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Career_Report_${data.target_role}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("报告导出失败:", err);
      alert("导出失败，请检查网络或稍后重试"); 
    } finally {
      setIsExporting(false);
    }
  };

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

      <GapAnalysisCard items={data.gaps} />

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

      <button 
        onClick={handleExport}
        disabled={isExporting}
        className={`mt-8 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
          isExporting 
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
        }`}
      >
        {isExporting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> 正在生成报告...</>
        ) : (
          <><Download className="w-4 h-4" /> 一键导出规划报告 (Markdown)</>
        )}
      </button>
    </div>
  );
}

export default function FlywheelDashboard() {
  const { messages, isAgentTyping, updateProfile, userProfile } = useChatStore();
  const { sendMessage } = useAgentChat();
  const [historyAnalysisData, setHistoryAnalysisData] = useState<GapAnalysisResponse | null>(null);
  const { addResultBlock, addAssistantPlaceholder, updateMessageStatus} = useChatStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncMsg, setLastSyncMsg] = useState<string | null>(null);

  const handleSelectRoadmap = useCallback((rawDetail: Record<string, unknown>) => {
    const detail = rawDetail as unknown as RoadmapDetailData;
    const mappedData: GapAnalysisResponse = {
      target_role: detail.target_role || "历史规划岗位",
      overall_match_score: detail.overall_match_score || 0,
      core_strengths: [], 
      immediate_next_steps: detail.immediate_next_steps || [],
      gaps: detail.milestones ? [] : (detail.gaps || []) 
    };

    setHistoryAnalysisData(mappedData);
  }, []);

  const handleSelectInterview = useCallback((item: InterviewHistoryItem) => {
    const msgId = addAssistantPlaceholder();
    updateMessageStatus(msgId, 'rendering_result');
    
    addResultBlock(msgId, {
      type: 'text',
      content: `[历史复盘] 以下是您关于“${item.question.slice(0, 15)}...”的面试表现回顾：`
    });

    addResultBlock(msgId, {
      type: 'text', 
      content: `得分：${item.score}\n考官点评：${item.evaluation}\n参考答案：${item.reference_answer}`
    });
    
    updateMessageStatus(msgId, 'done');
  }, [addAssistantPlaceholder, addResultBlock, updateMessageStatus]);

  const latestMessage = messages[messages.length - 1];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTriggerAnalysis = (text: string) => {
    if (!text.trim() || isAgentTyping) return;
    sendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTriggerAnalysis(input);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await AgentAPI.uploadResumePDF(file);
      sendMessage("我刚刚上传了最新的简历，请重新评估我的情况。");
    } catch (error) {
      console.error(error);
    }
  };

  const handleSyncMemory = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await AgentAPI.syncProfileFromChat();
      updateProfile({
        currentSkills: res.detected_updates.current_skills,
        competitiveness_score: res.new_score
      });
      setLastSyncMsg(`同步成功：新识别 ${res.detected_updates.current_skills.length} 项技能`);
      setTimeout(() => setLastSyncMsg(null), 3000);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "同步失败");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-screen bg-[#131314] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden">
      
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
          <div className="flex items-center gap-2">
            {lastSyncMsg && (
              <span className="text-[10px] text-emerald-400 font-mono animate-in fade-in slide-in-from-right-4">
                {lastSyncMsg}
              </span>
            )}
            <button 
              onClick={handleSyncMemory}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${
                isSyncing 
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-xs">同步记忆</span>
            </button>
          </div>

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

      <main className="flex-1 flex overflow-hidden w-full relative">
        {/* 左侧：聊天区域 (100% 在小屏幕, 40% 在大屏幕) */}
        <section 
          className="flex flex-col h-full lg:w-[40%] w-full border-r border-zinc-800 bg-[#131314] relative z-20"
        >
          {/* 移除 toggle 按钮 - 现在使用响应式设计 */}

          <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col items-center pt-8 md:pt-16">
            <div className="w-full flex flex-col items-center max-w-[820px] px-4">
              
              {messages.length === 0 && (
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
                              [MCP_TOOL_CALL]: 正在处理结构化数据...
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

          <div className="w-full shrink-0 px-4 pb-8 transition-all duration-700 flex flex-col max-w-[852px] mx-auto pt-8">
            
            <div className="flex gap-3 transition-all duration-700 animate-in fade-in duration-1000 order-2 mt-6 justify-center flex-wrap">
              
              <button 
                onClick={() => handleTriggerAnalysis("简历缺陷一键诊断")} 
                className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E1F22] border border-zinc-800/80 hover:bg-[#252628] text-sm text-[#C4C7C5] transition-colors"
              >
                <FileText className="w-4 h-4 text-[#4285F4]" /> 简历缺陷诊断
              </button>
              
              <button 
                onClick={() => handleTriggerAnalysis("测试目标岗匹配度")} 
                className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E1F22] border border-zinc-800/80 hover:bg-[#252628] text-sm text-[#C4C7C5] transition-colors"
              >
                <Crosshair className="w-4 h-4 text-[#EA4335]" /> 测试岗匹配度
              </button>
              
              <button 
                onClick={() => handleTriggerAnalysis("渲染大厂晋升图谱")} 
                className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E1F22] border border-zinc-800/80 hover:bg-[#252628] text-sm text-[#C4C7C5] transition-colors"
              >
                <Map className="w-4 h-4 text-[#34A853]" /> 渲染晋升图谱
              </button>

              

              <button 
                onClick={() => {
                  const target = userProfile.targetRoles?.[0] || '软件工程师';
                  sendMessage(`开启全真模拟面试：${target}`);
                }}
              >
                全真模拟面试
              </button>

              
              
            </div>

            <div className="bg-[#1E1F22] rounded-[32px] p-3 shadow-2xl border border-zinc-800/60 focus-within:bg-[#252628] focus-within:border-zinc-600 transition-all duration-300 relative w-full order-1">
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
                  <input 
                    type="file" 
                    accept=".pdf" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-zinc-700/50 rounded-full text-zinc-400 transition-colors"
                  >
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

        {/* 右侧：图谱/报告展示区 (60%) */}
        <div className="hidden lg:flex w-[60%] flex-col border-l border-zinc-800 bg-zinc-950 overflow-y-auto p-6">
          {/* 获取当前激活消息（最后一条助手的消息）的积木 */}
          {latestMessage?.role === 'assistant' && latestMessage.blocks?.map((block, idx) => {
            switch (block.type) {
              case 'career_map':
                // 🚀 核心接头：渲染晋升图谱组件
                return <PromotionGraphCard key={idx} levels={block.data?.levels || []} />;
              
              case 'mock_interview':
                // 🚀 核心接头：渲染面试面板
                return <MockInterviewPanel key={idx} role={block.role} questions={block.questions} />;
                
              case 'gap_analysis':
                return <GapAnalysisCard key={idx} items={block.items} />;
                
              case 'action_plan':
                return <ActionPlanCard key={idx} plan={block.plan} />;

              default:
                return null;
            }
          }) || (
            <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-sm">
              等待指令：请在左侧发起分析或面试请求
            </div>
          )}
        </div>

      </main>
    </div>
  );
}