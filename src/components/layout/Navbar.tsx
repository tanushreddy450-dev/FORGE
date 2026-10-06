import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Search, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SidebarTrigger } from "@/components/shadcn/ui/sidebar";
import { Separator } from "@/components/shadcn/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import { ModeToggle } from "@/components/ui/mode-toggle";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/topics": "Curriculum & Visualizers",
  "/problems": "Problems",
  "/leaderboard": "Leaderboard",
  "/profile": "Profile",
};

function titleFor(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.startsWith("/topics/")) return "Topic Overview";
  if (pathname.startsWith("/arena/")) return "Coding Arena";
  if (pathname.startsWith("/problems")) return "Problems";
  return "Dashboard";
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const pageTitle = titleFor(location.pathname);

  const displayName = user?.full_name || user?.username || "Student";
  const displayEmail = user?.email || "";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/problems?search=${encodeURIComponent(q)}` : "/problems");
  };

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-card transition-colors">
      <div className="flex w-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md" />
        <Separator orientation="vertical" className="h-4 bg-border" />

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {pageTitle}
          </h1>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={submitSearch} role="search" className="mx-auto hidden max-w-sm flex-1 md:block">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              aria-label="Search problems and topics"
              placeholder="Search problems, topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary/50 py-1.5 pl-8 pr-10 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:bg-background"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground bg-card border border-border">⌘K</kbd>
            </div>
          </div>
        </form>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-secondary border border-transparent hover:border-border"
              >
                <Avatar className="h-7 w-7 rounded-md border border-border">
                  <AvatarFallback className="rounded-md bg-secondary text-foreground font-semibold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-28 truncate text-xs font-medium sm:block text-foreground">
                  {displayName}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="min-w-52 rounded-lg border border-border bg-popover text-popover-foreground shadow-md p-1" align="end">
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex items-center gap-2.5 text-left text-xs">
                  <Avatar className="h-8 w-8 rounded-md border border-border">
                    <AvatarFallback className="rounded-md bg-secondary text-foreground font-semibold text-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-xs leading-tight">
                    <span className="truncate font-medium text-foreground">{displayName}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{displayEmail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem asChild className="cursor-pointer rounded-md text-xs hover:bg-secondary py-1.5">
                <Link to="/profile">
                  <User className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-md text-xs text-destructive hover:bg-destructive/10 py-1.5">
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
