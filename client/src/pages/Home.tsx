
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { ShoppingBag, CheckSquare, FolderKanban, History, Users, Building2, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, member, household } = useHouseholdAuth();

  if (!isAuthenticated || !member || !household) {
    return null;
  }

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
      title: "Terminübersicht",
      description: "Kalender und alle Aufgaben im Überblick",
      icon: Calendar,
      href: "/calendar",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
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

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">
            Willkommen, {member.memberName}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Haushalt: {household.householdName}
          </p>
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
                    Klicken Sie hier, um zu beginnen →
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
