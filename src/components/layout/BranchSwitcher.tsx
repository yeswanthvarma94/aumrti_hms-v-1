import React from "react";
import { Building2, ChevronsUpDown, Check } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BranchSwitcherProps {
  collapsed?: boolean;
}

const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ collapsed }) => {
  const { branches, selectedBranch, canSwitch, setSelectedBranchId, role } = useBranch();

  if (!selectedBranch) return null;

  // Single branch (non super_admin/ceo) → static label
  if (!canSwitch) {
    if (collapsed) {
      return (
        <div className="flex items-center justify-center px-2 py-2" title={selectedBranch.name}>
          <Building2 size={16} className="text-sidebar-foreground/60" />
        </div>
      );
    }
    return (
      <div className="px-3 py-2 flex items-center gap-2 text-sidebar-foreground/80">
        <Building2 size={14} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{selectedBranch.name}</p>
          {selectedBranch.city && (
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{selectedBranch.city}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-sidebar-accent/50 transition-colors text-sidebar-foreground",
            collapsed && "justify-center px-2"
          )}
          title={selectedBranch.name}
        >
          <Building2 size={14} className="shrink-0" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold truncate">{selectedBranch.name}</p>
                {selectedBranch.city && (
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">{selectedBranch.city}</p>
                )}
              </div>
              <ChevronsUpDown size={12} className="text-sidebar-foreground/50" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs">
          Switch branch ({role})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map(b => (
          <DropdownMenuItem
            key={b.id}
            onClick={() => setSelectedBranchId(b.id)}
            className="flex items-center gap-2"
          >
            <Building2 size={14} className="text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{b.name}</p>
              {b.city && <p className="text-xs text-muted-foreground truncate">{b.city}</p>}
            </div>
            {selectedBranch.id === b.id && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BranchSwitcher;
