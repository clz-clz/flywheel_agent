'use client';

import React, { useState } from 'react';
import { Award, Lock, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

// ==========================================
// 1. 强类型契约防御 (0 any)
// ==========================================
export type NodeStatus = 'acquired' | 'current' | 'locked';

export interface SkillNode {
  name: string;
  isMastered: boolean;
}

export interface PromotionLevel {
  id: string;
  level: string;        // 如: P5 / T3
  title: string;        // 如: 初级研发工程师
  status: NodeStatus;
  coreSkills: SkillNode[];
  salaryRange: string;
}

interface PromotionGraphCardProps {
  roleName?: string;
  levels?: PromotionLevel[];
}

// 默认占位数据（当后端真实 Neo4j 数据未返回时的高级回退态）
const DEFAULT_LEVELS: PromotionLevel[] = [
  {
    id: 'L1',
    level: 'P5 / T3',
    title: '初级研发工程师',
    status: 'acquired',
    salaryRange: '15k-25k',
    coreSkills: [
      { name: '基础框架熟练 (React/Vue/Spring)', isMastered: true },
      { name: 'Git 团队协同', isMastered: true },
      { name: 'CRUD 业务实战', isMastered: true },
    ],
  },
  {
    id: 'L2',
    level: 'P6 / T4',
    title: '高级研发工程师',
    status: 'current',
    salaryRange: '25k-45k',
    coreSkills: [
      { name: '系统设计与性能调优', isMastered: true },
      { name: '微服务架构/分布式', isMastered: false },
      { name: '复杂链路排查与压测', isMastered: false },
    ],
  },
  {
    id: 'L3',
    level: 'P7 / T5',
    title: '资深技术专家',
    status: 'locked',
    salaryRange: '50k-80k + 期权',
    coreSkills: [
      { name: '领域驱动设计 (DDD)', isMastered: false },
      { name: '高并发/高可用架构底座', isMastered: false },
      { name: '跨部门技术布道与团队演进', isMastered: false },
    ],
  },
];

// ==========================================
// 2. 组件渲染核心
// ==========================================
export function PromotionGraphCard({ 
  roleName = '大厂通用技术路径', 
  levels = DEFAULT_LEVELS 
}: PromotionGraphCardProps) {
  
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getStatusConfig = (status: NodeStatus) => {
    switch (status) {
      case 'acquired':
        return { 
          borderColor: 'border-emerald-500/50', 
          bgColor: 'bg-emerald-950/20', 
          textColor: 'text-emerald-400',
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        };
      case 'current':
        return { 
          borderColor: 'border-blue-500', 
          bgColor: 'bg-blue-900/20', 
          textColor: 'text-blue-400',
          icon: <Zap className="h-5 w-5 text-blue-500" />
        };
      case 'locked':
      default:
        return { 
          borderColor: 'border-zinc-800', 
          bgColor: 'bg-zinc-900/50', 
          textColor: 'text-zinc-500',
          icon: <Lock className="h-5 w-5 text-zinc-600" />
        };
    }
  };

  return (
    <div className="flex w-full flex-col space-y-6 rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur-md relative overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 z-10">
        <div className="flex items-center space-x-2">
          <Award className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-bold tracking-widest text-zinc-100 uppercase">
            Evolution Graph / 晋升图谱
          </h3>
        </div>
        <span className="text-xs font-mono text-zinc-500">{roleName}</span>
      </div>

      {/* 核心：节点时间线渲染 */}
      <div className="relative z-10 flex flex-col space-y-8 mt-4">
        {/* 左侧贯穿的连接线 */}
        <div className="absolute left-[1.15rem] top-2 bottom-6 w-0.5 bg-zinc-800 -z-10" />

        {levels.map((lvl) => {
          const config = getStatusConfig(lvl.status);
          const isHovered = hoveredNode === lvl.id;
          
          return (
            <div 
              key={lvl.id} 
              className="relative flex items-start space-x-4 cursor-pointer group"
              onMouseEnter={() => setHoveredNode(lvl.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* 状态锚点 */}
              <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${config.borderColor} bg-zinc-950 transition-transform duration-300 ${isHovered ? 'scale-110 shadow-lg shadow-blue-900/20' : ''}`}>
                {config.icon}
              </div>

              {/* 节点卡片 */}
              <div className={`flex-1 rounded-lg border ${config.borderColor} ${config.bgColor} p-4 transition-all duration-300 hover:border-zinc-500`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wider ${config.textColor}`}>
                      {lvl.level} <span className="text-zinc-300 ml-2">{lvl.title}</span>
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">预期薪资: {lvl.salaryRange}</p>
                  </div>
                  
                  {/* 状态徽章 */}
                  {lvl.status === 'current' && (
                    <span className="mt-2 md:mt-0 inline-flex animate-pulse items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
                      当前突破目标
                    </span>
                  )}
                </div>

                {/* 展开的技能图谱联动高亮区 */}
                <div className={`mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-hidden transition-all duration-500 ${isHovered || lvl.status === 'current' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {lvl.coreSkills.map((skill, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      {skill.isMastered ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                      )}
                      <span className={skill.isMastered ? 'text-zinc-300' : 'text-zinc-500'}>
                        {skill.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}