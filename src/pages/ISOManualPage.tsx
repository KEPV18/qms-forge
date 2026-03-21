import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExternalLink, Maximize2, Minimize2, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DOC_ID = "1ZYwkf6Az3AVExhtfY5Dtj6p-U1Bof0Ao";
const PREVIEW_URL = `https://docs.google.com/document/d/${DOC_ID}/preview`;
const EDIT_URL = `https://docs.google.com/document/d/${DOC_ID}/edit`;

export default function ISOManualPage() {
  const [activeModule, setActiveModule] = useState("iso-manual");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState<"preview" | "edit">("preview");

  useEffect(() => {
    const handler = (e: CustomEvent) => setSidebarCollapsed(e.detail);
    window.addEventListener('qms-sidebar-toggle', handler as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handler as EventListener);
  }, []);

  const iframeSrc = mode === "edit" ? EDIT_URL : PREVIEW_URL;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarCollapsed ? "md:ml-[60px]" : "md:ml-60")}>
        <Header />
        <main className={cn("flex-1 flex flex-col", isFullscreen ? "fixed inset-0 z-50 bg-background" : "p-4 md:p-6")}>
          {/* Header bar */}
          <div className={cn("flex items-center justify-between gap-3 flex-wrap", isFullscreen ? "px-4 py-3" : "mb-3")}>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">ISO 9001:2015 Manual</h1>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">POLICY</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                <Button
                  variant={mode === "preview" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("preview")}
                  className="rounded-none gap-1.5 h-8"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
                <Button
                  variant={mode === "edit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("edit")}
                  className="rounded-none gap-1.5 h-8"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => window.open(EDIT_URL, '_blank')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Document iframe */}
          <div className={cn("rounded-xl border border-border overflow-hidden bg-card flex-1", isFullscreen ? "h-[calc(100vh-70px)] mx-4 mb-4" : "h-[calc(100vh-180px)]")}>
            <iframe
              key={mode}
              src={iframeSrc}
              className="w-full h-full"
              title="ISO 9001:2015 Manual"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </main>
        {!isFullscreen && <Footer />}
      </div>
    </div>
  );
}
