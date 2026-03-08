import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, X } from "lucide-react";

interface AuditFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  onExportCSV: () => void;
  totalFiltered: number;
  totalAll: number;
}

export function AuditFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  onExportCSV,
  totalFiltered,
  totalAll,
}: AuditFiltersProps) {
  const hasFilters = search || categoryFilter !== "all";

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or category..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm bg-background border-border/50"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm bg-background border-border/50">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Export */}
        <Button onClick={onExportCSV} variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground font-medium">
            Showing {totalFiltered} of {totalAll} items
          </span>
          <button
            onClick={() => { onSearchChange(""); onCategoryChange("all"); }}
            className="text-[10px] text-primary font-semibold hover:underline ml-auto"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
