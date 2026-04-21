import { useRef } from 'react';
import { useChatStore, ResultBlock } from '../store/useChatStore';
import { ChatApiResponse } from '../api/agentService';

// 🚀 修复 1：剥离硬编码 IP，让请求直接走我们 next.config.ts 里配置的 Proxy 代理！
// 这样前端发起请求就是 /api/chat，完全同源，彻底消灭跨域报错。
const API_BASE_URL = ''; 

export function useAgentChat() {
  const { 
    sessionId, 
    addUserMessage, 
    addAssistantPlaceholder, 
    updateMessageStatus, 
    appendStreamChunk, 
    addResultBlock 
  } = useChatStore();

  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    addUserMessage(text);
    const msgId = addAssistantPlaceholder();

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

      // 🔍 核心修复：强制类型转换为确定的响应结构
      const data = (await response.json()) as ChatApiResponse;
      
      const blocks: ResultBlock[] = data.blocks || [];
      
      // 如果后端没直接返回文本积木，我们将 reply 内容手动包装进积木流
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
      // 错误处理也需要类型安全
      const errorMessage = error instanceof Error ? error.message : '未知神经链接故障';
      updateMessageStatus(msgId, 'error');
      addResultBlock(msgId, { 
        type: 'text', 
        content: `抱歉，指挥官。神经连接已断开: ${errorMessage}` 
      });
    }
  };

  return { sendMessage };
}