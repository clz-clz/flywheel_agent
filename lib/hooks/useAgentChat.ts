import { useRef } from 'react';
import { useChatStore, ResultBlock } from '../store/useChatStore';

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
      // 🚀 修复 2：从浏览器的保险箱中提取您登录时存放的 Token
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      // 📍 发送请求
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 🚀 修复 3：携带身份证明，确保持久化记忆不被拦截
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`系统网络异常! status: ${response.status}`);
      }

      const data = await response.json();
      
      const blocks: ResultBlock[] = data.blocks || [];
      const textBlock = blocks.find(b => b.type === 'text') as { type: 'text', content: string } | undefined;
      const otherBlocks = blocks.filter(b => b.type !== 'text');

      if (otherBlocks.length > 0) {
        otherBlocks.forEach(block => {
          addResultBlock(msgId, block);
        });
      }

      if (textBlock && textBlock.content) {
        updateMessageStatus(msgId, 'rendering_result');
        const fullText = textBlock.content;
        let currentIndex = 0;

        if (typewriterRef.current) clearInterval(typewriterRef.current);

        typewriterRef.current = setInterval(() => {
          if (currentIndex < fullText.length) {
            const chunkSize = Math.floor(Math.random() * 3) + 2;
            const chunk = fullText.slice(currentIndex, currentIndex + chunkSize);
            
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
      console.error("Agent 接口请求失败:", error);
      updateMessageStatus(msgId, 'error');
      addResultBlock(msgId, { 
        type: 'text', 
        content: '抱歉，指挥官。神经连接已断开。请检查后端的 FastAPI 引擎是否已成功挂载。' 
      });
    }
  };

  return { sendMessage };
}