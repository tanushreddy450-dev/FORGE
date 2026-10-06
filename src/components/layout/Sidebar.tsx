import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Code2,
  User,
  LogOut,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";

const navGroups = [
  {
    label: "LEARNING",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/topics", label: "Topics & Visualizers", icon: BookOpen },
      { to: "/problems", label: "Problems", icon: Code2 },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "ACCOUNT",
    items: [{ to: "/profile", label: "My Profile", icon: User }],
  },
];

function UserFooter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.full_name || user?.username || "Student";
  const displayEmail = user?.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
            >
              <Avatar className="h-7 w-7 rounded-md border border-border">
                <AvatarFallback className="rounded-md bg-secondary text-foreground font-semibold text-xs">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <span className="truncate font-medium text-foreground">{displayName}</span>
                <span className="truncate text-[11px] text-muted-foreground">{displayEmail}</span>
              </div>
              <LogOut className="ml-auto size-3.5 text-muted-foreground hover:text-destructive transition-colors" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-52 rounded-lg border border-border bg-popover text-popover-foreground shadow-md p-1"
            side="right"
            align="end"
            sideOffset={6}
          >
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="flex items-center gap-2.5 text-left text-xs">
                <Avatar className="h-7 w-7 rounded-md border border-border">
                  <AvatarFallback className="rounded-md bg-secondary text-foreground font-semibold text-xs">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-medium text-foreground">{displayName}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{displayEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem asChild className="cursor-pointer rounded-md text-xs py-1.5 hover:bg-secondary">
              <Link to="/profile">
                <User className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded-md text-xs py-1.5 hover:bg-secondary">
              <Link to="/dashboard">
                <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-md text-xs text-destructive hover:bg-destructive/10 py-1.5">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function isRouteActive(pathname: string, to: string) {
  if (to === "/dashboard") return pathname === "/dashboard";
  if (to === "/topics") return pathname === "/topics" || pathname.startsWith("/topics/");
  if (to === "/problems") return pathname === "/problems" || pathname.startsWith("/arena/");
  return pathname === to;
}

export default function Sidebar() {
  const location = useLocation();
  return (
    <SidebarRoot collapsible="icon" className="border-r border-border bg-sidebar">
      {/* Brand Header */}
      <SidebarHeader className="border-b border-border p-3.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-secondary rounded-lg transition-colors">
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  <Code2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold text-foreground text-sm">
                    FORGE
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    DSA Learning Platform
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Links */}
      <SidebarContent className="px-2 py-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-2">
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => {
                  const active = isRouteActive(location.pathname, to);
                  return (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                        className={`rounded-lg transition-colors text-xs font-medium px-2.5 py-2 ${
                          active
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <Link to={to} className="flex items-center gap-2.5">
                          <Icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <UserFooter />
      </SidebarFooter>
    </SidebarRoot>
  );
}
