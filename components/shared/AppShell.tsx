"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Repeat2,
  Zap,
  Bot,
  Upload,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brain,
  Bell,
  Search,
  User,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",     icon: LayoutDashboard, badge: null },
  { label: "Transactions",  href: "/transactions",  icon: CreditCard,      badge: null },
  { label: "Subscriptions", href: "/subscriptions", icon: Repeat2,         badge: "3"  },
  { label: "Money Leaks",   href: "/leaks",         icon: Zap,             badge: "5"  },
  { label: "AI Assistant",  href: "/assistant",     icon: Bot,             badge: null },
  { label: "Import Data",   href: "/imports",       icon: Upload,          badge: null },
  { label: "Insights",      href: "/insights",      icon: Lightbulb,       badge: "2"  },
  { label: "Settings",      href: "/settings",      icon: Settings,        badge: null },
] as const;

// ─── Helper ───────────────────────────────────────────────────────────────────
function initials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
}

// ─── Sidebar nav link ─────────────────────────────────────────────────────────
function NavLink({
  item,
  collapsed,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <Badge
              variant="secondary"
              className="h-4 min-w-4 px-1 text-[10px] font-semibold bg-primary/15 text-primary border-0"
            >
              {item.badge}
            </Badge>
          )}
        </>
      )}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-primary" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
          {item.badge && (
            <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-primary/15 text-primary border-0">
              {item.badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  session,
}: {
  collapsed: boolean;
  session: Session;
}) {
  const pathname = usePathname();
  const { user } = session;
  const userInitials = initials(user.name, user.email);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-3 border-b border-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-[15px] tracking-tight">
            BillBrain<span className="text-primary"> AI</span>
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <NavLink key={item.href} item={item} collapsed={collapsed} active={active} />
          );
        })}
      </nav>

      {/* User menu */}
      <div className="p-2 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface-3",
                  collapsed && "justify-center"
                )}
              />
            }
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user.name ?? "User"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pb-1.5">
              Signed in as
              <p className="font-semibold text-foreground mt-0.5 text-[13px]">
                {user.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <User className="mr-2 h-3.5 w-3.5" />
              Profile &amp; Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
// ─── Command palette (search / quick-jump) ─────────────────────────────────────
function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const filtered = NAV_ITEMS.filter((i) =>
    i.label.toLowerCase().includes(q.trim().toLowerCase())
  );

  function go(href?: string) {
    if (!href) return;
    onOpenChange(false);
    setQ("");
    router.push(href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQ("");
      }}
    >
      <DialogContent showCloseButton={false} className="p-0 gap-0 overflow-hidden max-w-lg">
        <DialogTitle className="sr-only">Search and jump to a page</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") go(filtered[0]?.href);
            }}
            placeholder="Jump to a page…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            esc
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No pages match “{q}”.
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-surface-3 transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Topbar({
  collapsed,
  onToggle,
  session,
}: {
  collapsed: boolean;
  onToggle: () => void;
  session: Session;
}) {
  const pathname = usePathname();
  const { user } = session;
  const currentPage = NAV_ITEMS.find(
    (n) =>
      pathname === n.href ||
      (n.href !== "/dashboard" && pathname.startsWith(n.href))
  );
  const userInitials = initials(user.name, user.email);

  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4">
      {/* Sidebar toggle (desktop) */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-7 w-7 text-muted-foreground"
            />
          }
        >
          <Brain className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[220px] p-0 bg-sidebar border-r border-border"
          showCloseButton={false}
        >
          <Sidebar collapsed={false} session={session} />
        </SheetContent>
      </Sheet>

      {/* Page breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {currentPage && (
          <>
            <currentPage.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">
              {currentPage.label}
            </span>
          </>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Search / quick-jump (⌘K) */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search and jump to a page"
          className="hidden sm:flex h-8 items-center gap-2 rounded-lg px-2.5 text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <span className="text-xs">Jump to…</span>
          <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="sm:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications → quick links to the real alert pages */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="Alerts"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
              />
            }
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Where your alerts live
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/leaks" />}>
              <Zap className="mr-2 h-3.5 w-3.5" />
              Money Leaks
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/insights" />}>
              <Lightbulb className="mr-2 h-3.5 w-3.5" />
              Insights
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Account menu — Settings + Sign out */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="Account menu"
                className="rounded-full outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <Avatar className="h-7 w-7 ring-1 ring-border hover:ring-primary/40 transition-all">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground pb-1.5">
              Signed in as
              <p className="font-semibold text-foreground mt-0.5 text-[13px] truncate">
                {user.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <User className="mr-2 h-3.5 w-3.5" />
              Profile &amp; Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

const BOTTOM_NAV = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: CreditCard },
  { label: "AI",           href: "/assistant",    icon: Bot },
  { label: "Insights",     href: "/insights",     icon: Lightbulb },
] as const;

function BottomNav({ session }: { session: Session }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur-sm safe-area-inset-bottom">
      <div className="flex items-stretch">
        {BOTTOM_NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
        {/* "More" opens full sidebar sheet */}
        <Sheet>
          <SheetTrigger
            render={
              <button
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              />
            }
          >
            <Settings className="h-5 w-5" />
            More
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[240px] p-0 bg-sidebar border-r border-border"
            showCloseButton={false}
          >
            <Sidebar collapsed={false} session={session} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode;
  session: Session;
}

export function AppShell({ children, session }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex">
        <Sidebar collapsed={collapsed} session={session} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          session={session}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav session={session} />
    </div>
  );
}
