import React from 'react';
import { Target, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { GapAnalysisItem } from '@/lib/store/useChatStore';

export function GapAnalysisCard({ items }: { items: GapAnalysisItem[] }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'acquired': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'missing': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'learning': return <Clock className="w-5 h-5 text-blue-400" />;
      default: return null;
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high': return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs">高优补齐</span>;
      case 'medium': return <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs">建议掌握</span>;
      case 'low': return <span className="px-2 py-1 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded text-xs">加分项</span>;
      default: return null;
    }
  };

  return (
    <div className="w-full bg-[#161718] rounded-3xl border border-zinc-800/60 p-8 mb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Target className="w-6 h-6 text-blue-400" />
        <h4 className="text-xl font-bold text-zinc-100">岗位能力雷达比对</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-[#1E1F22] rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-3">
              {getStatusIcon(item.status)}
              <span className="font-medium text-zinc-200">{item.skill}</span>
            </div>
            {getImportanceBadge(item.importance)}
          </div>
        ))}
      </div>
    </div>
  );
}