"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight CSS-based chart components
 * Alternative to recharts for simple visualizations
 * Zero external dependencies - pure CSS/SVG
 */

// ============================================
// Simple Bar Chart (CSS-based)
// ============================================

interface SimpleBarChartProps {
  data: { label: string; value: number; color?: string }[];
  className?: string;
  height?: number;
  showValues?: boolean;
  animated?: boolean;
}

function SimpleBarChartComponent({
  data,
  className,
  height = 200,
  showValues = true,
  animated = true,
}: SimpleBarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#f59e0b", // amber
    "#10b981", // emerald
    "#f43f5e", // rose
  ];

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <div className="flex items-end justify-center gap-2 h-full pb-8">
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const color = item.color || colors[index % colors.length];

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1 max-w-24"
            >
              {showValues && (
                <span className="text-xs font-bold text-muted-foreground">
                  {item.value}
                </span>
              )}
              <div
                className={cn(
                  "w-full rounded-t-lg transition-all",
                  animated && "animate-in slide-in-from-bottom duration-500"
                )}
                style={{
                  height: `${Math.max(percentage, 2)}%`,
                  backgroundColor: color,
                  minHeight: 8,
                }}
              />
              <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const SimpleBarChart = memo(SimpleBarChartComponent);

// ============================================
// Simple Pie Chart (SVG-based)
// ============================================

interface SimplePieChartProps {
  data: { label: string; value: number; color?: string }[];
  className?: string;
  size?: number;
  showLabels?: boolean;
  innerRadius?: number;
}

function SimplePieChartComponent({
  data,
  className,
  size = 200,
  showLabels = true,
  innerRadius = 0,
}: SimplePieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#f43f5e",
    "#06b6d4",
  ];

  const segments = useMemo(() => {
    let currentAngle = -90;
    return data.map((item, index) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (currentAngle * Math.PI) / 180;

      const outerRadius = size / 2 - 10;
      const inner = innerRadius || 0;

      const x1 = size / 2 + outerRadius * Math.cos(startRad);
      const y1 = size / 2 + outerRadius * Math.sin(startRad);
      const x2 = size / 2 + outerRadius * Math.cos(endRad);
      const y2 = size / 2 + outerRadius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData =
        inner > 0
          ? `M ${size / 2 + inner * Math.cos(startRad)} ${size / 2 + inner * Math.sin(startRad)}
             L ${x1} ${y1}
             A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
             L ${size / 2 + inner * Math.cos(endRad)} ${size / 2 + inner * Math.sin(endRad)}
             A ${inner} ${inner} 0 ${largeArcFlag} 0 ${size / 2 + inner * Math.cos(startRad)} ${size / 2 + inner * Math.sin(startRad)}`
          : `M ${size / 2} ${size / 2}
             L ${x1} ${y1}
             A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
             Z`;

      return {
        ...item,
        color: item.color || colors[index % colors.length],
        path: pathData,
        percentage,
        midAngle: startAngle + angle / 2,
      };
    });
  }, [data, total, size, innerRadius, colors]);

  return (
    <div className={cn("relative", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.path}
            fill={segment.color}
            className="transition-opacity hover:opacity-80"
          />
        ))}
      </svg>
      {showLabels && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs text-muted-foreground">
                {segment.label}: {segment.value} ({segment.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const SimplePieChart = memo(SimplePieChartComponent);

// ============================================
// Progress Bar (for single values)
// ============================================

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function ProgressBarComponent({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = "#3b82f6",
  className,
  size = "md",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", heights[size])}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export const ProgressBar = memo(ProgressBarComponent);

// ============================================
// Stat Card with Sparkline
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  sparklineData?: number[];
  className?: string;
}

function StatCardComponent({
  title,
  value,
  change,
  sparklineData,
  className,
}: StatCardProps) {
  const sparklinePoints = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return "";
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 24;

    return sparklineData
      .map((val, i) => {
        const x = (i / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [sparklineData]);

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {change !== undefined && (
          <span
            className={cn(
              "text-xs font-medium",
              change >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {change >= 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <svg className="mt-2" width="80" height="24" viewBox="0 0 80 24">
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            points={sparklinePoints}
          />
        </svg>
      )}
    </div>
  );
}

export const StatCard = memo(StatCardComponent);

// ============================================
// Donut Chart (for percentages)
// ============================================

interface DonutChartProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}

function DonutChartComponent({
  value,
  max = 100,
  size = 120,
  strokeWidth = 12,
  color = "#3b82f6",
  label,
  className,
}: DonutChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

export const DonutChart = memo(DonutChartComponent);
