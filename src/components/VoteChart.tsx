"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
import { cn } from "@/lib/utils";

interface VoteChartProps {
  votes: Record<number, number>; // { optionIndex: count }
  options: string[];
  type?: "bar" | "pie";
  correctAnswer?: number; // 퀴즈용 정답 인덱스
  className?: string;
}

export function VoteChart({ 
  votes, 
  options, 
  type = "bar", 
  correctAnswer,
  className
}: VoteChartProps) {
  const data = options.map((label, index) => ({
    name: label || `옵션 ${index + 1}`,
    votes: votes[index] || 0,
    isCorrect: correctAnswer !== undefined && index === correctAnswer,
  }));

  // Premium Color Palette
  const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e"];
  const CORRECT_COLOR = "#10b981"; // Success Green
  const INCORRECT_COLOR = "#f43f5e"; // Soft Red

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-3 animate-in fade-in zoom-in-95">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{payload[0].value}</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">득표</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (type === "pie") {
    return (
      <div className={cn("w-full h-[300px]", className)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="votes"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    correctAnswer !== undefined
                      ? entry.isCorrect
                        ? CORRECT_COLOR
                        : INCORRECT_COLOR
                      : COLORS[index % COLORS.length]
                  }
                  stroke="none"
                  className="hover:opacity-80 transition-opacity outline-none"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-[300px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            {data.map((entry, index) => (
              <linearGradient key={`gradient-${index}`} id={`colorBar-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={
                  correctAnswer !== undefined
                    ? (entry.isCorrect ? CORRECT_COLOR : INCORRECT_COLOR)
                    : COLORS[index % COLORS.length]
                } stopOpacity={1}/>
                <stop offset="100%" stopColor={
                  correctAnswer !== undefined
                    ? (entry.isCorrect ? CORRECT_COLOR : INCORRECT_COLOR)
                    : COLORS[index % COLORS.length]
                } stopOpacity={0.6}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
          <Bar dataKey="votes" radius={[10, 10, 0, 0]} animationDuration={1500}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#colorBar-${index})`}
                className="hover:opacity-90 transition-opacity outline-none"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
