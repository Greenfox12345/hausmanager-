import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  ShoppingBag, 
  CheckSquare, 
  FolderKanban, 
  History, 
  Users, 
  Building2, 
  Menu, 
  LogOut,
  Home as HomeIcon,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [, setLocation] = useLocation();
  const { household, member, logout, setHousehold, setMember } = useHouseholdAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: households = [] } = trpc.household.listHouseholds.useQuery();
  const loginHouseholdMutation = trpc.household.loginHousehold.useMutation();
  const loginMemberMutation = trpc.household.loginMember.useMutation();

  const navigationItems = [
    {
      title: "Home",
      icon: HomeIcon,
      href: "/",
      color: "text-foreground",
    },
    {
      title: "Einkaufsliste",
      icon: ShoppingBag,
      href: "/shopping",
      color: "text-primary",
    },
    {
      title: "Haushaltsaufgaben",
      icon: CheckSquare,
      href: "/tasks",
      color: "text-secondary",
    },
    {
      title: "Terminübersicht",
      icon: Calendar,
      href: "/calendar",
      color: "text-purple-600",
    },
    {
      title: "Projekte",
      icon: FolderKanban,
      href: "/projects",
      color: "text-accent",
    },
    {
      title: "Verlauf",
      icon: History,
      href: "/history",
      color: "text-primary",
    },
    {
      title: "Nachbarschaft",
      icon: Building2,
      href: "/neighborhood",
      color: "text-secondary",
    },
    {
      title: "Mitglieder",
      icon: Users,
      href: "/members",
      color: "text-accent",
    },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const handleSwitchHousehold = async (householdId: number, householdName: string) => {
    try {
      // For now, we'll just prompt for password and switch
      const password = prompt(`Passwort für Haushalt "${householdName}" eingeben:`);
      if (!password) return;

      const householdResult = await loginHouseholdMutation.mutateAsync({
        name: householdName,
        password,
      });

      setHousehold({
        householdId: householdResult.householdId,
        householdName: householdResult.name,
      });

      // Prompt for member
      const memberName = prompt("Mitgliedsname eingeben:");
      if (!memberName) return;

      const memberPassword = prompt("Mitglieds-Passwort eingeben:");
      if (!memberPassword) return;

      const memberResult = await loginMemberMutation.mutateAsync({
        householdId: householdResult.householdId,
        memberName,
        password: memberPassword,
      });

      setMember({
        memberId: memberResult.memberId,
        memberName: memberResult.memberName,
        householdId: householdResult.householdId,
        photoUrl: memberResult.photoUrl || undefined,
      });

      toast.success(`Zu Haushalt "${householdName}" gewechselt`);
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "Wechsel fehlgeschlagen");
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold mb-3">Haushaltsmanager</h2>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              disabled={loginHouseholdMutation.isPending || loginMemberMutation.isPending}
            >
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-medium truncate w-full">
                  {household?.householdName}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {member?.memberName}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px]" align="start">
            <DropdownMenuLabel>Haushalte wechseln</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {households.map((h) => (
              <DropdownMenuItem
                key={h.id}
                onClick={() => handleSwitchHousehold(h.id, h.name)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  {household?.householdId === h.id && (
                    <Check className="h-4 w-4" />
                  )}
                  <span className={household?.householdId !== h.id ? "ml-6" : ""}>
                    {h.name}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = window.location.pathname === item.href;
          
          return (
            <button
              key={item.href}
              onClick={() => {
                setLocation(item.href);
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-accent/50 group",
                isActive && "bg-primary/10 text-primary font-medium"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : item.color)} />
              <span className="flex-1 text-left">{item.title}</span>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Mobile Header with Menu */}
      <div className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center justify-between h-16">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          
          <h1 className="text-lg font-bold">Haushaltsmanager</h1>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Desktop Layout with Sidebar */}
      <div className="hidden lg:flex h-screen">
        {/* Desktop Sidebar */}
        <aside className="w-80 border-r bg-card">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden">
        {children}
      </div>
    </div>
  );
}
