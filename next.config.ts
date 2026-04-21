// 文件路径：next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // 拦截前端所有发往 /api 的请求
        source: '/api/:path*',
        // 自动隐式转发到您的云端服务器
        destination: 'http://47.111.21.230:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;