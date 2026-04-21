// lib/hooks/useSTT.ts
import { useState, useRef, useCallback } from 'react';
import { AgentAPI } from '../api/agentService';

export function useSTT() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  
  // 严格指明泛型类型为 MediaRecorder 和 Blob 数组
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // 申请麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      // 监听音频数据片段 (严格使用 BlobEvent 类型)
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("无法访问麦克风:", err);
      throw new Error("请允许浏览器麦克风权限，以启用语音答题");
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder.current) {
        reject(new Error("未找到正在运行的录音实例"));
        return;
      }

      mediaRecorder.current.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);
        
        try {
          // 将音频片段拼装为 wav 格式的 File 对象
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
          
          // 调用 agentService.ts 中我们已封装好的转录接口
          const response = await AgentAPI.transcribeAudio(audioFile);
          
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.text || "");
          }
        } catch (err) {
          reject(err);
        } finally {
          setIsTranscribing(false);
          // 彻底释放麦克风硬件资源
          if (mediaRecorder.current?.stream) {
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
          }
          mediaRecorder.current = null;
        }
      };

      mediaRecorder.current.stop();
    });
  }, []);

  return { isRecording, isTranscribing, startRecording, stopRecording };
}