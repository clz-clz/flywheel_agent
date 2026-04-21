'use client';

import { RadarDimension } from '@/lib/api/agentService';
import React from 'react';

interface DimensionRadarCardProps {
  dimensions: RadarDimension[];
  size?: number;
}

export function DimensionRadarCard({ dimensions, size = 300 }: DimensionRadarCardProps) {
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const angleStep = (Math.PI * 2) / dimensions.length;

  // 坐标计算函数
  const getCoordinates = (value: number, index: number) => {
    const r = (radius * value) / 100;
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // 生成多边形路径
  const userPoints = dimensions.map((d, i) => {
    const { x, y } = getCoordinates(d.value, i);
    return `${x},${y}`;
  }).join(' ');

  const benchmarkPoints = dimensions.map((d, i) => {
    const { x, y } = getCoordinates(d.benchmark, i);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-md">
      <svg width={size} height={size} className="overflow-visible">
        {/* 绘制背景网格 (5层) */}
        {[20, 40, 60, 80, 100].map((tick) => (
          <polygon
            key={tick}
            points={dimensions.map((_, i) => {
              const { x, y } = getCoordinates(tick, i);
              return `${x},${y}`;
            }).join(' ')}
            className="fill-none stroke-zinc-800 stroke-[1px]"
          />
        ))}

        {/* 绘制轴线与标签 */}
        {dimensions.map((d, i) => {
          const { x, y } = getCoordinates(100, i);
          const labelPos = getCoordinates(120, i); // 标签稍微向外
          return (
            <g key={i}>
              <line x1={center} y1={center} x2={x} y2={y} className="stroke-zinc-800 stroke-[1px]" />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px] font-medium uppercase tracking-tighter"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* 绘制标杆多边形 (虚线) */}
        <polygon
          points={benchmarkPoints}
          className="fill-none stroke-zinc-600 stroke-[1.5px] [stroke-dasharray:4_2]"
        />

        {/* 绘制用户能力多边形 (核心高亮) */}
        <polygon
          points={userPoints}
          className="fill-blue-500/20 stroke-blue-500 stroke-[2px] transition-all duration-1000"
        />
        
        {/* 顶点装饰 */}
        {dimensions.map((d, i) => {
          const { x, y } = getCoordinates(d.value, i);
          return <circle key={i} cx={x} cy={y} r="3" className="fill-blue-400" />;
        })}
      </svg>

      <div className="mt-4 flex space-x-6 text-[10px] uppercase tracking-widest">
        <div className="flex items-center space-x-2">
          <span className="h-0.5 w-4 bg-blue-500"></span>
          <span className="text-zinc-300">当前画像</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="h-0.5 w-4 border-t border-dashed border-zinc-500"></span>
          <span className="text-zinc-500">岗位标杆</span>
        </div>
      </div>
    </div>
  );
}