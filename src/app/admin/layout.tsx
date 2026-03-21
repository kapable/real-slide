"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="flex h-screen bg-muted/20">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden lg:flex">
          <AdminSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Mobile header */}
          <header className="lg:hidden h-14 flex items-center px-4 border-b bg-background/50 backdrop-blur-md">
            <span className="font-bold">Admin Dashboard</span>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </LanguageProvider>
  );
}
