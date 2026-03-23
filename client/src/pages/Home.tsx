import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
import AppLayout from "@/components/AppLayout";
import { ShoppingBag, CheckSquare, FolderKanban, History, Users, Building2, ChevronRight, Calendar, Package, HandCoins } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";


export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, currentHousehold } = useUserAuth();

  // All translations – must be called unconditionally
  const { t } = useTranslation("common");
  const { t: tShopping } = useTranslation("shopping");
  const { t: tTasks } = useTranslation("tasks");
  const { t: tCalendar } = useTranslation("calendar");
  const { t: tProjects } = useTranslation("projects");
  const { t: tInventory } = useTranslation("inventory");
  const { t: tBorrows } = useTranslation("borrows");
  const { t: tHistory } = useTranslation("history");
  const { t: tNeighborhood } = useTranslation("neighborhood");

  useEffect(() => {
    // Wait for auth check to complete before redirecting
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!currentHousehold) {
      setLocation("/household-selection");
      return;
    }
  }, [isAuthenticated, isLoading, currentHousehold, setLocation]);

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || !currentHousehold) {
    return null;
  }

  const displayHousehold = currentHousehold.householdName;

  const features = [
    {
      title: tShopping("title"),
      description: tShopping("messages.manageCategories"),
      icon: ShoppingBag,
      href: "/shopping",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: tTasks("title"),
      description: tTasks("messages.rotationAndSchedules"),
      icon: CheckSquare,
      href: "/tasks",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: tCalendar("title"),
      description: tCalendar("messages.overview"),
      icon: Calendar,
      href: "/calendar",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: tProjects("title"),
      description: tProjects("messages.planAndManage"),
      icon: FolderKanban,
      href: "/projects",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: tInventory("title"),
      description: tInventory("messages.manageAndOrganize"),
      icon: Package,
      href: "/inventory",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: tBorrows("title"),
      description: tBorrows("messages.description"),
      icon: HandCoins,
      href: "/borrows",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: tHistory("title"),
      description: tHistory("messages.trackActivities"),
      icon: History,
      href: "/history",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: tNeighborhood("title"),
      description: tNeighborhood("messages.collaborate"),
      icon: Building2,
      href: "/neighborhood",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: t("nav.household"),
      description: t("household.members"),
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
            {t("messages.welcome")}, {currentHousehold.memberName}!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-lg">{t("household.name")}:</span>
            <span className="text-lg font-medium">{displayHousehold}</span>
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
                    {t("actions.clickToStart")}
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
