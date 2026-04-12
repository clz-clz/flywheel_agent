import { useRef } from 'react';
import { useChatStore, ResultBlock } from '../store/useChatStore';

// 📍 关键点 1：把后端地址配置放在文件顶层
const API_BASE_URL = 'http://47.111.21.230:8000'; 

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

  // 这是暴露给页面的唯一发送方法
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. 用户消息上屏
    addUserMessage(text);

    // 2. 召唤 Agent 占位气泡，状态变为 'thinking' (深度思考中...)
    const msgId = addAssistantPlaceholder();

    try {
      // 📍 关键点 2：真正的 fetch 请求就放在 try 块的核心位置！
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
        }),
      });

      // 如果后端炸了或者 404，立刻跳到 catch 块报错
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 3. 获取后端一次性返回的完整 JSON 数据
      const data = await response.json();
      
      // 4. 解析大模型返回的 Blocks
      const blocks: ResultBlock[] = data.blocks || [];
      const textBlock = blocks.find(b => b.type === 'text') as { type: 'text', content: string } | undefined;
      const otherBlocks = blocks.filter(b => b.type !== 'text');

      // 5. 立即处理非文本的结构化卡片数据 (触发右侧面板动态渲染)
      if (otherBlocks.length > 0) {
        otherBlocks.forEach(block => {
          addResultBlock(msgId, block);
        });
      }

      // 6. 伪流式打字机效果：在前端把后端一次性发来的长文本拆成单字慢慢渲染
      if (textBlock && textBlock.content) {
        updateMessageStatus(msgId, 'rendering_result');
        const fullText = textBlock.content;
        let currentIndex = 0;

        // 清除旧的定时器，防止打字机串台
        if (typewriterRef.current) clearInterval(typewriterRef.current);

        typewriterRef.current = setInterval(() => {
          if (currentIndex < fullText.length) {
            // 每次切 2~4 个字符，模拟大模型真实的呼吸感
            const chunkSize = Math.floor(Math.random() * 3) + 2;
            const chunk = fullText.slice(currentIndex, currentIndex + chunkSize);
            
            appendStreamChunk(msgId, chunk);
            currentIndex += chunkSize;
          } else {
            // 打字结束
            if (typewriterRef.current) clearInterval(typewriterRef.current);
            updateMessageStatus(msgId, 'done');
          }
        }, 30); // 30ms 吐一次字，速度可以自行调节
      } else {
        // 如果后端连文本都没返回，直接结束状态
        updateMessageStatus(msgId, 'done');
      }

    } catch (error) {
      console.error("Agent 接口请求失败:", error);
      updateMessageStatus(msgId, 'error');
      // 降级处理：如果 127.0.0.1 连不上，优雅地在左侧气泡提示用户
      addResultBlock(msgId, { 
        type: 'text', 
        content: '抱歉，我的神经连接似乎受到了干扰，无法连接到后端的 FastAPI 引擎。请检查后端服务是否在 8000 端口启动。' 
      });
    }
  };

  return { sendMessage };
}