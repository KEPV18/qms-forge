import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { RiskRegisterTab } from "@/components/risk/RiskRegisterTab";
import { CapaRegisterTab } from "@/components/risk/CapaRegisterTab";
import { ProcessInteractionTab } from "@/components/risk/ProcessInteractionTab";
import { RiskHeatMap } from "@/components/risk/RiskHeatMap";
import { RiskStats } from "@/components/risk/RiskStats";
import { Shield, AlertTriangle, Activity } from "lucide-react";
import { useRiskData } from "@/hooks/useRiskData";
import { useCAPAData } from "@/hooks/useCAPAData";

export default function RiskManagementPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("risk");

    const { risks } = useRiskData();
    const { capas } = useCAPAData();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab && ["risk", "capa", "process"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        navigate(`/risk-management?tab=${value}`, { replace: true });
    };

    return (
        <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Risk & Process Management" }]}>
            <div className="space-y-5">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Risk & Process Management</h1>
                    <p className="text-xs text-muted-foreground">ISO 9001:2015 Clause 6.1 — Monitor risks, track CAPAs, and visualize processes.</p>
                </div>

                {/* Stats */}
                <RiskStats risks={risks} capas={capas} />

                {/* Heat Map - only on risk tab */}
                {activeTab === "risk" && risks.length > 0 && (
                    <RiskHeatMap risks={risks} />
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-3 lg:w-[500px] h-10 p-1 bg-muted/40 rounded-sm border border-border/50">
                        <TabsTrigger value="risk" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Risk Register
                        </TabsTrigger>
                        <TabsTrigger value="capa" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Shield className="w-3.5 h-3.5" />
                            CAPA Register
                        </TabsTrigger>
                        <TabsTrigger value="process" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Activity className="w-3.5 h-3.5" />
                            Process Map
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="risk" className="mt-4">
                        <div className="bg-card rounded-sm border border-border overflow-hidden">
                            <RiskRegisterTab />
                        </div>
                    </TabsContent>

                    <TabsContent value="capa" className="mt-4">
                        <div className="bg-card rounded-sm border border-border overflow-hidden">
                            <CapaRegisterTab />
                        </div>
                    </TabsContent>

                    <TabsContent value="process" className="mt-4">
                        <div className="bg-card rounded-sm border border-border overflow-hidden">
                            <ProcessInteractionTab />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    );
}