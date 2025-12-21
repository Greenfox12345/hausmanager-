import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, History as HistoryIcon } from "lucide-react";

export default function History() {
  const [, setLocation] = useLocation();
  const { household, isAuthenticated } = useHouseholdAuth();

  if (!isAuthenticated || !household) {
    setLocation("/login");
    return null;
  }

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Aktivitätsverlauf</h1>
            <p className="text-muted-foreground">{household.householdName}</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <HistoryIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Aktivitätsverlauf</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Hier sehen Sie alle Aktivitäten Ihres Haushalts: erledigte Einkäufe,
              abgeschlossene Aufgaben und Projektfortschritte.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
