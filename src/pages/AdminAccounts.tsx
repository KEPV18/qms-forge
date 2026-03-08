import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth, AppUser } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, UserPlus, KeyRound, Loader2, Save, Mail, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function AdminAccounts() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

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
    name: "",
    email: "",
    role: "user",
  });
  const [resettingPw, setResettingPw] = useState<Record<string, boolean>>({});
  const [editState, setEditState] = useState<Record<string, Partial<AppUser>>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});

  const isProtectedAdmin = (u: AppUser): boolean => {
    const isSelf = user?.id === u.id;
    const isBuiltInAdmin = u.role === "admin" && (u.email === "admin@local" || u.name.toLowerCase() === "administrator");
    return isSelf || isBuiltInAdmin;
  };

  useEffect(() => {
    reloadUsers();
  }, [reloadUsers]);

  const handleAdd = () => {
    if (!newUser.name || !newUser.email) return;
    addUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      password: "123456",
      active: user?.role === "admin",
      needsApprovalNotification: false
    });
    setNewUser({ name: "", email: "", role: "user" });
  };

  const handleRowEdit = (userId: string, field: keyof AppUser, value: any) => {
    setEditState(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = async (u: AppUser) => {
    const updates = editState[u.id];
    if (!updates || Object.keys(updates).length === 0) {
      toast({ title: "لا يوجد تغييرات", description: "لم يتم تعديل أي بيانات لهذا المستخدم." });
      return;
    }

    setSavingRows(prev => ({ ...prev, [u.id]: true }));
    try {
      // Handle password change via Edge Function
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
          const msg = data?.error || error?.message || "فشل تغيير كلمة المرور";
          toast({ title: "❌ خطأ في تغيير كلمة المرور", description: msg, variant: "destructive" });
          setSavingRows(prev => ({ ...prev, [u.id]: false }));
          return;
        }

        toast({ title: "✅ تم تغيير كلمة المرور", description: `تم تحديث كلمة مرور ${u.name} بنجاح.` });
      }

      // Handle other updates (name, email, role, active)
      const otherUpdates = { ...updates };
      delete otherUpdates.password;

      if (Object.keys(otherUpdates).length > 0) {
        await updateUser(u.id, otherUpdates);
      }

      toast({
        title: "✅ تم الحفظ بنجاح",
        description: `تم تحديث بيانات ${updates.name || u.name} في قاعدة البيانات.`,
      });
      setEditState(prev => {
        const newState = { ...prev };
        delete newState[u.id];
        return newState;
      });
    } catch (err) {
      toast({
        title: "❌ خطأ في الحفظ",
        description: "فشل تحديث البيانات في قاعدة البيانات. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setSavingRows(prev => ({ ...prev, [u.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <main className={`ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        <Header />
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-4 animate-fade-in group">
            <div className="w-12 h-12 rounded-xl bg-foreground/10 flex items-center justify-center shadow-lg border border-foreground/10 transition-all group-hover:scale-110">
              <Shield className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-heading">Accounts Administration</h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">Monitor users, assign roles, and manage activation</p>
            </div>
          </div>

          <Card className="glass-card border-border/50 shadow-2xl overflow-hidden rounded-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl opacity-20" />
            <CardHeader className="relative z-10">
              <CardTitle className="font-heading font-bold">Pending Approvals</CardTitle>
              <CardDescription>Approve or reject new accounts</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/50">
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Email</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(u => !u.active).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic text-xs">No pending approvals</TableCell>
                    </TableRow>
                  ) : users.filter(u => !u.active).map(u => (
                    <TableRow key={u.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="font-bold">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" className="rounded-xl h-8 text-xs font-bold" onClick={() => updateUser(u.id, { active: true, needsApprovalNotification: true })}>Approve</Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-xl h-8 text-xs font-bold"
                          onClick={() => {
                            if (isProtectedAdmin(u)) return;
                            if (window.confirm(`هل تريد حذف الحساب "${u.name}"؟`)) removeUser(u.id);
                          }}
                          disabled={isProtectedAdmin(u)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50 shadow-2xl overflow-hidden rounded-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl opacity-20" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 font-heading font-bold text-xl"><UserPlus className="w-5 h-5 text-primary" /> Add User</CardTitle>
              <CardDescription>Create a new account and set role</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10 pb-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</Label>
                <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</Label>
                <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as AppUser["role"] })}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full rounded-xl h-10 font-bold shadow-lg shadow-primary/20" onClick={handleAdd}>Create Account</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50 shadow-2xl overflow-hidden rounded-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl opacity-20" />
            <CardHeader className="relative z-10">
              <CardTitle className="font-heading font-bold">Users List</CardTitle>
              <CardDescription>Edit user details and save changes to database</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/50">
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">User Profile</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Role & Access</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Password Management</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Last Activity</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => {
                    const rowEdit = editState[u.id] || {};
                    const currentName = rowEdit.name !== undefined ? rowEdit.name : u.name;
                    const currentEmail = rowEdit.email !== undefined ? rowEdit.email : u.email;
                    const currentRole = rowEdit.role !== undefined ? rowEdit.role : u.role;
                    const currentActive = rowEdit.active !== undefined ? rowEdit.active : u.active;
                    const isSaving = savingRows[u.id];
                    const hasChanges = Object.keys(rowEdit).length > 0;

                    return (
                      <TableRow key={u.id} className={cn("hover:bg-primary/5 transition-colors", hasChanges ? "bg-primary/5" : "")}>
                        <TableCell>
                          <div className="space-y-3 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground opacity-40" />
                              <Input
                                value={currentName}
                                onChange={(e) => handleRowEdit(u.id, "name", e.target.value)}
                                className="h-8 text-sm rounded-lg bg-background/50 border-border/50"
                                placeholder="Display Name"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground opacity-40" />
                              <Input
                                value={currentEmail}
                                onChange={(e) => handleRowEdit(u.id, "email", e.target.value)}
                                className="h-8 text-sm rounded-lg bg-background/50 border-border/50"
                                placeholder="Email Address"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-3">
                            <Select
                              value={currentRole}
                              onValueChange={(v) => handleRowEdit(u.id, "role", v as AppUser["role"])}
                            >
                              <SelectTrigger className="w-32 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-background/50 border-border/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="auditor">Auditor</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground opacity-60">Status</span>
                              <Switch
                                checked={currentActive}
                                onCheckedChange={(v) => handleRowEdit(u.id, "active", v)}
                                className="scale-75"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="password"
                              placeholder="New password"
                              className="w-40 h-8 text-[10px] font-mono rounded-lg bg-background/50 border-border/50"
                              value={rowEdit.password !== undefined ? rowEdit.password : ""}
                              onChange={(e) => handleRowEdit(u.id, "password", e.target.value)}
                            />
                            {!rowEdit.password && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                title="Send Reset Link"
                                onClick={async () => {
                                  if (window.confirm(`ارسال رابط تعيين كلمة المرور إلى ${u.email}؟`)) {
                                    setResettingPw(prev => ({ ...prev, [u.id]: true }));
                                    const res = await resetPassword(u.email);
                                    setResettingPw(prev => ({ ...prev, [u.id]: false }));
                                    toast({
                                      title: res.ok ? "✅ تم إرسال رابط" : "❌ خطأ",
                                      description: res.message,
                                      variant: res.ok ? "default" : "destructive",
                                    });
                                  }
                                }}
                                disabled={resettingPw[u.id]}
                              >
                                {resettingPw[u.id] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4 opacity-60" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter tabular-nums">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hasChanges && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted"
                                onClick={() => {
                                  setEditState(prev => {
                                    const newState = { ...prev };
                                    delete newState[u.id];
                                    return newState;
                                  });
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={hasChanges ? "default" : "outline"}
                              className={cn("h-8 px-3 gap-1.5 rounded-xl transition-all", hasChanges ? "shadow-lg shadow-primary/20" : "")}
                              onClick={() => handleSave(u)}
                              disabled={isSaving || !hasChanges}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              <span className="text-[10px] font-bold uppercase tracking-widest">Save</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => {
                                if (isProtectedAdmin(u)) return;
                                if (window.confirm(`هل تريد حذف الحساب "${u.name}"؟`)) removeUser(u.id);
                              }}
                              disabled={isProtectedAdmin(u) || isSaving}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
