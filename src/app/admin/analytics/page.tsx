"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, Presentation, TrendingUp, Clock, Loader2, Download } from "lucide-react";

interface AnalyticsData {
  sessionsOverTime: { date: string; count: number }[];
  participantsOverTime: { date: string; count: number }[];
  slideTypeDistribution: { type: string; count: number }[];
  engagement: {
    totalSessions: number;
    totalParticipants: number;
    avgParticipantsPerSession: number;
    mostActiveSessions: { id: string; title: string; participantCount: number }[];
    peakUsageHours: { hour: number; count: number }[];
  };
}

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b"];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState("30");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics?days=${days}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [days]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatHour = (hour: number) => {
    return `${hour}:00`;
  };

  const handleExportCSV = () => {
    if (!data) return;

    const csvRows: string[] = [];

    // Header
    csvRows.push("Real-Slide Analytics Report");
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push(`Period: Last ${days} days`);
    csvRows.push("");

    // Summary
    csvRows.push("SUMMARY");
    csvRows.push("Metric,Value");
    csvRows.push(`Total Sessions,${data.engagement.totalSessions}`);
    csvRows.push(`Total Participants,${data.engagement.totalParticipants}`);
    csvRows.push(`Avg Participants/Session,${data.engagement.avgParticipantsPerSession}`);
    csvRows.push("");

    // Sessions over time
    csvRows.push("SESSIONS OVER TIME");
    csvRows.push("Date,Count");
    data.sessionsOverTime.forEach((item) => {
      csvRows.push(`${item.date},${item.count}`);
    });
    csvRows.push("");

    // Participants over time
    csvRows.push("PARTICIPANTS OVER TIME");
    csvRows.push("Date,Count");
    data.participantsOverTime.forEach((item) => {
      csvRows.push(`${item.date},${item.count}`);
    });
    csvRows.push("");

    // Slide types
    csvRows.push("SLIDE TYPES DISTRIBUTION");
    csvRows.push("Type,Count");
    data.slideTypeDistribution.forEach((item) => {
      csvRows.push(`${item.type},${item.count}`);
    });
    csvRows.push("");

    // Most active sessions
    csvRows.push("MOST ACTIVE SESSIONS");
    csvRows.push("Title,Participants");
    data.engagement.mostActiveSessions.forEach((item) => {
      csvRows.push(`"${item.title}",${item.participantCount}`);
    });
    csvRows.push("");

    // Peak usage hours
    csvRows.push("PEAK USAGE HOURS");
    csvRows.push("Hour,Count");
    data.engagement.peakUsageHours.forEach((item) => {
      csvRows.push(`${item.hour}:00,${item.count}`);
    });

    // Download
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics-${days}days-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!data) return;

    const exportData = {
      generated: new Date().toISOString(),
      period: `Last ${days} days`,
      summary: {
        totalSessions: data.engagement.totalSessions,
        totalParticipants: data.engagement.totalParticipants,
        avgParticipantsPerSession: data.engagement.avgParticipantsPerSession,
      },
      sessionsOverTime: data.sessionsOverTime,
      participantsOverTime: data.participantsOverTime,
      slideTypeDistribution: data.slideTypeDistribution,
      mostActiveSessions: data.engagement.mostActiveSessions,
      peakUsageHours: data.engagement.peakUsageHours,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics-${days}days-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.admin.analytics.title}</h1>
          <p className="text-muted-foreground">{t.admin.analytics.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t.admin.analytics.days["7"]}</SelectItem>
              <SelectItem value="30">{t.admin.analytics.days["30"]}</SelectItem>
              <SelectItem value="90">{t.admin.analytics.days["90"]}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={!data}>
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Engagement Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.admin.analytics.totalSessions}
                </CardTitle>
                <Presentation className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data?.engagement.totalSessions ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.admin.analytics.totalParticipants}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data?.engagement.totalParticipants ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.admin.analytics.avgParticipants}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data?.engagement.avgParticipantsPerSession ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sessions Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.admin.analytics.sessionsOverTime}</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.sessionsOverTime.every((d) => d.count === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.admin.analytics.noData}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data?.sessionsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        labelFormatter={formatDate}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Participants Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.admin.analytics.participantsOverTime}</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.participantsOverTime.every((d) => d.count === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.admin.analytics.noData}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data?.participantsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        labelFormatter={formatDate}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Slide Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.admin.analytics.slideTypesDistribution}</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.slideTypeDistribution.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.admin.analytics.noData}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data?.slideTypeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          label={({ type, count }) => `${type}: ${count}`}
                        >
                          {data?.slideTypeDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peak Usage Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t.admin.analytics.peakUsageHours}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.engagement.peakUsageHours.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.admin.analytics.noData}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data?.engagement.peakUsageHours}>
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
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Most Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.admin.analytics.mostActiveSessions}</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.engagement.mostActiveSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.admin.analytics.noData}
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.engagement.mostActiveSessions.map((session, index) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="font-medium truncate max-w-[300px]">
                          {session.title}
                        </span>
                      </div>
                      <Badge>
                        {session.participantCount} {t.admin.analytics.participants}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
