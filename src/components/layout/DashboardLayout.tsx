import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { SidebarProvider, SidebarInset } from "@/components/shadcn/ui/sidebar";
import { Toaster } from "@/components/shadcn/ui/sonner";

export default function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-svh w-full bg-background text-foreground">
        <Sidebar />
        <SidebarInset className="relative flex flex-col min-w-0 bg-background">
          <Navbar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
