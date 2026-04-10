import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Settings, ClipboardCheck, ShoppingCart,
  GraduationCap, Lightbulb, Building2, ChevronRight, Shield, Archive,
  AlertTriangle, PanelLeftClose, PanelLeftOpen, LogOut, Menu, X,
  Layers, Wrench, Activity, BookOpen, FileCheck, Briefcase
} from "lucide-react";
import { useQMSData } from "@/hooks/useQMSData";
import type { FileReview } from "@/lib/googleSheets";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import qmsLogo from "@/assets/qms-logo.png";
import logoImg from "@/assets/logo.png";
import { SettingsModal } from "@/components/settings/SettingsModal";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggleCompact } from "@/components/ui/ThemeToggle";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  moduleClass?: string;
  path?: string;
  children?: { id: string; label: string; code?: string }[];
}

const moduleItems: NavItem[] = [
  { id: "sales", label: "Sales & Customer", icon: Users, moduleClass: "module-sales", path: "/module/sales" },
  { id: "operations", label: "Operations", icon: Settings, moduleClass: "module-operations", path: "/module/operations" },
  { id: "quality", label: "Quality & Audit", icon: ClipboardCheck, moduleClass: "module-quality", path: "/module/quality" },
  { id: "procurement", label: "Procurement", icon: ShoppingCart, moduleClass: "module-procurement", path: "/module/procurement" },
  { id: "hr", label: "HR & Training", icon: GraduationCap, moduleClass: "module-hr", path: "/module/hr" },
  { id: "rnd", label: "R&D & Design", icon: Lightbulb, moduleClass: "module-rnd", path: "/module/rnd" },
  { id: "management", label: "Management", icon: Building2, moduleClass: "module-management", path: "/module/management" },
];

const toolItems: NavItem[] = [
  { id: "iso-manual", label: "ISO 9001 Manual", icon: FileCheck, path: "/iso-manual" },
  { id: "procedures", label: "Procedures", icon: BookOpen, path: "/procedures" },
  { id: "risk", label: "Risk & Process", icon: AlertTriangle, path: "/risk-management" },
  { id: "activity", label: "Activity Log", icon: Activity, path: "/activity" },
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const { data: records } = useQMSData();

  const projects = useMemo(() => {
    if (!records) return [];
    const projs = new Set<string>();
    records.forEach(r => {
      if (r.fileReviews && r.files) {
        const existingFileIds = new Set(r.files.map(f => f.id));
        Object.entries(r.fileReviews).forEach(([fileId, review]: [string, FileReview]) => {
          if (!existingFileIds.has(fileId)) return;
          const name = (review.project === "General / All Company" || !review.project) ? "General" : review.project;
          projs.add(name);
        });
      }
    });
    return Array.from(projs).sort();
  }, [records]);

  useEffect(() => {
    const pathModule = location.pathname.split("/module/")[1];
    if (pathModule && !expandedItems.includes(pathModule)) {
      setExpandedItems(prev => [...prev, pathModule]);
    }
  }, [location.pathname, expandedItems]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const adminItem: NavItem = { id: "admin", label: "Admin Panel", icon: Shield, path: "/admin/accounts" };

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
      if (item.path.startsWith("/audit?project=")) onModuleChange("quality");
    }
  };

  const handleChildClick = (parentId: string, child: { id: string, label: string; code?: string }) => {
    if (parentId === "projects-all" && child.code) {
      navigate(`/project/${encodeURIComponent(child.code)}`);
      onModuleChange("projects-all");
    } else if (child.code) {
      navigate(`/record/${encodeURIComponent(child.code)}`);
    } else {
      navigate(`/module/${parentId}`);
    }
  };

  const getActiveState = (item: NavItem): boolean => {
    if (item.path && location.pathname === item.path) return true;
    if (item.id === "dashboard" && location.pathname === "/") return true;
    if (location.pathname.includes(`/module/${item.id}`)) return true;
    return false;
  };

  const collapsed = isCollapsed && !isMobileOpen;

  const NavItemButton = ({ item }: { item: NavItem }) => {
    const isActive = getActiveState(item);
    const isExpanded = expandedItems.includes(item.id);
    const Icon = item.icon;

    const button = (
      <div className="relative">
        <button
          onClick={() => handleNavClick(item)}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl text-[13px] transition-all duration-200 relative group",
            collapsed ? "justify-center p-2.5 mx-auto" : "px-3 py-2.5",
            isActive
              ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-sidebar-primary font-semibold shadow-sm shadow-sidebar-primary/10"
              : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/80"
          )}
        >
          {isActive && !collapsed && (
            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gradient-to-b from-sidebar-primary to-sidebar-primary/50 rounded-full" />
          )}
          <Icon className={cn(
            "w-[18px] h-[18px] flex-shrink-0 transition-all duration-200",
            isActive ? "text-sidebar-primary drop-shadow-[0_0_6px_hsl(var(--sidebar-primary)/0.4)]" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
          )} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.children && (
                <ChevronRight className={cn("w-3 h-3 text-sidebar-foreground/30 transition-transform duration-200", isExpanded && "rotate-90")} />
              )}
            </>
          )}
        </button>

        {!collapsed && item.children && isExpanded && (
          <div className="ml-7 mt-0.5 space-y-0.5 border-l-2 border-sidebar-primary/15 pl-3">
            {item.children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildClick(item.id, child)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150"
              >
                {child.code && <span className="font-mono text-[10px] text-sidebar-primary/70">{child.code}</span>}
                <span className="truncate">{child.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );

    if (collapsed) {
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

  const SectionLabel = ({ icon: SIcon, label }: { icon: React.ElementType; label: string }) => {
    if (collapsed) return <div className="my-3 mx-3 border-t border-sidebar-border/20" />;
    return (
      <div className="flex items-center gap-2 px-3 pt-6 pb-2">
        <SIcon className="w-3.5 h-3.5 text-sidebar-primary/30" />
        <span className="text-[10px] font-bold text-sidebar-foreground/25 uppercase tracking-[0.15em]">{label}</span>
      </div>
    );
  };

  const userInitials = (user?.name || "U").slice(0, 2).toUpperCase();

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Header */}
      <div className={cn("flex items-center border-b border-sidebar-border/20", collapsed ? "justify-center px-2 py-5" : "px-5 py-5 gap-3")}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 flex-shrink-0 overflow-hidden shadow-lg shadow-sidebar-primary/10"
          onClick={() => { navigate("/"); onModuleChange("dashboard"); }}
        >
          <img src={qmsLogo} alt="QMS Logo" className="w-10 h-10 object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1" onClick={() => { navigate("/"); onModuleChange("dashboard"); }}>
            <h1 className="font-bold text-sm text-sidebar-foreground cursor-pointer tracking-tight">QMS Suite</h1>
            <p className="text-[9px] text-sidebar-primary/40 font-bold uppercase tracking-[0.2em]">ISO 9001:2015</p>
          </div>
        )}
        {!collapsed && !isMobile && (
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-sidebar-foreground/20 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        {isMobile && (
          <button onClick={() => setIsMobileOpen(false)} className="ml-auto p-1.5 rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center py-3">
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-sidebar-foreground/20 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto", collapsed ? "px-1.5 py-2" : "px-3 py-1")}>
        <NavItemButton item={{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" }} />

        <SectionLabel icon={Layers} label="Modules" />
        <div className="space-y-0.5">
          {moduleItems.map(item => <NavItemButton key={item.id} item={item} />)}
        </div>

        {projects.length > 0 && (
          <>
            <SectionLabel icon={Briefcase} label="Projects" />
            <div className="space-y-0.5 px-0.5">
              <NavItemButton 
                item={{ 
                  id: "projects-all", 
                  label: "All Projects", 
                  icon: Briefcase,
                  path: "/projects",
                  children: projects.map(p => ({ 
                    id: `proj-${p}`, 
                    label: p,
                    code: p // using code field to store project name for handling
                  })) 
                }} 
              />
            </div>
          </>
        )}

        <SectionLabel icon={Wrench} label="Tools" />
        <div className="space-y-0.5">
          {toolItems.map(item => <NavItemButton key={item.id} item={item} />)}
        </div>

        {user?.role === "admin" && (
          <>
            <SectionLabel icon={Shield} label="Admin" />
            <NavItemButton item={adminItem} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-sidebar-border/20", collapsed ? "p-2" : "p-4 space-y-3")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-1")}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" sideOffset={8} className="text-xs">Settings</TooltipContent>}
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <ThemeToggleCompact />
              </div>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" sideOffset={8} className="text-xs">Theme</TooltipContent>}
          </Tooltip>

          {!collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-sidebar-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 ml-auto"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Sign Out</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* User card */}
        <div className={cn(
          "flex items-center rounded-xl transition-all duration-200",
          collapsed ? "justify-center p-2 bg-sidebar-accent/50" : "gap-3 px-3 py-3 bg-gradient-to-r from-sidebar-accent/80 to-sidebar-accent/40 border border-sidebar-border/20"
        )}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sidebar-primary/40 to-sidebar-primary/15 flex items-center justify-center flex-shrink-0 border border-sidebar-primary/20 shadow-sm shadow-sidebar-primary/10">
                <span className="text-[11px] font-bold text-sidebar-primary">{userInitials}</span>
              </div>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8} className="text-xs">
                <p className="font-semibold">{user?.name || "Guest"}</p>
                <p className="text-muted-foreground capitalize">{user?.role}</p>
              </TooltipContent>
            )}
          </Tooltip>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate text-sidebar-foreground">{user?.name || "Guest"}</p>
              <p className="text-[10px] text-sidebar-foreground/30 font-semibold capitalize">{user?.role || "user"}</p>
            </div>
          )}
        </div>

        {/* Vezloo Branding Badge */}
        {!collapsed && (
          <div className="mt-4 p-3 rounded-xl bg-sidebar-primary/5 border border-sidebar-primary/10 flex items-center gap-3 animate-fade-in group/brand uppercase">
            <div className="w-8 h-8 rounded-lg bg-white p-1.5 shadow-sm border border-sidebar-border/50 group-hover/brand:scale-110 transition-transform duration-300">
               <img src={logoImg} alt="Vezloo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-[10px] text-sidebar-foreground/30 font-bold uppercase tracking-wider leading-tight">Founded by</p>
              <p className="text-[12px] font-black text-sidebar-primary tracking-tight leading-tight">Vezloo Group</p>
            </div>
          </div>
        )}
      </div>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );

  return (
    <TooltipProvider>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-lg hover:bg-muted transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={cn(
        "md:hidden fixed left-0 top-0 h-screen z-50 w-80 glass-dark rounded-3xl shadow-2xl border-r border-sidebar-border/30 flex flex-col transition-transform duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent(true)}
      </aside>

      <aside className={cn(
        "hidden md:flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 glass-dark rounded-3xl shadow-2xl border-r border-sidebar-border/30",
        isCollapsed ? "w-[60px]" : "w-60"
      )}>
        {sidebarContent(false)}
      </aside>
    </TooltipProvider>
  );
}
