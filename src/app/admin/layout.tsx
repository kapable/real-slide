"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { memo } from "react";

function AdminLayoutComponent({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex h-screen bg-muted/20">
        <AdminSidebar />

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Page content */}
          <div className="flex-1 overflow-y-auto p-6 pt-20 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </LanguageProvider>
  );
}

export default memo(AdminLayoutComponent);
