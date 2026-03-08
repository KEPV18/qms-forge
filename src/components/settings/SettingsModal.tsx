import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Shield, Server, User, Loader2, RefreshCw, LogOut, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { checkDriveWritePermission } from "@/lib/driveService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, logout, changePassword, updateUser } = useAuth();
    const [driveStatus, setDriveStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [driveMessage, setDriveMessage] = useState("");
    const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [displayName, setDisplayName] = useState(user?.name || "");
    const [isEditingName, setIsEditingName] = useState(false);
    const [accentColor, setAccentColor] = useState(localStorage.getItem('accentColor') || 'blue');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

    // Sync displayName when user.name changes externally (e.g., admin update, profile refetch)
    useEffect(() => {
        if (user?.name) setDisplayName(user.name);
    }, [user?.name]);

    useEffect(() => {
        // Check local storage or system preference
        const isDark = localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setIsDarkMode(isDark);
        if (isDark) {
            document.documentElement.classList.add('dark');
        }

        // Load accent color
        const savedAccent = localStorage.getItem('accentColor') || 'blue';
        setAccentColor(savedAccent);
        document.documentElement.setAttribute('data-accent', savedAccent);
    }, []);

    const toggleDarkMode = (checked: boolean) => {
        setIsDarkMode(checked);
        if (checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleCheckDrive = async () => {
        setDriveStatus('checking');
        setDriveMessage("");
        try {
            const result = await checkDriveWritePermission();
            if (result.success) {
                setDriveStatus('success');
                setDriveMessage(result.message);
                toast({ title: "Drive Permission Verified", description: "Read/Write access confirmed.", className: "bg-success text-success-foreground" });
            } else {
                setDriveStatus('error');
                setDriveMessage(result.message);
                toast({ title: "Drive Permission Failed", description: result.message, variant: "destructive" });
            }
        } catch (error) {
            setDriveStatus('error');
            setDriveMessage("An unexpected error occurred.");
        }
    };
    const handleGoogleSignIn = () => {
        const isDev = import.meta.env.DEV;
        const url = isDev ? "http://localhost:3001/api/auth" : "/api/auth";
        window.location.href = url;
    };

    const handleCheckServer = async () => {
        setServerStatus('checking');
        // Simple ping to backend if available, or just verify auth endpoint
        try {
            // For now, checks if we can hit the auth endpoint which should be up
            const response = await fetch('/api/auth?health=true');
            if (response.ok) {
                setServerStatus('online');
                toast({ title: "Server Online", description: "Backend connection active.", className: "bg-success text-success-foreground" });
            } else {
                setServerStatus('offline');
                toast({ title: "Server Connection Error", description: "Could not reach backend.", variant: "destructive" });
            }
        } catch (error) {
            setServerStatus('offline');
            toast({ title: "Server Connection Failed", description: "Network error.", variant: "destructive" });
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };
    const handleChangePassword = () => {
        if (!user) return;
        const ok = changePassword(user.id, oldPass, newPass);
        if (!ok) {
            toast({ title: "Password not changed", description: "Old password incorrect", variant: "destructive" });
            return;
        }
        setOldPass("");
        setNewPass("");
        toast({ title: "Password updated", description: "Your password has been changed" });
    };

    const handleSaveName = () => {
        if (!user || !displayName.trim()) return;
        updateUser(user.id, { name: displayName.trim() });
        setIsEditingName(false);
        toast({ title: "Name updated", description: "Your display name has been changed" });
    };

    const handleCancelNameEdit = () => {
        setDisplayName(user?.name || "");
        setIsEditingName(false);
    };

    const handleAccentColorChange = (color: string) => {
        setAccentColor(color);
        localStorage.setItem('accentColor', color);
        document.documentElement.setAttribute('data-accent', color);
        toast({ title: "Theme updated", description: `Accent color changed to ${color}` });
    };

    const handleSidebarToggle = (collapsed: boolean) => {
        setSidebarCollapsed(collapsed);
        localStorage.setItem('sidebarCollapsed', collapsed.toString());
        window.dispatchEvent(new CustomEvent('qms-sidebar-toggle', { detail: collapsed }));
        toast({ title: "Sidebar updated", description: collapsed ? "Sidebar collapsed" : "Sidebar expanded" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <SettingsIcon className="w-5 h-5" />
                        Platform Settings & Diagnostics
                    </DialogTitle>
                    <DialogDescription>
                        Manage your preferences and verify system health.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={user?.role === "admin" ? "diagnostics" : "account"} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        {user?.role === "admin" && <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>}
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="general">General</TabsTrigger>
                    </TabsList>

                    {/* DIAGNOSTICS TAB */}
                    <TabsContent value="diagnostics" className="space-y-4 py-4">
                        <div className="grid gap-4">
                            {/* Drive Permission Check */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-blue-500" />
                                            Google Drive Permissions
                                        </CardTitle>
                                        {driveStatus === 'success' && <Badge variant="default" className="bg-success">Verified</Badge>}
                                        {driveStatus === 'error' && <Badge variant="destructive">Failed</Badge>}
                                    </div>
                                    <CardDescription>
                                        Verifies that the QMS Platform can read and write files to your Google Drive.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {driveStatus === 'error' && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Permission Error</AlertTitle>
                                            <AlertDescription>{driveMessage}</AlertDescription>
                                        </Alert>
                                    )}
                                    {driveStatus === 'success' && (
                                        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <AlertTitle>Success</AlertTitle>
                                            <AlertDescription>{driveMessage}</AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                                <CardFooter className="flex gap-2 flex-wrap">
                                    <Button
                                        variant={driveStatus === 'success' ? "outline" : "default"}
                                        onClick={handleCheckDrive}
                                        disabled={driveStatus === 'checking'}
                                        className="w-full sm:w-auto"
                                    >
                                        {driveStatus === 'checking' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Run Permission Check
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleGoogleSignIn}
                                        className="w-full sm:w-auto"
                                    >
                                        Connect Google Drive
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Server Status Check */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                            <Server className="w-4 h-4 text-purple-500" />
                                            Server Connectivity
                                        </CardTitle>
                                        {serverStatus === 'online' && <Badge variant="default" className="bg-success">Online</Badge>}
                                        {serverStatus === 'offline' && <Badge variant="destructive">Offline</Badge>}
                                    </div>
                                    <CardDescription>
                                        Checks if the backend API server is reachable.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {serverStatus === 'offline' && (
                                        <p className="text-sm text-destructive">Could not connect to the server. Please check your internet connection or try again later.</p>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        variant="outline"
                                        onClick={handleCheckServer}
                                        disabled={serverStatus === 'checking'}
                                        className="w-full sm:w-auto"
                                    >
                                        {serverStatus === 'checking' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Check Connectivity
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ACCOUNT TAB */}
                    <TabsContent value="account" className="space-y-4 py-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Account Information</CardTitle>
                                <CardDescription>Manage your connected Google Account.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-1">
                                    <Label>Session Status</Label>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                        Active
                                    </div>
                                </div>
                                {user && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Name</Label>
                                            {isEditingName ? (
                                                <div className="flex gap-2 mt-1">
                                                    <Input
                                                        value={displayName}
                                                        onChange={(e) => setDisplayName(e.target.value)}
                                                        placeholder="Enter your name"
                                                        className="flex-1"
                                                    />
                                                    <Button size="sm" onClick={handleSaveName}>Save</Button>
                                                    <Button size="sm" variant="outline" onClick={handleCancelNameEdit}>Cancel</Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium">{user.name}</p>
                                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>Edit</Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label>Email</Label>
                                                <p className="text-sm font-medium">{user.email}</p>
                                            </div>
                                            <div>
                                                <Label>Role</Label>
                                                <p className="text-sm font-medium capitalize">{user.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Change Password</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input placeholder="Old password" type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
                                        <Input placeholder="New password" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                                    </div>
                                    <Button className="mt-2" variant="outline" onClick={handleChangePassword}>Update Password</Button>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end">
                                <Button variant="destructive" onClick={handleLogout}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Logout
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* GENERAL TAB */}
                    <TabsContent value="general" className="space-y-4 py-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Interface Preferences</CardTitle>
                                <CardDescription>Customize your workspace experience.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Dark Mode</Label>
                                        <p className="text-xs text-muted-foreground">Toggle dark theme.</p>
                                    </div>
                                    <Switch
                                        checked={isDarkMode}
                                        onCheckedChange={toggleDarkMode}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-0.5">
                                        <Label>Accent Color</Label>
                                        <p className="text-xs text-muted-foreground">Choose your preferred accent color.</p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {['blue', 'green', 'purple', 'red', 'orange', 'pink', 'gold'].map((color) => {
                                            if (color === 'gold' && user?.role !== 'admin') return null;

                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => handleAccentColorChange(color)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${accentColor === color ? 'border-gray-800 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
                                                        }`}
                                                    style={{ backgroundColor: `var(--${color}-500)` }}
                                                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
