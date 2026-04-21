'use client';

import React, { useState } from 'react';
import { AgentAPI, ProfileIntakeResponse } from '@/lib/api/agentService';
// 确保您安装了 lucide-react： npm install lucide-react
import { AlertTriangle, CheckCircle2, Zap, BrainCircuit, Loader2 } from 'lucide-react';

export function ResumeDiagnosisCard() {
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ProfileIntakeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnosis = async () => {
    if (!resumeText.trim()) {
      setError('指挥官，请先输入简历内容或经历描述。');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // 触发底层 API 提取与缺陷诊断
      const res = await AgentAPI.extractProfile(resumeText);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('简历解析引擎发生未知错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      {/* 左侧：数据输入舱 */}
      <div className="flex flex-1 flex-col space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
          <BrainCircuit className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold tracking-widest text-zinc-100 uppercase text-sm">
            Resume Engine / 档案解析输入
          </h3>
        </div>
        
        <textarea
          className="min-h-[200px] w-full flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300 placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 custom-scrollbar"
          placeholder="请粘贴您的简历纯文本，或用自然语言描述您的专业、技能、证书及项目经历..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
        
        {error && <p className="text-xs text-red-400 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> {error}</p>}
        
        <button
          onClick={handleDiagnosis}
          disabled={isAnalyzing}
          className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {isAnalyzing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 引擎全功率解析中...</>
          ) : (
            <><Zap className="mr-2 h-4 w-4" /> 一键缺陷诊断</>
          )}
        </button>
      </div>

      {/* 右侧：诊断结果画板 */}
      <div className="flex flex-1 flex-col space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold tracking-widest text-zinc-100 uppercase text-sm">
            Diagnosis / 诊断报告
          </h3>
        </div>

        {!result ? (
          <div className="flex h-full items-center justify-center text-zinc-600 text-xs tracking-widest">
            等待数据注入...
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 综合评分条 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">综合竞争力定级</span>
                <span className={`font-mono text-lg font-bold ${
                  (result.profile.competitiveness_score ?? 0) >= 80 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {result.profile.competitiveness_score ?? 0} / 100
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    (result.profile.competitiveness_score ?? 0) >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${result.profile.competitiveness_score ?? 0}%` }}
                />
              </div>
            </div>

            {/* 核心亮点提取 */}
            <div className="space-y-2">
              <h4 className="text-xs text-zinc-500 uppercase">已锁定资产</h4>
              <div className="flex flex-wrap gap-2">
                {result.profile.current_skills?.map((skill, idx) => (
                  <span key={idx} className="rounded border border-blue-900 bg-blue-950/50 px-2 py-1 text-xs text-blue-300">
                    {skill}
                  </span>
                ))}
                {result.profile.education_level && (
                  <span className="rounded border border-purple-900 bg-purple-950/50 px-2 py-1 text-xs text-purple-300">
                    🎓 {result.profile.education_level}
                  </span>
                )}
              </div>
            </div>

            {/* 🚨 缺陷与漏洞高亮 */}
            <div className="space-y-2 rounded-lg border border-red-900/30 bg-red-950/10 p-3">
              <h4 className="flex items-center text-xs font-bold text-red-400">
                <AlertTriangle className="mr-1 h-3 w-3" /> 关键缺陷预警
              </h4>
              <ul className="mt-2 space-y-1">
                {result.missing_fields.length > 0 ? (
                  result.missing_fields.map((field, idx) => (
                    <li key={idx} className="text-xs text-zinc-400 flex items-start">
                      <span className="text-red-500 mr-2">-</span> {field}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-emerald-400">画像完整，未检测到重大结构性缺陷。</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}