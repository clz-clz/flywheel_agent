// 文件路径：app/layout.tsx
import './globals.css'
import { HistorySidebar } from '@/components/layout/history-sidebar'
import { AuthGuard } from '@/components/layout/auth-guard' // 引入哨兵

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className="dark">
      <body className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased">
        {/* 全局身份拦截哨兵套在最外层 */}
        <AuthGuard>
          
          {/* 左侧历史抽屉 */}
          <HistorySidebar />

          {/* 主舱内容区 */}
          <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
          
        </AuthGuard>
      </body>
    </html>
  )
}