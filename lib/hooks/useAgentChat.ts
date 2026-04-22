// lib/hooks/useAgentChat.ts
// lib/hooks/useAgentChat.ts
import { useRef } from 'react';
import { useChatStore, ResultBlock, ActionPlanPhase } from '../store/useChatStore';
import { AgentAPI, ChatApiResponse } from '../api/agentService';

// 🚀 核心配置：直连云端后端 API
const API_BASE_URL = 'http://47.111.21.230:8000';

export function useAgentChat() {
  const { 
    sessionId, 
    addUserMessage, 
    addAssistantPlaceholder, 
    updateMessageStatus, 
    appendStreamChunk, 
    addResultBlock,
    userProfile 
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
      const roleMatch = intentText.split('：')[1] || intentText.split(':')[1];
      const targetRole = roleMatch ? roleMatch.trim() : (userProfile?.targetRoles?.[0] || '软件工程师');

      try {
        const gapData = await AgentAPI.analyzeGap(targetRole);
        
        // 💡 修复：使用 appendStreamChunk 确保文本能渲染在左侧主聊天气泡中
        appendStreamChunk(msgId, `已为您完成【${targetRole}】的四维能力差距分析，并生成了对齐雷达图谱，请在右侧面板查看详情。`);
        
        addResultBlock(msgId, {
          type: 'gap_analysis',
          items: gapData.gaps
        });
        
        updateMessageStatus(msgId, 'done');
      } catch (error) {
        updateMessageStatus(msgId, 'error');
        appendStreamChunk(msgId, `分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
      return; 
    }

    // 🗺️ 拦截 2：大厂晋升图谱 (Phase 5 学习路线)
    if (intentText.startsWith('渲染大厂晋升图谱')) {
      updateMessageStatus(msgId, 'calling_tool');
      const roleMatch = intentText.split('：')[1] || intentText.split(':')[1];
      const targetRole = roleMatch ? roleMatch.trim() : (userProfile?.targetRoles?.[0] || '高级架构师');

      try {
        const roadmapData = await AgentAPI.generateLearningPath(targetRole);
        
        const mappedPlan: ActionPlanPhase[] = roadmapData.roadmap.map(r => ({
          phase: r.time_period,
          objective: r.focus,
          tasks: r.action_items,
          resources: r.learning_resources
        }));

        // 💡 修复：使用 appendStreamChunk 确保文本能渲染在左侧主聊天气泡中
        appendStreamChunk(msgId, `已为您生成【${targetRole}】的专属晋升行动路线，请严格按照该计划推进。`);
        
        addResultBlock(msgId, {
          type: 'action_plan',
          plan: mappedPlan
        });

        updateMessageStatus(msgId, 'done');
      } catch (error) {
        updateMessageStatus(msgId, 'error');
        appendStreamChunk(msgId, `规划生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
      return;
    }

    // 在 sendMessage 函数内，其他拦截器下方加入：

// 🎤 拦截 3：全真模拟面试 (Phase 6)
if (intentText.startsWith('开启全真模拟面试')) {
  updateMessageStatus(msgId, 'calling_tool');
  const roleMatch = intentText.split('：')[1] || intentText.split(':')[1];
  const targetRole = roleMatch ? roleMatch.trim() : (userProfile?.targetRoles?.[0] || '软件工程师');

  try {
    const interviewData = await AgentAPI.getGeneralQuestions(targetRole);
    appendStreamChunk(msgId, `已为您开启【${targetRole}】的全真模拟面试模式。请在右侧控制面板查看题目并开始答题。`);
    
    addResultBlock(msgId, {
      type: 'mock_interview',
      role: interviewData.role,
      questions: interviewData.questions
    });
    updateMessageStatus(msgId, 'done');
  } catch (error) {
    updateMessageStatus(msgId, 'error');
    appendStreamChunk(msgId, `启动失败: ${error instanceof Error ? error.message : '未知异常'}`);
  }
  return; // 阻断普通聊天请求
}

    // ==========================================
    // 💬 默认回退：普通大模型聊天流 (支持后端动态图谱)
    // ==========================================
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      const response = await fetch(`${API_BASE_URL}/api/agent/chat`, {
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
      
      // 提取纯文本与数据块
      const blocks: ResultBlock[] = data.blocks || [];
      const textContent = data.reply || '';
      console.log("📦 收到后端 Blocks:", blocks);
      // 处理非文本类 Block（如图谱 career_map）
      const otherBlocks = blocks.filter(b => b.type !== 'text');
      if (otherBlocks.length > 0) {
        otherBlocks.forEach(block => {
          addResultBlock(msgId, block);
          // 如果你的 UI 架构需要手动激活某个 block 才能在右侧显示，请在此处调用 setActiveBlock
          // useChatStore.getState().setActiveBlock(block); 
        });
      }

      // 执行纯文本部分的流式打字机动画
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
      appendStreamChunk(msgId, `抱歉，指挥官。神经连接已断开: ${errorMessage}`);
    }
  };

  return { sendMessage };
}