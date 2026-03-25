import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
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
  Calendar,
  UserCircle,
  Package,
  HandCoins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";


interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, currentHousehold, logout: userLogout, setCurrentHousehold } = useUserAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation("common");
  
  // Detect desktop/mobile for conditional rendering
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use new user-based auth system
  const household = currentHousehold ? { householdId: currentHousehold.householdId, householdName: currentHousehold.householdName } : null;
  const member = currentHousehold ? { memberId: currentHousehold.memberId, memberName: currentHousehold.memberName, householdId: currentHousehold.householdId } : null;
  const logout = () => {
    userLogout();
    setLocation("/login");
  };

  // Query user's households for switcher
  const { data: userHouseholds = [] } = trpc.householdManagement.listUserHouseholds.useQuery(
    { userId: user?.id },
    { enabled: !!user?.id }
  );

  // Mutation to switch household
  const switchHouseholdMutation = trpc.householdManagement.switchHousehold.useMutation();

  // Pending borrow requests count for badge
  const { data: pendingData } = trpc.borrow.getPendingRequestsCount.useQuery(
    {
      householdId: member?.householdId ?? 0,
      ownerId: member?.memberId ?? 0,
    },
    {
      enabled: !!member?.householdId && !!member?.memberId,
      refetchInterval: 60_000, // refresh every minute
    }
  );
  const pendingCount = pendingData?.count ?? 0;

  const navigationItems = [
    {
      title: t("nav.home"),
      icon: HomeIcon,
      href: "/",
      color: "text-foreground",
    },
    {
      title: t("nav.shopping"),
      icon: ShoppingBag,
      href: "/shopping",
      color: "text-primary",
    },
    {
      title: t("nav.tasks"),
      icon: CheckSquare,
      href: "/tasks",
      color: "text-secondary",
    },
    {
      title: t("nav.calendar"),
      icon: Calendar,
      href: "/calendar",
      color: "text-purple-600",
    },
    {
      title: t("nav.projects"),
      icon: FolderKanban,
      href: "/projects",
      color: "text-accent",
    },
    {
      title: t("nav.inventory"),
      icon: Package,
      href: "/inventory",
      color: "text-orange-600",
    },
    {
      title: t("nav.borrows"),
      icon: HandCoins,
      href: "/borrows",
      color: "text-yellow-600",
      badge: pendingCount,
    },
    {
      title: t("nav.history"),
      icon: History,
      href: "/history",
      color: "text-primary",
    },
    {
      title: t("nav.neighborhood"),
      icon: Building2,
      href: "/neighborhood",
      color: "text-secondary",
    },
    {
      title: t("nav.household"),
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
      const result = await switchHouseholdMutation.mutateAsync({ householdId });
      
      // Update UserAuthContext with new household data
      const newHouseholdData = {
        householdId: result.householdId,
        householdName: result.householdName,
        memberId: result.memberId,
        memberName: result.memberName,
        inviteCode: result.inviteCode,
      };
      setCurrentHousehold(newHouseholdData);
      
      toast.success(`${t("household.select")}: "${householdName}"`);
      
      // Reload current page to refresh data
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Wechsel fehlgeschlagen");
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
        <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">{t("app.name")}</h2>
          <div className="flex items-center gap-1">
            <LanguageSwitcher compact />
            <NotificationBell />
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              disabled={switchHouseholdMutation.isPending}
            >
              <span className="text-sm font-medium truncate">
                {household?.householdName || t("household.select")}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px]" align="start">
            <DropdownMenuLabel>{t("household.select")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userHouseholds.map((h) => (
              <DropdownMenuItem
                key={h.householdId}
                onClick={() => handleSwitchHousehold(h.householdId, h.householdName)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  {household?.householdId === h.householdId && (
                    <Check className="h-4 w-4" />
                  )}
                  <span className={household?.householdId !== h.householdId ? "ml-6" : ""}>
                    {h.householdName}
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
          const badgeCount = (item as any).badge ?? 0;
          
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
              {badgeCount > 0 && (
                <span className="ml-auto min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
              {isActive && badgeCount === 0 && <ChevronRight className="h-4 w-4" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => {
            setLocation("/household-selection");
            setSidebarOpen(false);
          }}
        >
          <UserCircle className="h-4 w-4" />
          {t("auth.profile", "Profil")}
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="text-lg font-bold hover:bg-transparent"
                disabled={switchHouseholdMutation.isPending}
              >
                {household?.householdName || "Haushaltsmanager"}
                <ChevronsUpDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              <DropdownMenuLabel>{t("household.select")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userHouseholds.map((h) => (
                <DropdownMenuItem
                  key={h.householdId}
                  onClick={() => handleSwitchHousehold(h.householdId, h.householdName)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    {household?.householdId === h.householdId && (
                      <Check className="h-4 w-4" />
                    )}
                    <span className={household?.householdId !== h.householdId ? "ml-6" : ""}>
                      {h.householdName}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <NotificationBell />
        </div>
      </div>

      {/* Conditional Rendering: Only render ONE version based on screen size */}
      {isDesktop ? (
        /* Desktop Layout with Sidebar */
        <div className="flex h-screen">
          <aside className="w-80 border-r bg-card">
            <SidebarContent />
          </aside>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      ) : (
        /* Mobile Content */
        <main>
          {children}
        </main>
      )}
    </div>
  );
}
