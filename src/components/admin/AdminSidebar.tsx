"use client";

import { useCallback, useMemo, memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

// Memoized nav item component
const NavItem = memo(function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      prefetch={true}
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
});

function AdminSidebarComponent() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Memoize navigation items
  const navigation = useMemo(
    () => [
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
    ],
    [t]
  );

  // Use callback for toggle
  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNavClick = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Prefetch all admin pages on mount
  useMemo(() => {
    if (typeof window !== "undefined") {
      // Prefetch pages in the background
      navigation.forEach((item) => {
        router.prefetch(item.href);
      });
    }
  }, [navigation, router]);

  const NavContent = useMemo(
    () => (
      <>
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <NavItem
                key={item.href}
                item={item}
                isActive={isActive}
                onClick={handleNavClick}
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <Link
            href="/"
            prefetch={true}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Presentation className="h-4 w-4" />
            {t.admin.sidebar.backToApp}
          </Link>
        </div>
      </>
    ),
    [navigation, pathname, handleNavClick, t.admin.sidebar.backToApp]
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-background border shadow-sm"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
          aria-hidden="true"
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
          <Link
            href="/admin"
            className="flex items-center gap-2"
            onClick={closeSidebar}
            prefetch={true}
          >
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">Admin</span>
          </Link>
          <LanguageSwitcher />
        </div>
        {NavContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-full w-64 bg-background border-r">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/admin" className="flex items-center gap-2" prefetch={true}>
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">Admin</span>
          </Link>
          <LanguageSwitcher />
        </div>
        {NavContent}
      </aside>
    </>
  );
}

export const AdminSidebar = memo(AdminSidebarComponent);
