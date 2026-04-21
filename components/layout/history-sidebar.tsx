'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // 🚀 1. 引入路由感知钩子
import { AgentAPI, RoadmapHistoryItem, InterviewHistoryItem } from '@/lib/api/agentService';

type ActiveTab = 'roadmap' | 'interview';

export function HistorySidebar() {
  const pathname = usePathname(); // 🚀 2. 获取当前路径
  
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('roadmap');
  
  const [roadmaps, setRoadmaps] = useState<RoadmapHistoryItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true; 

    const fetchHistory = async () => {
      // 如果当前是登录页，直接拦截，不发送多余的 API 请求
      if (!isMounted || pathname === '/login') return;
      
      await Promise.resolve();
      setIsLoading(true);

      try {
        if (activeTab === 'roadmap') {
          const res = await AgentAPI.getRoadmapHistory();
          if (isMounted) setRoadmaps(res.data);
        } else {
          const res = await AgentAPI.getInterviewHistory();
          if (isMounted) setInterviews(res.data);
        }
      } catch (error) {
        console.error('获取历史记录失败', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    if (isOpen) fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [activeTab, isOpen, pathname]);

  // 🚀 3. 核心拦截：如果是登录页面，直接返回 null（彻底隐身）
  if (pathname === '/login') {
    return null;
  }

  return (
    <aside 
      className={`relative z-40 flex h-full flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-0'
      }`}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-4 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
      >
        {isOpen ? '◀' : '▶'}
      </button>

      {isOpen && (
        <div className="flex h-full w-64 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 p-4">
            <h3 className="font-semibold tracking-wide text-zinc-300">时空记忆核心</h3>
          </div>

          <div className="flex space-x-1 p-2">
            <button 
              onClick={() => setActiveTab('roadmap')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'roadmap' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              规划演进
            </button>
            <button 
              onClick={() => setActiveTab('interview')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'interview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              面试复盘
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <p className="mt-4 text-center text-xs text-zinc-500">同步数据中...</p>
            ) : activeTab === 'roadmap' ? (
              roadmaps.map((r) => (
                <div key={r.id} className="cursor-pointer rounded-lg border border-zinc-800/50 bg-zinc-900 p-3 hover:border-zinc-700">
                  <p className="text-sm font-medium text-blue-400">{r.role_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">ID: {r.id}</p>
                </div>
              ))
            ) : (
              interviews.map((i) => (
                <div key={i.id} className="cursor-pointer rounded-lg border border-zinc-800/50 bg-zinc-900 p-3 hover:border-zinc-700">
                  <p className="line-clamp-2 text-xs font-medium text-zinc-300">{i.question}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs font-bold ${i.score >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
                      评分: {i.score}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}