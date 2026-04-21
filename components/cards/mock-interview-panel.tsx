'use client';

import React, { useState, useRef } from 'react';
import { Play, Square, Send, ChevronRight, Award, AlertCircle, Mic, Loader2 } from 'lucide-react';
import { AgentAPI, MockEvaluation } from '@/lib/api/agentService';
import { GeneralQuestionItem } from '@/lib/store/useChatStore';
import { useSTT } from '@/lib/hooks/useSTT';

interface MockInterviewPanelProps {
  role: string;
  questions: GeneralQuestionItem[];
}

export function MockInterviewPanel({ role, questions }: MockInterviewPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = useState<Record<number, MockEvaluation>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ.id] || '';
  const currentEval = evaluations[currentQ.id];
  // 🔴 接入语音引擎状态
  const { isRecording, isTranscribing, startRecording, stopRecording } = useSTT();

  // 🔴 处理麦克风点击事件
  const handleMicToggle = async () => {
    if (isRecording) {
      try {
        const transcribedText = await stopRecording();
        // 将转录的文字智能追加到当前答案末尾
        setAnswers(prev => {
          const currentText = prev[currentQ.id] || '';
          const newText = currentText ? `${currentText} ${transcribedText}` : transcribedText;
          return { ...prev, [currentQ.id]: newText };
        });
      } catch (error) {
        console.error("语音转录失败", error);
        alert(error instanceof Error ? error.message : "语音识别失败，请重试");
      }
    } else {
      await startRecording();
    }
  };

  // 播放/停止 TTS 语音
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 提交答案给 Agent 评估
  const handleSubmit = async () => {
    if (!currentAnswer.trim() || isEvaluating) return;
    setIsEvaluating(true);
    try {
      const result = await AgentAPI.evaluateInterviewAnswer({
        target_role: role,
        question: currentQ.question,
        user_answer: currentAnswer,
        focus_area: currentQ.topic
      });
      setEvaluations(prev => ({ ...prev, [currentQ.id]: result }));
    } catch (error) {
      console.error("面评生成失败", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full bg-[#161718] rounded-3xl border border-zinc-800/60 p-6 my-4 shadow-xl">
      {/* 头部信息与进度条 */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h4 className="text-lg font-bold text-zinc-100 tracking-wide">全真模拟面试</h4>
          <p className="text-xs text-zinc-500 mt-1">Target Role: <span className="text-blue-400">{role}</span></p>
        </div>
        <div className="text-sm font-mono text-zinc-500">
          Question {currentIndex + 1} / {questions.length}
        </div>
      </div>

      <div className="bg-[#1E1F22] rounded-2xl border border-zinc-700/50 p-5 mb-4 relative">
        {/* 音频标签 (隐藏原生控制栏) */}
        {currentQ.audio_url && (
          <audio 
            ref={audioRef} 
            src={currentQ.audio_url} 
            onEnded={() => setIsPlaying(false)} 
            className="hidden" 
          />
        )}
        
        {/* 题目展示区 */}
        <div className="flex items-start gap-4">
          {currentQ.audio_url && (
            <button 
              onClick={toggleAudio}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-blue-400 hover:bg-zinc-700'}`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
            </button>
          )}
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-400 mb-2 border border-blue-500/20">
              {currentQ.topic}
            </span>
            <p className="text-zinc-200 text-sm leading-relaxed">{currentQ.question}</p>
          </div>
        </div>
      </div>

      {/* 答题与解析区 */}
      {!currentEval ? (
        <div className="space-y-3">
          
          {/* 🔴 升级版输入区：带绝对定位的悬浮麦克风 */}
          <div className="relative">
            <textarea
              value={currentAnswer}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
              placeholder={isRecording ? "正在倾听你的回答..." : "请在此输入，或点击右下角麦克风直接语音答题..."}
              disabled={isTranscribing} // 转录时锁定输入
              className={`w-full h-36 bg-[#1A1B1E] border rounded-xl p-4 pr-14 text-sm text-zinc-300 resize-none outline-none transition-colors ${
                isRecording ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-zinc-800 focus:border-blue-500/50'
              }`}
            />
            
            {/* 麦克风控制按钮 */}
            <button 
              onClick={handleMicToggle}
              disabled={isTranscribing}
              title="点击按住说话/结束说话"
              className={`absolute bottom-4 right-4 p-2.5 rounded-full transition-all flex items-center justify-center ${
                isRecording 
                  ? 'bg-red-500/20 text-red-500 animate-pulse hover:bg-red-500/30' 
                  : isTranscribing 
                    ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={!currentAnswer.trim() || isEvaluating || isRecording || isTranscribing}
            className={`w-full flex justify-center items-center gap-2 py-3 rounded-xl font-medium transition-all ${
              !currentAnswer.trim() || isRecording || isTranscribing
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
            }`}
          >
            {isEvaluating ? <span className="animate-pulse">考官正在生成点评...</span> : <><Send className="w-4 h-4" /> 提交回答</>}
          </button>
        </div>
      ) : (
        /* 面评展示面板 */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
          <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${currentEval.score >= 80 ? 'border-emerald-500 text-emerald-400' : currentEval.score >= 60 ? 'border-amber-500 text-amber-400' : 'border-red-500 text-red-400'}`}>
              <span className="text-xl font-black">{currentEval.score}</span>
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><Award className="w-4 h-4 text-blue-400" /> 考官点评</h5>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{currentEval.evaluation}</p>
            </div>
          </div>
          
          <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl">
             <h5 className="text-xs font-semibold text-amber-400 flex items-center gap-2 mb-2"><AlertCircle className="w-3.5 h-3.5" /> 改进建议</h5>
             <p className="text-xs text-zinc-300">{currentEval.improvement_suggestion}</p>
          </div>

          <div className="flex justify-end">
            {currentIndex < questions.length - 1 && (
              <button 
                onClick={() => { setCurrentIndex(prev => prev + 1); setIsPlaying(false); }}
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                下一题 <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}