"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Presentation,
  BarChart2,
  Settings,
  Shield,
} from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navigation = [
    {
      name: t.admin.sidebar.dashboard,
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: t.admin.sidebar.sessions,
      href: "/admin/sessions",
      icon: Presentation,
    },
    {
      name: t.admin.sidebar.analytics,
      href: "/admin/analytics",
      icon: BarChart2,
    },
    {
      name: t.admin.sidebar.settings,
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="flex flex-col h-full w-64 bg-background border-r">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg tracking-tight">Admin</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Presentation className="h-4 w-4" />
          {t.admin.sidebar.backToApp}
        </Link>
      </div>
    </aside>
  );
}
