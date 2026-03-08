import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  ClipboardCheck,
  ShoppingCart,
  GraduationCap,
  Lightbulb,
  Building2,
  ChevronDown,
  Shield,
  Archive,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Trash2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { SettingsModal } from "@/components/settings/SettingsModal";

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
  {
    id: "sales",
    label: "Sales & Customer",
    icon: Users,
    moduleClass: "module-sales",
    path: "/module/sales"
  },
  {
    id: "operations",
    label: "Operations",
    icon: Settings,
    moduleClass: "module-operations",
    path: "/module/operations"
  },
  {
    id: "quality",
    label: "Quality & Audit",
    icon: ClipboardCheck,
    moduleClass: "module-quality",
    path: "/module/quality"
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    moduleClass: "module-procurement",
    path: "/module/procurement"
  },
  {
    id: "hr",
    label: "HR & Training",
    icon: GraduationCap,
    moduleClass: "module-hr",
    path: "/module/hr"
  },
  {
    id: "rnd",
    label: "R&D & Design",
    icon: Lightbulb,
    moduleClass: "module-rnd",
    path: "/module/rnd"
  },
  {
    id: "management",
    label: "Management",
    icon: Building2,
    moduleClass: "module-management",
    path: "/module/management"
  },
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const items: NavItem[] =
    user?.role === "admin"
      ? [
        ...navItems,
        { id: "admin", label: "Admin Accounts", icon: Shield, path: "/admin/accounts" },
      ]
      : navItems;

  if (loading) return null; // Or a skeleton

  // Auto-expand based on current route
  useEffect(() => {
    const pathModule = location.pathname.split("/module/")[1];
    if (pathModule && !expandedItems.includes(pathModule)) {
      setExpandedItems(prev => [...prev, pathModule]);
    }
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

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
    if (item.children) {
      toggleExpand(item.id);
    }

    if (item.path) {
      navigate(item.path);
      if (item.path.startsWith("/module/")) {
        onModuleChange(item.id);
      }
    }
  };

  const handleChildClick = (parentId: string, child: { code?: string }) => {
    if (child.code) {
      navigate(`/record/${encodeURIComponent(child.code)}`);
    } else {
      navigate(`/module/${parentId}`);
    }
  };

  // Determine active state from URL
  const getActiveState = (item: NavItem): boolean => {
    // Exact path match (Highest priority)
    if (item.path && location.pathname === item.path) return true;

    // Special case for dashboard
    if (item.id === "dashboard" && location.pathname === "/") return true;

    // Module URL pattern
    if (location.pathname.includes(`/module/${item.id}`)) return true;

    // Legacy fallback for manually set activeModule prop (Lowest priority)
    // Only match if we are NOT on a specific path that belongs to another item
    const isOtherPathActive = items.some(i => i.path && i.path !== item.path && location.pathname === i.path);
    if (isOtherPathActive) return false;

    return activeModule === item.id;
  };

  return (
    <aside className={cn(
      "hidden md:flex bg-sidebar/60 backdrop-blur-2xl text-sidebar-foreground flex-col h-screen md:fixed md:left-0 md:top-0 z-50 transition-all duration-300 overflow-hidden border-r border-sidebar-border/50",
      isCollapsed ? "md:w-16" : "md:w-64"
    )}>
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-sidebar-accent text-sidebar-accent-foreground rounded-full border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <PanelLeftOpen className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
      </button>

      {/* Enhanced Logo */}
      <div className="p-6 border-b border-sidebar-border/50 relative overflow-hidden">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            navigate("/");
            onModuleChange("dashboard");
          }}
        >
          <div className="w-11 h-11 bg-gradient-to-br from-primary via-primary/90 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_8px_16px_-4px_rgba(59,130,246,0.5)] group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border border-white/20">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-inner">
              <span className="text-primary font-black text-[10px] tracking-tighter">QMS</span>
            </div>
          </div>
          {!isCollapsed && (
            <div className="animate-slide-in">
              <h1 className="font-black text-xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent tracking-tighter">QMS</h1>
              <p className="text-[10px] text-sidebar-foreground/50 font-bold uppercase tracking-widest leading-none">Enterprise Suite</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map((item) => {
          const isActive = getActiveState(item);
          const isExpanded = expandedItems.includes(item.id);

          return (
            <div key={item.id} className="relative px-2">
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full shadow-[2px_0_8px_rgba(59,130,246,0.4)] animate-fade-in" />
              )}
              <button
                onClick={() => handleNavClick(item)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-300 relative group/btn",
                  isActive
                    ? "bg-primary/10 text-primary shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover/btn:scale-110", isActive && "animate-float")} />
                  {!isCollapsed && <span className={cn("font-semibold tracking-tight", isActive && "text-primary")}>{item.label}</span>}
                </div>
                {!isCollapsed && item.children && (
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-300 opacity-40",
                      isExpanded && "rotate-180 opacity-100"
                    )}
                  />
                )}
              </button>

              {/* Sub-items */}
              {!isCollapsed && item.children && isExpanded && (
                <div className="ml-8 mt-1 space-y-1 animate-fade-in">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleChildClick(item.id, child)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-colors"
                    >
                      {child.code && (
                        <span className="text-xs font-mono text-sidebar-primary">{child.code}</span>
                      )}
                      <span>{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto border-t border-sidebar-border/50 bg-sidebar-accent/30 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all relative group",
                isCollapsed && "mx-auto"
              )}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-sidebar-background animate-pulse" />
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-bold uppercase rounded border border-border opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Notifications ({unreadCount})
                </div>
              )}
            </button>

            {showNotifications && (
              <div className={cn(
                "absolute bottom-full mb-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 z-50",
                isCollapsed ? "left-full ml-2 w-72" : "left-0 w-72"
              )}>
                <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/20">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notifications</h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAll();
                      }}
                      className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-destructive underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link) navigate(n.link || "/");
                          markAsRead(n.id);
                          setShowNotifications(false);
                        }}
                        className={cn(
                          "px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                            n.type === 'archive' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                          )}>
                            {n.type === 'archive' ? <Trash2 className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold truncate text-foreground">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                          </div>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary self-center" />}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-muted-foreground/10 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No new notifications</p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    className="w-full px-4 py-2 border-t border-border text-center bg-muted/10 hover:bg-muted/20 transition-colors"
                    onClick={() => {
                      navigate('/archive');
                      setShowNotifications(false);
                    }}
                  >
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">View Archives</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              "p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all relative group",
              isCollapsed && "mx-auto"
            )}
          >
            <Settings className="w-5 h-5" />
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-bold uppercase rounded border border-border opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                Settings
              </div>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Audit Status Badge */}
          {!isCollapsed ? (
            <div className="flex-1 px-3 py-1.5 rounded-xl bg-success/5 border border-success/10 flex items-center gap-2 h-9">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-glow-pulse" />
              <span className="text-[10px] font-black text-success uppercase tracking-[0.2em]">Audit Ready</span>
            </div>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-success/5 border border-success/10 flex items-center justify-center group relative">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-glow-pulse" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-bold uppercase rounded border border-border opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                Audit Status: Active
              </div>
            </div>
          )}
        </div>

        <div className={cn("flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/50", isCollapsed && "justify-center p-2")}>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 text-primary">
            <span className="text-xs font-black">{(user?.name || "User").slice(0, 2).toUpperCase()}</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold truncate text-sidebar-foreground">{user?.name || "Guest"}</p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase font-black tracking-tighter">{user?.role || "User"}</p>
            </div>
          )}
        </div>
      </div>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </aside>
  );
}
