import { Search, Bell, Settings, FileText, Folder, Layout, FileCode, CheckCircle, ExternalLink, Table, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchProjectDrive, DriveSearchResult } from "@/lib/driveService";

import { cn } from "@/lib/utils";

export function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<DriveSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const driveResults = await searchProjectDrive(searchTerm);
        setResults(driveResults);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);



  const getFileTypeInfo = (file: DriveSearchResult) => {
    const name = file.name;
    const mime = file.mimeType;

    // Pattern for records: [ModuleCode]/[FormCode]-[SerialNumber] (e.g., F/19-004, AUD/01-01)
    if (name.match(/[A-Z]+\/\d+-\d+/i)) return { label: "Record", color: "bg-success/20 text-success border-success/20" };

    // Pattern for forms: [ModuleCode]/[FormCode] (e.g., F/19, AUD/01)
    if (name.match(/[A-Z]+\/\d+/i) || name.toLowerCase().includes("template")) return { label: "Form Template", color: "bg-accent/20 text-accent border-accent/20" };

    if (mime.includes("folder")) return { label: "Folder", color: "bg-muted text-muted-foreground border-border" };
    if (mime.includes("spreadsheet")) return { label: "Spreadsheet", color: "bg-success/20 text-success border-success/20" };
    if (mime.includes("document")) return { label: "Document", color: "bg-blue-500/20 text-blue-500 border-blue-200" };
    if (mime.includes("pdf")) return { label: "PDF", color: "bg-destructive/20 text-destructive border-destructive/20" };

    return { label: "Drive File", color: "bg-muted text-muted-foreground border-border" };
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("folder")) return <Folder className="w-4 h-4 text-accent" />;
    if (mimeType.includes("spreadsheet")) return <Table className="w-4 h-4 text-success" />;
    if (mimeType.includes("document")) return <FileText className="w-4 h-4 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileCode className="w-4 h-4 text-destructive" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <header className="h-16 bg-card/60 backdrop-blur-2xl border-b border-border/50 sticky top-0 z-40 transition-all duration-300">
      {/* Brand Logo */}


      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl relative group" ref={dropdownRef}>
        <div className="relative w-full focus-within:ring-2 focus-within:ring-primary/20 rounded-lg transition-all duration-300">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search all files and folders in Drive..."
            className="pl-10 bg-background/50 border-border/50 rounded-lg shadow-sm focus-visible:ring-0 focus-visible:border-primary/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 w-full mt-2 glass-card rounded-lg shadow-xl overflow-hidden animate-fade-in z-50">
            <div className="max-h-[400px] overflow-y-auto">
              {results.length > 0 ? (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border">
                    Found {results.length} items in Drive
                  </div>
                  {results.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => window.open(file.webViewLink, '_blank')}
                      className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center border border-border">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            {(() => {
                              const typeInfo = getFileTypeInfo(file);
                              return (
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold border uppercase", typeInfo.color)}>
                                  {typeInfo.label}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                              {file.mimeType.split('.').pop()?.replace('spreadsheet', 'sheet').replace('document', 'doc')}
                            </span>
                            {file.path && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                in <Folder className="w-3 h-3" /> <span className="font-semibold text-foreground/70">{file.path}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    </div>
                  ))}
                </>
              ) : searchTerm.length >= 2 && !isSearching ? (
                <div className="p-8 text-center bg-muted/10">
                  <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-foreground">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a more specific file name</p>
                </div>
              ) : null}
            </div>
            <div className="px-4 py-2 bg-muted/20 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Press Enter to search Drive</span>
              <span>15 max results</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}