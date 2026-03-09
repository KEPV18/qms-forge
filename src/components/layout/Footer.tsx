import { ShieldCheck, Settings } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto border-t border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground/70 font-medium">
              © {currentYear} QMS Platform · ISO 9001:2015
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-muted-foreground/60 font-medium">Active</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40 bg-muted/30 px-2 py-0.5 rounded-md">
              <Settings className="w-2.5 h-2.5" />
              <span>v2.4.2</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
