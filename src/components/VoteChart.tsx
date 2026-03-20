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

interface VoteChartProps {
  votes: Record<number, number>; // { optionIndex: count }
  options: string[];
  type?: "bar" | "pie";
  correctAnswer?: number; // 퀴즈용 정답 인덱스
}

export function VoteChart({ votes, options, type = "bar", correctAnswer }: VoteChartProps) {
  const data = options.map((label, index) => ({
    name: label,
    votes: votes[index] || 0,
    isCorrect: correctAnswer !== undefined && index === correctAnswer,
  }));

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
  const CORRECT_COLOR = "#10b981"; // 초록색
  const INCORRECT_COLOR = "#ef4444"; // 빨간색

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, votes }) => `${name}: ${votes}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="votes"
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
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="votes" fill="#3b82f6">
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
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
