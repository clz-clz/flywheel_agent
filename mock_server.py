from fastapi import FastAPI, Request
import asyncio
import time

app = FastAPI()

# 工业级限流配置：假设上游大模型最多只能扛 20 个并发
MAX_CONCURRENT = 20 
current_requests = 0

@app.post("/api/chat")
async def chat(request: Request):
    global current_requests
    
    # 【架构核心】动态熔断/降级判断
    if current_requests >= MAX_CONCURRENT:
        # 触发降级：直接读取本地缓存/规则兜底，极速响应
        await asyncio.sleep(0.01) # 模拟 10ms 的降级链路耗时
        # 注意：这里返回 429 或 200(带degraded标识) 都可以，我们这里返回HTTP 429模拟被限流的降级处理
        return {"status": "degraded", "message": "系统触发熔断，返回兜底规则数据"}
    
    # 正常放行：模拟请求大模型
    current_requests += 1
    try:
        # 模拟大模型极慢的推理耗时：300ms
        await asyncio.sleep(0.3)
        return {"status": "success", "message": "大模型规划结果生成完毕"}
    finally:
        current_requests -= 1

if __name__ == "__main__":
    import uvicorn
    # 启动在 8000 端口
    uvicorn.run(app, host="127.0.0.1", port=8000)