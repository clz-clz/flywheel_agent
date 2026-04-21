// lib/hooks/useAgentChat.ts
import { useRef } from 'react';
import { useChatStore, ResultBlock, ActionPlanPhase } from '../store/useChatStore';
import { AgentAPI, ChatApiResponse } from '../api/agentService';

const API_BASE_URL = ''; // 走 Next.js 代理

export function useAgentChat() {
  const { 
    sessionId, 
    addUserMessage, 
    addAssistantPlaceholder, 
    updateMessageStatus, 
    appendStreamChunk, 
    addResultBlock,
    userProfile // 引入当前用户画像用于回退逻辑
  } = useChatStore();

  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    addUserMessage(text);
    const msgId = addAssistantPlaceholder();

    // ==========================================
    // 🚀 核心升级：意图拦截器 (Intent Interceptor)
    // ==========================================
    const intentText = text.trim();
    
    // 🎯 拦截 1：差距分析 (Phase 4)
    if (intentText.startsWith('测试目标岗匹配度')) {
      updateMessageStatus(msgId, 'calling_tool');
      // 提取目标岗位，如果没有输入，则默认使用画像中的意向岗位，兜底为'软件工程师'
      const roleMatch = intentText.split('：')[1] || intentText.split(':')[1];
      const targetRole = roleMatch ? roleMatch.trim() : (userProfile.targetRoles?.[0] || '软件工程师');

      try {
        const gapData = await AgentAPI.analyzeGap(targetRole);
        
        // 注入文本说明
        addResultBlock(msgId, { 
          type: 'text', 
          content: `已为您完成【${targetRole}】的四维能力差距分析，并生成了对齐雷达图谱，请在右侧面板查看详情。` 
        });
        
        // 注入差距分析图谱结构块
        addResultBlock(msgId, {
          type: 'gap_analysis',
          items: gapData.gaps
        });
        
        updateMessageStatus(msgId, 'done');
      } catch (error) {
        updateMessageStatus(msgId, 'error');
        addResultBlock(msgId, { type: 'text', content: `分析失败: ${error instanceof Error ? error.message : '未知错误'}` });
      }
      return; // 阻断后续普通聊天请求
    }

    // 🗺️ 拦截 2：大厂晋升图谱 (Phase 5 学习路线)
    if (intentText.startsWith('渲染大厂晋升图谱')) {
      updateMessageStatus(msgId, 'calling_tool');
      const roleMatch = intentText.split('：')[1] || intentText.split(':')[1];
      const targetRole = roleMatch ? roleMatch.trim() : (userProfile.targetRoles?.[0] || '高级架构师');

      try {
        const roadmapData = await AgentAPI.generateLearningPath(targetRole);
        
        // 映射后端的 RoadmapPhase 到前端的 ActionPlanPhase (绝对 0 any 安全转换)
        const mappedPlan: ActionPlanPhase[] = roadmapData.roadmap.map(r => ({
          phase: r.time_period,
          objective: r.focus,
          tasks: r.action_items,
          resources: r.learning_resources
        }));

        addResultBlock(msgId, { 
          type: 'text', 
          content: `已为您生成【${targetRole}】的专属晋升行动路线，请严格按照该计划推进。` 
        });
        
        addResultBlock(msgId, {
          type: 'action_plan',
          plan: mappedPlan
        });

        updateMessageStatus(msgId, 'done');
      } catch (error) {
        updateMessageStatus(msgId, 'error');
        addResultBlock(msgId, { type: 'text', content: `规划生成失败: ${error instanceof Error ? error.message : '未知错误'}` });
      }
      return;
    }

    // ==========================================
    // 💬 默认回退：普通大模型聊天流
    // ==========================================
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
        }),
      });

      if (!response.ok) throw new Error(`系统网络异常! status: ${response.status}`);

      const data = (await response.json()) as ChatApiResponse;
      const blocks: ResultBlock[] = data.blocks || [];
      const textContent = data.reply || '';
      
      const otherBlocks = blocks.filter(b => b.type !== 'text');
      if (otherBlocks.length > 0) {
        otherBlocks.forEach(block => addResultBlock(msgId, block));
      }

      if (textContent) {
        updateMessageStatus(msgId, 'rendering_result');
        let currentIndex = 0;

        if (typewriterRef.current) clearInterval(typewriterRef.current);
        typewriterRef.current = setInterval(() => {
          if (currentIndex < textContent.length) {
            const chunkSize = Math.floor(Math.random() * 3) + 2;
            const chunk = textContent.slice(currentIndex, currentIndex + chunkSize);
            appendStreamChunk(msgId, chunk);
            currentIndex += chunkSize;
          } else {
            if (typewriterRef.current) clearInterval(typewriterRef.current);
            updateMessageStatus(msgId, 'done');
          }
        }, 30);
      } else {
        updateMessageStatus(msgId, 'done');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知神经链接故障';
      updateMessageStatus(msgId, 'error');
      addResultBlock(msgId, { type: 'text', content: `抱歉，指挥官。神经连接已断开: ${errorMessage}` });
    }
  };

  return { sendMessage };
}