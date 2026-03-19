import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
import AppLayout from "@/components/AppLayout";
import { ShoppingBag, CheckSquare, FolderKanban, History, Users, Building2, ChevronRight, Calendar, Package, ChevronsUpDown, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, currentHousehold, user, setCurrentHousehold } = useUserAuth();
  const { t } = useTranslation(["common", "shopping", "tasks", "calendar", "projects", "inventory", "history", "neighborhood", "members"]);

  useEffect(() => {
    // Check user auth
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    // If user is logged in but no household selected, redirect to household selection
    if (!currentHousehold) {
      setLocation("/household-selection");
      return;
    }
  }, [isAuthenticated, currentHousehold, setLocation]);

  // Show loading while checking auth
  if (!isAuthenticated || !currentHousehold) {
    return null;
  }

  // Get household info
  const displayHousehold = currentHousehold.householdName;

  // Household switcher
  const { data: userHouseholds = [] } = trpc.householdManagement.listUserHouseholds.useQuery(
    { userId: user?.id },
    { enabled: !!user?.id }
  );
  const switchHouseholdMutation = trpc.householdManagement.switchHousehold.useMutation();

  const handleSwitchHousehold = async (householdId: number, householdName: string) => {
    try {
      const result = await switchHouseholdMutation.mutateAsync({ householdId });
      setCurrentHousehold({
        householdId: result.householdId,
        householdName: result.householdName,
        memberId: result.memberId,
        memberName: result.memberName,
        inviteCode: result.inviteCode,
      });
      toast.success(`${t("household.select", { ns: "common" })}: "${householdName}"`);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || t("messages.error", { ns: "common" }));
    }
  };

  const features = [
    {
      title: t("shopping.title", "Einkaufsliste"),
      description: t("shopping.messages.manageCategories", "Einkäufe mit Kategorien verwalten"),
      icon: ShoppingBag,
      href: "/shopping",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("tasks.title", "Haushaltsaufgaben"),
      description: t("tasks.messages.rotationAndSchedules", "Aufgaben mit Rotation und Zeitplänen verwalten"),
      icon: CheckSquare,
      href: "/tasks",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: t("calendar.title", "Terminübersicht"),
      description: t("calendar.messages.overview", "Kalender und alle Termine im Überblick"),
      icon: Calendar,
      href: "/calendar",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: t("projects.title", "Projekte"),
      description: t("projects.messages.planAndManage", "Gemeinsame Haushaltsprojekte planen"),
      icon: FolderKanban,
      href: "/projects",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: t("inventory.title", "Inventar"),
      description: t("inventory.messages.manageAndOrganize", "Haushaltsgegenstände verwalten und organisieren"),
      icon: Package,
      href: "/inventory",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: t("history.title", "Verlauf"),
      description: t("history.messages.trackActivities", "Aktivitäten und Fortschritte im Haushalt verfolgen"),
      icon: History,
      href: "/history",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("neighborhood.title", "Nachbarschaft"),
      description: t("neighborhood.messages.collaborate", "Mit anderen Haushalten zusammenarbeiten"),
      icon: Building2,
      href: "/neighborhood",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: t("nav.household", "Haushalt"),
      description: t("members.messages.manageMembers", "Haushaltsmitglieder und Einstellungen"),
      icon: Users,
      href: "/members",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">
            {t("messages.welcome", "Willkommen")}, {currentHousehold.memberName}!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-lg">{t("household.name", "Haushalt")}:</span>
            {userHouseholds.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 text-lg font-medium text-foreground hover:bg-transparent hover:text-primary flex items-center gap-1"
                    disabled={switchHouseholdMutation.isPending}
                  >
                    {displayHousehold}
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>{t("household.select", "Haushalt wechseln", { ns: "common" })}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userHouseholds.map((h) => (
                    <DropdownMenuItem
                      key={h.householdId}
                      onClick={() => handleSwitchHousehold(h.householdId, h.householdName)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {currentHousehold.householdId === h.householdId && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                        <span className={currentHousehold.householdId !== h.householdId ? "ml-6" : ""}>
                          {h.householdName}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-lg font-medium">{displayHousehold}</span>
            )}
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {t("actions.clickToStart", "Klicken Sie hier, um zu beginnen →")}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Mobile List */}
        <div className="md:hidden grid grid-cols-1 gap-4">
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
    </AppLayout>
  );
}
