import { ShoppingCart, CheckSquare, Calendar, MoreHorizontal } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BottomNav() {
  const [location] = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isActive = (path: string) => location === path;
  const isMoreActive = ["/projects", "/history", "/members"].includes(location);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="container max-w-2xl mx-auto">
        <div className="flex items-center justify-around h-16">
          {/* Einkaufen */}
          <Link href="/shopping">
            <a
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                isActive("/shopping")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs font-medium">Einkaufen</span>
            </a>
          </Link>

          {/* Aufgaben */}
          <Link href="/tasks">
            <a
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                isActive("/tasks")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Aufgaben</span>
            </a>
          </Link>

          {/* Termine */}
          <Link href="/calendar">
            <a
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                isActive("/calendar")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-medium">Termine</span>
            </a>
          </Link>

          {/* Weiteres (Dropdown) */}
          <DropdownMenu open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                  isMoreActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">Weiteres</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <Link href="/projects">
                <DropdownMenuItem className="cursor-pointer">
                  Projekte
                </DropdownMenuItem>
              </Link>
              <Link href="/history">
                <DropdownMenuItem className="cursor-pointer">
                  Verlauf
                </DropdownMenuItem>
              </Link>
              <Link href="/members">
                <DropdownMenuItem className="cursor-pointer">
                  Haushalt
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
