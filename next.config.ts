// 文件路径：next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 开启 React 严格模式
  reactStrictMode: true,
  
  // 🚀 核心 Proxy 代理配置
  async rewrites() {
    return [
      {
        // 匹配前端所有以 /api/ 开头的请求
        source: '/api/:path*',
        // 代理转发到 Python FastAPI 后端
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://47.111.21.230:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;