import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_MODULES, trackModuleVisit } from "@/lib/modules";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (route: string) => {
    trackModuleVisit(route);
    navigate(route);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to module..." />
      <CommandList>
        <CommandEmpty>No modules found.</CommandEmpty>
        <CommandGroup heading="Modules">
          {ALL_MODULES.map((m) => (
            <CommandItem
              key={m.route + m.name}
              value={`${m.name} ${m.desc} ${m.category}`}
              onSelect={() => handleSelect(m.route)}
            >
              <span className="mr-2 text-lg">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{m.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{m.category}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
