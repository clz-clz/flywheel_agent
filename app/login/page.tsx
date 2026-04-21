'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '@/lib/api/agentService';
import { Button } from '@/components/ui/button'; // 假设使用了 shadcn/ui
import { DimensionRadarCard } from '@/components/cards/dimension-radar-card';

export default function LoginPage() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLoginMode) {
        const data = await AuthAPI.login(username, password);
        localStorage.setItem('access_token', data.access_token);
        router.push('/'); // 登录成功，切入主引擎
      } else {
        await AuthAPI.register(username, password);
        setIsLoginMode(true); // 注册成功切回登录
        setError('注册成功，请登录飞轮 Copilot');
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 backdrop-blur-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            {isLoginMode ? '引擎唤醒' : '指挥官注册'}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            飞轮职业导航 Copilot · A13 赛题
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <input
              type="text"
              required
              className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="输入指挥官代号 (Username)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              required
              className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="输入访问密钥 (Password)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? '数据加密传输中...' : isLoginMode ? '进入系统' : '创建档案'}
          </Button>

          <div className="text-center text-sm">
            <span className="text-zinc-400">
              {isLoginMode ? '首次使用？' : '已有档案？'}
            </span>{' '}
            <button
              type="button"
              className="font-medium text-blue-500 hover:text-blue-400"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError(null);
              }}
            >
              {isLoginMode ? '申请接入' : '返回登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}