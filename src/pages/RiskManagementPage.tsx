import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { RiskRegisterTab } from "@/components/risk/RiskRegisterTab";
import { CapaRegisterTab } from "@/components/risk/CapaRegisterTab";
import { ProcessInteractionTab } from "@/components/risk/ProcessInteractionTab";
import { Shield, AlertTriangle, Activity } from "lucide-react";

export default function RiskManagementPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

    useEffect(() => {
        const handleToggle = (event: Event) => {
            const customEvent = event as CustomEvent<boolean>;
            setSidebarCollapsed(customEvent.detail);
        };
        window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
        return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    }, []);
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("risk");

    // Sync tab with URL query param if needed, or just internal state
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab && ["risk", "capa", "process"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        navigate(`/risk-management?tab=${value}`);
    };

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar activeModule="risk" onModuleChange={() => { }} />
            <div className={`flex-1 flex flex-col ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
                <Header />
                <main className="flex-1 transition-all duration-300">
                    <div className="p-8 space-y-8">
                        <div className="flex items-center gap-4 animate-fade-in group">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 border border-primary/20 transition-all group-hover:scale-110">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-3xl font-bold tracking-tight font-heading">Risk & Process Management</h1>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">
                                    Monitor risks, track corrective actions, and visualize process interactions.
                                </p>
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                            <TabsList className="grid w-full grid-cols-3 lg:w-[600px] h-11 p-1 bg-muted/40 backdrop-blur-md rounded-xl border border-border/50">
                                <TabsTrigger value="risk" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    Risk Register
                                </TabsTrigger>
                                <TabsTrigger value="capa" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Shield className="w-4 h-4" />
                                    CAPA Register
                                </TabsTrigger>
                                <TabsTrigger value="process" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Activity className="w-4 h-4" />
                                    Process Map
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="risk" className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="glass-card rounded-2xl p-1 overflow-hidden">
                                    <RiskRegisterTab />
                                </div>
                            </TabsContent>

                            <TabsContent value="capa" className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="glass-card rounded-2xl p-1 overflow-hidden">
                                    <CapaRegisterTab />
                                </div>
                            </TabsContent>

                            <TabsContent value="process" className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="glass-card rounded-2xl p-1 overflow-hidden">
                                    <ProcessInteractionTab />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
