import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth, AppUser } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Shield, UserPlus, Loader2, Save, Mail, User, Trash2,
  CheckCircle, XCircle, Clock, Users, KeyRound, RefreshCw, Search, MoreVertical, Download, ChevronUp, ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive border-destructive/20", icon: "🛡️" },
  manager: { label: "Manager", color: "bg-primary/10 text-primary border-primary/20", icon: "📋" },
  auditor: { label: "Auditor", color: "bg-warning/10 text-warning-foreground border-warning/20", icon: "🔍" },
  user: { label: "User", color: "bg-muted text-muted-foreground border-border", icon: "👤" },
};

type SortField = "name" | "email" | "role" | "lastLoginAt";
type SortDir = "asc" | "desc";

export default function AdminAccounts() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setSidebarCollapsed(customEvent.detail);
    };
    window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
  }, []);

  const { users, addUser, updateUser, removeUser, resetPassword, user, reloadUsers } = useAuth();
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState("admin");
  const [newUser, setNewUser] = useState<{ name: string; email: string; role: AppUser["role"] }>({
    name: "", email: "", role: "user",
  });
  const [resettingPw, setResettingPw] = useState<Record<string, boolean>>({});
  const [editState, setEditState] = useState<Record<string, Partial<AppUser>>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isProtectedAdmin = (u: AppUser): boolean => {
    const isSelf = user?.id === u.id;
    const isBuiltInAdmin = u.role === "admin" && (u.email === "admin@local" || u.name.toLowerCase() === "administrator");
    return isSelf || isBuiltInAdmin;
  };

  useEffect(() => { reloadUsers(); }, [reloadUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reloadUsers();
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "User list has been updated." });
  };

  const handleAdd = () => {
    if (!newUser.name || !newUser.email) return;
    addUser({ name: newUser.name, email: newUser.email, role: newUser.role, password: "123456", active: user?.role === "admin", needsApprovalNotification: false });
    setNewUser({ name: "", email: "", role: "user" });
    toast({ title: "✅ Account Created", description: `${newUser.name} has been added successfully.` });
  };

  const handleRowEdit = (userId: string, field: keyof AppUser, value: any) => {
    setEditState(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), [field]: value } }));
  };

  const handleSave = async (u: AppUser) => {
    const updates = editState[u.id];
    if (!updates || Object.keys(updates).length === 0) {
      toast({ title: "No Changes", description: "No data was modified." });
      return;
    }
    setSavingRows(prev => ({ ...prev, [u.id]: true }));
    try {
      if (updates.password && typeof updates.password === "string" && updates.password.trim().length > 0) {
        const newPassword = updates.password.trim();
        if (newPassword.length < 6) {
          toast({ title: "❌ خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.", variant: "destructive" });
          setSavingRows(prev => ({ ...prev, [u.id]: false }));
          return;
        }
        const { data, error } = await supabase.functions.invoke("admin-update-password", {
          body: { target_user_id: u.id, new_password: newPassword },
        });
        if (error || (data && data.error)) {
          toast({ title: "❌ خطأ في تغيير كلمة المرور", description: data?.error || error?.message || "فشل", variant: "destructive" });
          setSavingRows(prev => ({ ...prev, [u.id]: false }));
          return;
        }
        toast({ title: "✅ تم تغيير كلمة المرور", description: `تم تحديث كلمة مرور ${u.name}.` });
      }
      const otherUpdates = { ...updates }; delete otherUpdates.password;
      if (Object.keys(otherUpdates).length > 0) await updateUser(u.id, otherUpdates);
      toast({ title: "✅ تم الحفظ", description: `تم تحديث بيانات ${updates.name || u.name}.` });
      setEditState(prev => { const s = { ...prev }; delete s[u.id]; return s; });
    } catch {
      toast({ title: "❌ خطأ", description: "فشل التحديث. حاول مرة أخرى.", variant: "destructive" });
    } finally {
      setSavingRows(prev => ({ ...prev, [u.id]: false }));
    }
  };

  const pendingUsers = users.filter(u => !u.active);
  const activeUsers = users.filter(u => u.active);

  const filteredUsers = useMemo(() => {
    let list = users.filter(u => {
      const matchesSearch = searchQuery === "" ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === "all" || u.role === filterRole;
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "active" && u.active) ||
        (filterStatus === "inactive" && !u.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "email") cmp = a.email.localeCompare(b.email);
      else if (sortField === "role") cmp = a.role.localeCompare(b.role);
      else if (sortField === "lastLoginAt") cmp = (a.lastLoginAt || 0) - (b.lastLoginAt || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [users, searchQuery, filterRole, filterStatus, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredUsers.map(u => u.id)));
  };

  const handleBulkActivate = async () => {
    for (const id of selectedIds) {
      const u = users.find(x => x.id === id);
      if (u && !u.active) await updateUser(id, { active: true });
    }
    setSelectedIds(new Set());
    toast({ title: "✅ تم التفعيل", description: `تم تفعيل ${selectedIds.size} حساب(ات).` });
  };

  const handleBulkDeactivate = async () => {
    for (const id of selectedIds) {
      const u = users.find(x => x.id === id);
      if (u && u.active && !isProtectedAdmin(u)) await updateUser(id, { active: false });
    }
    setSelectedIds(new Set());
    toast({ title: "تم التعطيل", description: `تم تعطيل الحسابات المحددة.` });
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status", "Last Login"];
    const rows = filteredUsers.map(u => [
      u.name, u.email, u.role,
      u.active ? "Active" : "Inactive",
      u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : "Never"
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "users_export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم التصدير", description: `تم تصدير ${filteredUsers.length} مستخدم.` });
  };

  const stats = [
    { label: "إجمالي", value: users.length, icon: Users, color: "text-primary" },
    { label: "نشط", value: activeUsers.length, icon: CheckCircle, color: "text-success" },
    { label: "معلق", value: pendingUsers.length, icon: Clock, color: "text-warning" },
    { label: "مسؤول", value: users.filter(u => u.role === "admin").length, icon: Shield, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <main className={`ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        <Header />
        <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة الحسابات</h1>
                <p className="text-sm text-muted-foreground">إدارة المستخدمين والأدوار وصلاحيات الوصول</p>
              </div>
            </div>
            <div className="flex gap-2 self-start md:self-auto">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                <Download className="w-4 h-4" /> تصدير CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} /> تحديث
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map(s => (
              <Card key={s.label} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50", s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending */}
          {pendingUsers.length > 0 && (
            <Card className="border-warning/30 bg-warning/5 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <CardTitle className="text-lg">طلبات معلقة</CardTitle>
                  <Badge variant="outline" className="ml-2 border-warning/30 text-warning bg-warning/10">{pendingUsers.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                        onClick={() => updateUser(u.id, { active: true, needsApprovalNotification: true })}>
                        <CheckCircle className="w-3.5 h-3.5" /> موافقة
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10"
                        onClick={() => { if (!isProtectedAdmin(u) && window.confirm(`حذف "${u.name}"؟`)) removeUser(u.id); }}
                        disabled={isProtectedAdmin(u)}>
                        <XCircle className="w-3.5 h-3.5" /> رفض
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add User */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">إضافة مستخدم</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">الاسم</Label>
                  <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="أدخل الاسم" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">البريد الإلكتروني</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">الدور</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as AppUser["role"] })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">🛡️ Admin</SelectItem>
                      <SelectItem value="manager">📋 Manager</SelectItem>
                      <SelectItem value="auditor">🔍 Auditor</SelectItem>
                      <SelectItem value="user">👤 User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full h-9 gap-2 font-semibold" onClick={handleAdd}>
                    <UserPlus className="w-4 h-4" /> إنشاء
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">جميع المستخدمين</CardTitle>
                  <Badge variant="secondary" className="ml-1">{filteredUsers.length}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 w-40 pl-9 text-sm" />
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأدوار</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">معطل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="px-4 md:px-6 pb-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-sm font-semibold text-primary">{selectedIds.size} محدد</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkActivate}>
                    <CheckCircle className="w-3 h-3" /> تفعيل
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={handleBulkDeactivate}>
                    <XCircle className="w-3 h-3" /> تعطيل
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>إلغاء</Button>
                </div>
              </div>
            )}

            <CardContent className="p-0">
              {/* Table Header */}
              <div className="hidden md:flex items-center gap-3 px-6 py-2 border-b border-border/30 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <div className="w-6">
                  <input type="checkbox" checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll} className="rounded border-border" />
                </div>
                <div className="w-10" />
                <button className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>
                  الاسم <SortIcon field="name" />
                </button>
                <button className="w-48 flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("email")}>
                  البريد <SortIcon field="email" />
                </button>
                <button className="w-24 flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("role")}>
                  الدور <SortIcon field="role" />
                </button>
                <button className="w-28 flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("lastLoginAt")}>
                  آخر دخول <SortIcon field="lastLoginAt" />
                </button>
                <div className="w-24" />
              </div>

              <div className="divide-y divide-border/50">
                {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">لا يوجد مستخدمون مطابقون</div>
                ) : filteredUsers.map(u => {
                  const rowEdit = editState[u.id] || {};
                  const hasChanges = Object.keys(rowEdit).length > 0;
                  const isSaving = savingRows[u.id];
                  const isExpanded = expandedUser === u.id;
                  const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
                  const currentActive = rowEdit.active !== undefined ? rowEdit.active : u.active;

                  return (
                    <div key={u.id} className={cn("transition-colors", hasChanges && "bg-primary/[0.03]", isExpanded && "bg-muted/30")}>
                      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
                        <div className="w-6 shrink-0">
                          <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded border-border" />
                        </div>
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                          u.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{u.name}</span>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold border", roleConf.color)}>
                              {roleConf.icon} {roleConf.label}
                            </Badge>
                            {!u.active && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-warning/30 text-warning bg-warning/10">معطل</Badge>}
                            {user?.id === u.id && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary bg-primary/10">أنت</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="hidden md:block text-right shrink-0 w-28">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">آخر دخول</p>
                          <p className="text-xs tabular-nums text-foreground/70">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("ar-SA", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "أبداً"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasChanges && (
                            <>
                              <Button size="sm" className="h-7 px-2.5 gap-1 text-[10px] font-bold uppercase rounded-lg"
                                onClick={() => handleSave(u)} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground"
                                onClick={() => setEditState(prev => { const s = { ...prev }; delete s[u.id]; return s; })}>إلغاء</Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Panel */}
                      {isExpanded && (
                        <div className="px-4 md:px-6 pb-4 pt-1 border-t border-border/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3" /> الاسم</Label>
                              <Input value={rowEdit.name !== undefined ? rowEdit.name : u.name} onChange={(e) => handleRowEdit(u.id, "name", e.target.value)} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> البريد</Label>
                              <Input value={rowEdit.email !== undefined ? rowEdit.email : u.email} onChange={(e) => handleRowEdit(u.id, "email", e.target.value)} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Shield className="w-3 h-3" /> الدور</Label>
                              <Select value={rowEdit.role !== undefined ? rowEdit.role : u.role} onValueChange={(v) => handleRowEdit(u.id, "role", v as AppUser["role"])}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">🛡️ Admin</SelectItem>
                                  <SelectItem value="manager">📋 Manager</SelectItem>
                                  <SelectItem value="auditor">🔍 Auditor</SelectItem>
                                  <SelectItem value="user">👤 User</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><KeyRound className="w-3 h-3" /> كلمة مرور جديدة</Label>
                              <Input type="password" placeholder="أدخل كلمة مرور جديدة" value={rowEdit.password !== undefined ? rowEdit.password : ""} onChange={(e) => handleRowEdit(u.id, "password", e.target.value)} className="h-9 text-sm" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-border/30">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Switch checked={currentActive} onCheckedChange={(v) => handleRowEdit(u.id, "active", v)} className="scale-90" />
                                <span className={cn("text-xs font-semibold", currentActive ? "text-success" : "text-muted-foreground")}>
                                  {currentActive ? "نشط" : "معطل"}
                                </span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                                onClick={async () => {
                                  if (window.confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${u.email}؟`)) {
                                    setResettingPw(prev => ({ ...prev, [u.id]: true }));
                                    const res = await resetPassword(u.email);
                                    setResettingPw(prev => ({ ...prev, [u.id]: false }));
                                    toast({ title: res.ok ? "✅ تم الإرسال" : "❌ خطأ", description: res.message, variant: res.ok ? "default" : "destructive" });
                                  }
                                }} disabled={resettingPw[u.id]}>
                                {resettingPw[u.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} إرسال رابط
                              </Button>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => { if (!isProtectedAdmin(u) && window.confirm(`حذف "${u.name}"؟`)) removeUser(u.id); }}
                              disabled={isProtectedAdmin(u)}>
                              <Trash2 className="w-3 h-3" /> حذف الحساب
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  );
}
