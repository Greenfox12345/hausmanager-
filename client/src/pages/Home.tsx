import { useState } from "react";
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, member, household, logout } = useHouseholdAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated || !member || !household) {
    setLocation("/login");
    return null;
  }

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

  const features = [
    {
      title: "Einkaufsliste",
      description: "Verwalten Sie Ihre Einkäufe mit Kategorien",
      icon: ShoppingBag,
      href: "/shopping",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Haushaltsaufgaben",
      description: "Aufgaben mit Rotation und Zeitplänen",
      icon: CheckSquare,
      href: "/tasks",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Projekte",
      description: "Gemeinsame Projekte planen und verwalten",
      icon: FolderKanban,
      href: "/projects",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Verlauf",
      description: "Aktivitäten und Fortschritte verfolgen",
      icon: History,
      href: "/history",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Nachbarschaft",
      description: "Zusammenarbeit mit anderen Haushalten",
      icon: Building2,
      href: "/neighborhood",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Mitglieder",
      description: "Haushaltsmitglieder verwalten",
      icon: Users,
      href: "/members",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold mb-1">Haushaltsmanager</h2>
        <p className="text-sm text-muted-foreground">{household.householdName}</p>
        <p className="text-xs text-muted-foreground mt-1">{member.memberName}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
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
          <div className="container py-8">
            <div className="mb-8 animate-fade-in">
              <h1 className="text-4xl font-bold mb-2">
                Willkommen, {member.memberName}!
              </h1>
              <p className="text-muted-foreground text-lg">
                Haushalt: {household.householdName}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.href}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => setLocation(feature.href)}
                  >
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        Klicken Sie hier, um zu beginnen →
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden">
        <div className="container py-8">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">
              Willkommen, {member.memberName}!
            </h1>
            <p className="text-muted-foreground">
              Haushalt: {household.householdName}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.href}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setLocation(feature.href)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {feature.description}
                        </CardDescription>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
