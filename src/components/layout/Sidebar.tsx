import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Settings, ClipboardCheck, ShoppingCart,
  GraduationCap, Lightbulb, Building2, ChevronRight, Shield, Archive,
  AlertTriangle, PanelLeftClose, PanelLeftOpen, Bell, Trash2, LogOut, Menu, X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { SettingsModal } from "@/components/settings/SettingsModal";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  moduleClass?: string;
  path?: string;
  children?: { id: string; label: string; code?: string }[];
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "sales", label: "Sales & Customer", icon: Users, moduleClass: "module-sales", path: "/module/sales" },
  { id: "operations", label: "Operations", icon: Settings, moduleClass: "module-operations", path: "/module/operations" },
  { id: "quality", label: "Quality & Audit", icon: ClipboardCheck, moduleClass: "module-quality", path: "/module/quality" },
  { id: "procurement", label: "Procurement", icon: ShoppingCart, moduleClass: "module-procurement", path: "/module/procurement" },
  { id: "hr", label: "HR & Training", icon: GraduationCap, moduleClass: "module-hr", path: "/module/hr" },
  { id: "rnd", label: "R&D & Design", icon: Lightbulb, moduleClass: "module-rnd", path: "/module/rnd" },
  { id: "management", label: "Management", icon: Building2, moduleClass: "module-management", path: "/module/management" },
  { id: "risk", label: "Risk & Process", icon: AlertTriangle, path: "/risk-management" },
  { id: "archive", label: "Record Archive", icon: Archive, path: "/archive" },
];

interface SidebarProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user, logout, loading } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();

  useEffect(() => {
    const pathModule = location.pathname.split("/module/")[1];
    if (pathModule && !expandedItems.includes(pathModule)) {
      setExpandedItems(prev => [...prev, pathModule]);
    }
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const items: NavItem[] =
    user?.role === "admin"
      ? [...navItems, { id: "admin", label: "Admin Accounts", icon: Shield, path: "/admin/accounts" }]
      : navItems;

  if (loading) return null;

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    window.dispatchEvent(new CustomEvent('qms-sidebar-toggle', { detail: next }));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleNavClick = (item: NavItem) => {
    if (item.children) toggleExpand(item.id);
    if (item.path) {
      navigate(item.path);
      if (item.path.startsWith("/module/")) onModuleChange(item.id);
    }
  };

  const handleChildClick = (parentId: string, child: { code?: string }) => {
    if (child.code) {
      navigate(`/record/${encodeURIComponent(child.code)}`);
    } else {
      navigate(`/module/${parentId}`);
    }
  };

  const getActiveState = (item: NavItem): boolean => {
    if (item.path && location.pathname === item.path) return true;
    if (item.id === "dashboard" && location.pathname === "/") return true;
    if (location.pathname.includes(`/module/${item.id}`)) return true;
    const isOtherPathActive = items.some(i => i.path && i.path !== item.path && location.pathname === i.path);
    if (isOtherPathActive) return false;
    return activeModule === item.id;
  };

  const NavItemButton = ({ item }: { item: NavItem }) => {
    const isActive = getActiveState(item);
    const isExpanded = expandedItems.includes(item.id);
    const Icon = item.icon;

    const button = (
      <div className="relative">
        {isActive && (
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-full" />
        )}
        <button
          onClick={() => handleNavClick(item)}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg text-sm transition-all duration-200 relative",
            isCollapsed && !isMobileOpen ? "justify-center p-2.5 mx-auto" : "px-3 py-2",
            isActive
              ? "bg-primary/10 text-primary font-semibold"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          )}
        >
          <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-primary")} />
          {(!isCollapsed || isMobileOpen) && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.children && (
                <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-90")} />
              )}
            </>
          )}
        </button>

        {(!isCollapsed || isMobileOpen) && item.children && isExpanded && (
          <div className="ml-7 mt-0.5 space-y-0.5 border-l-2 border-border/50 pl-3">
            {item.children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildClick(item.id, child)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
              >
                {child.code && <span className="font-mono text-[10px] text-primary/70">{child.code}</span>}
                <span className="truncate">{child.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );

    if (isCollapsed && !isMobileOpen) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Header / Logo */}
      <div className={cn("flex items-center border-b border-sidebar-border/60", isCollapsed && !isMobile ? "justify-center px-2 py-4" : "px-4 py-4 gap-3")}>
        <div
          className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
          onClick={() => { navigate("/"); onModuleChange("dashboard"); }}
        >
          <span className="text-primary-foreground font-black text-[10px]">QMS</span>
        </div>
        {(!isCollapsed || isMobile) && (
          <div className="min-w-0" onClick={() => { navigate("/"); onModuleChange("dashboard"); }}>
            <h1 className="font-bold text-sm text-sidebar-foreground truncate cursor-pointer">QMS Suite</h1>
            <p className="text-[9px] text-sidebar-foreground/40 font-medium uppercase tracking-wider">Enterprise</p>
          </div>
        )}
        {(!isCollapsed || isMobile) && !isMobile && (
          <button onClick={toggleSidebar} className="ml-auto p-1 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        {isMobile && (
          <button onClick={() => setIsMobileOpen(false)} className="ml-auto p-1 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Collapsed toggle (desktop only) */}
      {isCollapsed && !isMobile && (
        <div className="flex justify-center py-2 border-b border-sidebar-border/40">
          <button onClick={toggleSidebar} className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-3 space-y-0.5", isCollapsed && !isMobile ? "px-1.5" : "px-2")}>
        {items.map((item) => (
          <NavItemButton key={item.id} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-sidebar-border/60", isCollapsed && !isMobile ? "p-1.5 space-y-1" : "p-3 space-y-2")}>
        <div className={cn("flex items-center", isCollapsed && !isMobile ? "flex-col gap-1" : "gap-1")}>
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && !isMobile && (
                <TooltipContent side="right" sideOffset={8} className="text-xs">
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </TooltipContent>
              )}
            </Tooltip>

            {showNotifications && (
              <div className={cn(
                "absolute bottom-full mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 w-72",
                isCollapsed && !isMobile ? "left-full ml-2" : "left-0"
              )}>
                <div className="px-3 py-2.5 border-b border-border flex justify-between items-center bg-muted/30">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notifications</h3>
                  {notifications.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); clearAll(); }} className="text-[9px] font-semibold text-muted-foreground hover:text-destructive">
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { if (n.link) navigate(n.link); markAsRead(n.id); setShowNotifications(false); }}
                      className={cn("px-3 py-2.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/20 transition-colors", !n.read && "bg-primary/5")}
                    >
                      <div className="flex gap-2.5">
                        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", n.type === 'archive' ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}>
                          {n.type === 'archive' ? <Trash2 className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate">{n.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{n.message}</p>
                        </div>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary self-center flex-shrink-0" />}
                      </div>
                    </div>
                  )) : (
                    <div className="p-6 text-center">
                      <Bell className="w-6 h-6 text-muted-foreground/20 mx-auto mb-1.5" />
                      <p className="text-[10px] text-muted-foreground">No notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            {isCollapsed && !isMobile && (
              <TooltipContent side="right" sideOffset={8} className="text-xs">Settings</TooltipContent>
            )}
          </Tooltip>

          {/* Logout */}
          {(!isCollapsed || isMobile) && (
            <button
              onClick={logout}
              className="p-2 rounded-lg text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Audit status */}
        {(!isCollapsed || isMobile) ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-success/5 border border-success/15">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-bold text-success uppercase tracking-wider">Audit Ready</span>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="mx-auto w-8 h-8 rounded-lg bg-success/5 border border-success/15 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">Audit Ready</TooltipContent>
          </Tooltip>
        )}

        {/* User profile */}
        <div className={cn(
          "flex items-center rounded-lg bg-sidebar-accent/40 border border-sidebar-border/40",
          isCollapsed && !isMobile ? "justify-center p-1.5" : "gap-2.5 px-2.5 py-2"
        )}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 border border-primary/20">
                <span className="text-[10px] font-bold text-primary">{userInitials}</span>
              </div>
            </TooltipTrigger>
            {isCollapsed && !isMobile && (
              <TooltipContent side="right" sideOffset={8} className="text-xs">
                <p className="font-semibold">{user?.name || "Guest"}</p>
                <p className="text-muted-foreground capitalize">{user?.role}</p>
              </TooltipContent>
            )}
          </Tooltip>
          {(!isCollapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate text-sidebar-foreground">{user?.name || "Guest"}</p>
              <p className="text-[9px] text-sidebar-foreground/40 font-medium uppercase tracking-wider capitalize">{user?.role || "user"}</p>
            </div>
          )}
        </div>
      </div>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );

  return (
    <TooltipProvider>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={cn(
        "md:hidden fixed left-0 top-0 h-screen z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 bg-sidebar border-r border-sidebar-border",
        isCollapsed ? "w-[60px]" : "w-60"
      )}>
        {sidebarContent(false)}
      </aside>
    </TooltipProvider>
  );
}
