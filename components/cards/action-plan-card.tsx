import React from 'react';
import { Flag, BookOpen, ChevronRight } from 'lucide-react';
import { ActionPlanPhase } from '@/lib/store/useChatStore';

export function ActionPlanCard({ plan }: { plan: ActionPlanPhase[] }) {
  return (
    <div className="w-full bg-[#161718] rounded-3xl border border-zinc-800/60 p-8">
      <div className="flex items-center gap-3 mb-8">
        <Flag className="w-6 h-6 text-emerald-400" />
        <h4 className="text-xl font-bold text-zinc-100">阶段性突围计划</h4>
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:bg-zinc-800">
        {plan.map((phase, idx) => (
          <div key={idx} className="relative pl-8 group">
            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-zinc-800 border-2 border-[#161718] group-hover:bg-emerald-400 group-hover:shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all z-10" />
            
            <div className="bg-[#1E1F22] p-5 rounded-2xl border border-zinc-800/80">
              <div className="flex justify-between items-center mb-3">
                <span className="text-emerald-400 text-sm font-mono font-bold">{phase.phase}</span>
                <span className="text-zinc-300 font-medium">{phase.objective}</span>
              </div>
              
              <ul className="space-y-2 mb-4">
                {phase.tasks.map((task, tIdx) => (
                  <li key={tIdx} className="text-sm text-zinc-400 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 shrink-0 text-zinc-600 mt-0.5" />
                    {task}
                  </li>
                ))}
              </ul>

              {phase.resources && phase.resources.length > 0 && (
                <div className="pt-3 border-t border-zinc-800/50 flex items-center gap-2 flex-wrap">
                  <BookOpen className="w-4 h-4 text-zinc-500" />
                  {phase.resources.map((res, rIdx) => (
                    <span key={rIdx} className="text-xs px-2 py-1 bg-zinc-800/50 text-zinc-400 rounded border border-zinc-700/50">
                      {res}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}