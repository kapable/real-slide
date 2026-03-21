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
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useState } from "react";

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

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

  const NavContent = () => (
    <>
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
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
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-background border shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-background border-r transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/admin" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">Admin</span>
          </Link>
          <LanguageSwitcher />
        </div>
        <NavContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-full w-64 bg-background border-r">
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
        <NavContent />
      </aside>
    </>
  );
}
