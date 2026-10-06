import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { SidebarProvider, SidebarInset } from "@/components/shadcn/ui/sidebar";
import { Toaster } from "@/components/shadcn/ui/sonner";

export default function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="relative flex min-h-svh w-full bg-background text-foreground">
        {/* Subtle professional DSA theme background behind the original UI */}
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-15"
          style={{ backgroundImage: `url('/theme-dsa.png')` }}
          aria-hidden="true"
        />

        <Sidebar />
        <SidebarInset className="relative z-10 flex flex-col min-w-0 bg-background/85 dark:bg-background/90 backdrop-blur-[0.5px]">
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
