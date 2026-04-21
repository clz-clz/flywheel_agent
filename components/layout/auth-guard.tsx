'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 核心修复：将逻辑包装为异步函数，打破级联渲染链条
    const verifyIdentity = async () => {
      const token = localStorage.getItem('access_token');

      if (!token && pathname !== '/login') {
        router.replace('/login');
      } else if (token && pathname === '/login') {
        router.replace('/');
      } else {
        // 关键：挂起一个微任务，让 React 完成当前的 Effect 周期后再更新状态
        await Promise.resolve(); 
        
        // 使用函数式更新，确保如果已经是 true 就不再触发重复渲染
        setIsAuthorized((prev) => prev ? true : true);
      }
    };

    verifyIdentity();
  }, [pathname, router]);

  // 如果未授权且不在登录页，展示暗黑过场，防止 UI 闪烁
  if (!isAuthorized && pathname !== '/login') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-500 tracking-widest text-sm">
        系统安保认证中...
      </div>
    );
  }

  return <>{children}</>;
}