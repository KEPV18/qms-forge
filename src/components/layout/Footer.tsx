import { Calendar, Clock, Settings, ShieldCheck, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <footer className="w-full mt-auto border-t border-border/40 bg-card/30 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          {/* Brand & Mission */}
          <div className="flex flex-col items-center md:items-start space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground">
                QMS Platform
              </span>
            </div>
            <p className="text-xs text-muted-foreground/80 font-medium">
              ISO 9001:2015 Registered Management System
            </p>
          </div>

          {/* System Status Indicators */}
          <div className="flex items-center bg-muted/30 px-4 py-2 rounded-full border border-border/30 gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground">
                {currentDate}
              </span>
            </div>
            <div className="w-px h-3 bg-border/50" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                System Active
              </span>
            </div>
          </div>

          {/* Copyright Section */}
          <div className="text-right flex flex-col items-center md:items-end space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              © {currentYear} Quality Management System
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <span>Handcrafted for Excellence</span>
              <Heart className="w-2.5 h-2.5 text-destructive/60 fill-current" />
            </div>
          </div>
        </div>

        {/* Bottom Utility Bar */}
        <div className="pt-4 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
            <span className="hover:text-primary transition-colors cursor-default">Compliance</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="hover:text-primary transition-colors cursor-default">Security</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="hover:text-primary transition-colors cursor-default">Performance</span>
          </div>

          <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              <Settings className="w-2.5 h-2.5" />
              <span>v2.4.2</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}