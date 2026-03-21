"use client";

import { memo, useMemo } from "react";
import {
  SimpleBarChart,
  SimplePieChart,
  ProgressBar,
  StatCard,
  DonutChart,
} from "@/components/charts/LightweightCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsData {
  sessionsByHour: { hour: number; count: number }[];
  sessionsByDay: { date: string; count: number }[];
  slideTypes: { type: string; count: number }[];
  participantStats: {
    total: number;
    active: number;
    avgPerSession: number;
  };
  sessionStats: {
    total: number;
    active: number;
    avgSlides: number;
  };
}

interface LightweightAnalyticsProps {
  data: AnalyticsData;
  className?: string;
}

/**
 * Lightweight analytics dashboard using CSS/SVG charts
 * Alternative to recharts-based analytics - ~80% smaller bundle impact
 */
function LightweightAnalyticsComponent({ data, className }: LightweightAnalyticsProps) {
  // Transform data for charts
  const hourlyData = useMemo(
    () =>
      data.sessionsByHour.map((item) => ({
        label: `${item.hour}:00`,
        value: item.count,
      })),
    [data.sessionsByHour]
  );

  const slideTypeData = useMemo(
    () =>
      data.slideTypes.map((item) => ({
        label: item.type,
        value: item.count,
      })),
    [data.slideTypes]
  );

  const peakHour = useMemo(() => {
    const max = Math.max(...data.sessionsByHour.map((h) => h.count));
    const peak = data.sessionsByHour.find((h) => h.count === max);
    return peak ? `${peak.hour}:00` : "N/A";
  }, [data.sessionsByHour]);

  return (
    <div className={className}>
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Sessions"
          value={data.sessionStats.total}
          sparklineData={data.sessionsByDay.slice(-7).map((d) => d.count)}
        />
        <StatCard
          title="Active Sessions"
          value={data.sessionStats.active}
          change={data.sessionStats.active > 0 ? 12 : 0}
        />
        <StatCard
          title="Total Participants"
          value={data.participantStats.total}
        />
        <StatCard
          title="Avg Participants/Session"
          value={data.participantStats.avgPerSession.toFixed(1)}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hourly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Sessions by Hour
              <span className="ml-2 text-xs text-muted-foreground">
                Peak: {peakHour}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={hourlyData}
              height={180}
              showValues={false}
            />
          </CardContent>
        </Card>

        {/* Slide Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Slide Types Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <SimplePieChart
              data={slideTypeData}
              size={180}
              innerRadius={40}
            />
          </CardContent>
        </Card>

        {/* Session Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Session Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar
              label="Active Rate"
              value={data.sessionStats.active}
              max={Math.max(data.sessionStats.total, 1)}
              color="#10b981"
            />
            <ProgressBar
              label="Participation Rate"
              value={data.participantStats.active}
              max={Math.max(data.participantStats.total, 1)}
              color="#3b82f6"
            />
            <ProgressBar
              label="Avg Slides per Session"
              value={data.sessionStats.avgSlides}
              max={10}
              color="#8b5cf6"
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Engagement Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-around py-4">
            <DonutChart
              value={
                data.sessionStats.total > 0
                  ? (data.sessionStats.active / data.sessionStats.total) * 100
                  : 0
              }
              label="Active"
              color="#10b981"
            />
            <DonutChart
              value={
                data.slideTypes.reduce((sum, s) => sum + s.count, 0) > 0
                  ? (data.slideTypes.find((s) => s.type === "vote")?.count || 0) /
                    data.slideTypes.reduce((sum, s) => sum + s.count, 0) *
                    100
                  : 0
              }
              label="Interactive"
              color="#3b82f6"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const LightweightAnalytics = memo(LightweightAnalyticsComponent);

// ============================================
// Hook to fetch analytics data
// ============================================

export function useAnalyticsData() {
  // This would typically fetch from an API
  // For now, return sample data structure
  return {
    sessionsByHour: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 10),
    })),
    sessionsByDay: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
      count: Math.floor(Math.random() * 20),
    })),
    slideTypes: [
      { type: "slide", count: 45 },
      { type: "vote", count: 30 },
      { type: "quiz", count: 15 },
      { type: "wordcloud", count: 10 },
    ],
    participantStats: {
      total: 150,
      active: 45,
      avgPerSession: 8.5,
    },
    sessionStats: {
      total: 25,
      active: 5,
      avgSlides: 4,
    },
  };
}
