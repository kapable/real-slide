"use client";

import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarChartComponentProps {
  data: { hour: number; count: number }[];
  formatHour: (hour: number) => string;
  color?: string;
}

function BarChartComponentInner({
  data,
  formatHour,
  color = "#f59e0b",
}: BarChartComponentProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="hour"
          tickFormatter={formatHour}
          className="text-xs"
        />
        <YAxis className="text-xs" />
        <Tooltip
          labelFormatter={formatHour}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const BarChartComponent = memo(BarChartComponentInner);
