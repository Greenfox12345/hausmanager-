import { useState } from "react";
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ShoppingCart, 
  CheckCircle2, 
  Target, 
  Bell,
  MessageSquare,
  Image as ImageIcon,
  Filter,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function History() {
  const [, setLocation] = useLocation();
  const { household, isAuthenticated } = useHouseholdAuth();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: activities = [], isLoading } = trpc.household.getActivityHistory.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  if (!isAuthenticated || !household) {
    setLocation("/login");
    return null;
  }

  const filteredActivities = activities.filter((activity) => {
    const matchesType = filterType === "all" || activity.activityType === filterType;
    const matchesSearch = 
      searchQuery === "" ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.comment?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getActivityIcon = (type: string, action: string) => {
    if (type === "shopping") return <ShoppingCart className="h-5 w-5" />;
    if (action === "completed") return <CheckCircle2 className="h-5 w-5" />;
    if (action === "milestone") return <Target className="h-5 w-5" />;
    if (action === "reminder") return <Bell className="h-5 w-5" />;
    return <CheckCircle2 className="h-5 w-5" />;
  };

  const getActivityColor = (type: string, action: string) => {
    if (type === "shopping") return "text-blue-600 bg-blue-50";
    if (action === "completed") return "text-green-600 bg-green-50";
    if (action === "milestone") return "text-purple-600 bg-purple-50";
    if (action === "reminder") return "text-yellow-600 bg-yellow-50";
    return "text-gray-600 bg-gray-50";
  };

  const parsePhotoUrls = (activity: any): string[] => {
    try {
      if (activity.photoUrls) {
        if (typeof activity.photoUrls === "string") {
          return JSON.parse(activity.photoUrls);
        }
        if (Array.isArray(activity.photoUrls)) {
          return activity.photoUrls;
        }
      }
      // Fallback to single photoUrl
      if (activity.photoUrl) {
        return [activity.photoUrl];
      }
    } catch (error) {
      console.error("Error parsing photoUrls:", error);
    }
    return [];
  };

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

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="shopping">Einkäufe</SelectItem>
                <SelectItem value="task">Aufgaben</SelectItem>
                <SelectItem value="project">Projekte</SelectItem>
                <SelectItem value="member">Mitglieder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activities list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Lädt Verlauf...
          </div>
        ) : filteredActivities.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery || filterType !== "all"
                ? "Keine Aktivitäten gefunden, die Ihren Filterkriterien entsprechen."
                : "Noch keine Aktivitäten vorhanden."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => {
              const photoUrls = parsePhotoUrls(activity);
              
              return (
                <Card key={activity.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activityType, activity.action)}`}>
                        {getActivityIcon(activity.activityType, activity.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium">{activity.description}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(activity.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                          </span>
                        </div>

                        {/* Member name */}
                        <p className="text-sm text-muted-foreground mb-2">
                          von {activity.memberName || "Unbekannt"}
                        </p>

                        {/* Task details */}
                        {activity.taskDetails && (
                          <div className="mt-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-semibold text-accent">Aufgabe:</span>
                                <span className="text-sm font-medium">{activity.taskDetails.name}</span>
                              </div>
                              {activity.taskDetails.description && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-accent">Beschreibung:</span>
                                  <span className="text-sm text-muted-foreground">{activity.taskDetails.description}</span>
                                </div>
                              )}
                              {activity.taskDetails.assignedToName && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-accent">Verantwortlich:</span>
                                  <span className="text-sm">{activity.taskDetails.assignedToName}</span>
                                </div>
                              )}
                              {activity.taskDetails.dueDate && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-accent">Fällig:</span>
                                  <span className="text-sm">
                                    {new Date(activity.taskDetails.dueDate).toLocaleDateString("de-DE", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Comment */}
                        {activity.comment && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-sm">{activity.comment}</p>
                            </div>
                          </div>
                        )}

                        {/* Photos */}
                        {photoUrls.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {photoUrls.length} Foto{photoUrls.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {photoUrls.map((url, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSelectedImage(url)}
                                  className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                                >
                                  <img
                                    src={url}
                                    alt={`Foto ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] w-full">
            <img
              src={selectedImage}
              alt="Vollbild"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
