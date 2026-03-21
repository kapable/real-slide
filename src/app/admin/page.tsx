"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Presentation,
  Users,
  Layers,
  Activity,
  Loader2,
  Plus,
  Eye,
  UserPlus,
  Vote,
  HelpCircle,
  Folder
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Stats {
  totalSessions: number;
  activeSessions: number;
  totalParticipants: number;
  totalSlides: number;
}

interface Activity {
  id: string;
  type: "session_created" | "participant_joined" | "vote_submitted" | "quiz_answered";
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

function formatTimeAgo(timestamp: string, t: { admin: { dashboard: { timeAgo: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string } } } }): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t.admin.dashboard.timeAgo.justNow;
  if (diffMins < 60) return `${diffMins} ${t.admin.dashboard.timeAgo.minutesAgo}`;
  if (diffHours < 24) return `${diffHours} ${t.admin.dashboard.timeAgo.hoursAgo}`;
  return `${diffDays} ${t.admin.dashboard.timeAgo.daysAgo}`;
}

function getActivityIcon(type: Activity["type"]) {
  switch (type) {
    case "session_created":
      return Folder;
    case "participant_joined":
      return UserPlus;
    case "vote_submitted":
      return Vote;
    case "quiz_answered":
      return HelpCircle;
    default:
      return Activity;
  }
}

function getActivityColor(type: Activity["type"]) {
  switch (type) {
    case "session_created":
      return "bg-blue-500";
    case "participant_joined":
      return "bg-green-500";
    case "vote_submitted":
      return "bg-purple-500";
    case "quiz_answered":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [activityError, setActivityError] = useState(false);

  const fetchStats = async () => {
    setStatsError(false);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      setStatsError(true);
      toast({
        variant: "destructive",
        title: t.admin.errors.fetchFailed,
        description: t.admin.errors.serverError,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    setActivityError(false);
    try {
      const res = await fetch("/api/admin/activity");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setActivities(data);
    } catch (error) {
      setActivityError(true);
      toast({
        variant: "destructive",
        title: t.admin.errors.fetchFailed,
        description: t.admin.errors.serverError,
      });
    } finally {
      setIsActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, []);

  const statsConfig = [
    {
      title: t.admin.dashboard.stats.totalSessions,
      key: "totalSessions" as keyof Stats,
      icon: Presentation,
      description: t.admin.dashboard.allTime,
    },
    {
      title: t.admin.dashboard.stats.activeSessions,
      key: "activeSessions" as keyof Stats,
      icon: Activity,
      description: t.admin.dashboard.last24Hours,
    },
    {
      title: t.admin.dashboard.stats.totalParticipants,
      key: "totalParticipants" as keyof Stats,
      icon: Users,
      description: t.admin.dashboard.allTime,
    },
    {
      title: t.admin.dashboard.stats.totalSlides,
      key: "totalSlides" as keyof Stats,
      icon: Layers,
      description: t.admin.dashboard.allTime,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.admin.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.admin.dashboard.description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold">
                  {stats?.[stat.key]?.toLocaleString() ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.admin.dashboard.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link href="/creator">
                <Plus className="h-4 w-4" />
                {t.admin.dashboard.createSession}
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link href="/admin/sessions">
                <Eye className="h-4 w-4" />
                {t.admin.dashboard.viewActiveSessions}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.admin.dashboard.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          {isActivityLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.admin.dashboard.noActivity}
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const color = getActivityColor(activity.type);
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${color} text-white`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp, t)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {activity.type.replace("_", " ")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
