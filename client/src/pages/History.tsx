import { useState } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
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
  Search,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";

export default function History() {
  const [, setLocation] = useLocation();
  const { household, isAuthenticated } = useCompatAuth();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const { data, isLoading } = trpc.household.getActivityHistory.useQuery(
    { 
      householdId: household?.householdId ?? 0,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    },
    { enabled: !!household }
  );
  
  const activities = data?.activities || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Auth check removed - AppLayout handles this

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
    if (action === "borrow_revoked") return <Bell className="h-5 w-5" />;
    if (action === "item_added") return <ShoppingCart className="h-5 w-5" />;
    if (action === "borrow_approved") return <CheckCircle2 className="h-5 w-5" />;
    return <CheckCircle2 className="h-5 w-5" />;
  };

  const getActivityColor = (type: string, action: string) => {
    if (type === "shopping") return "text-blue-600 bg-blue-50";
    if (action === "completed") return "text-green-600 bg-green-50";
    if (action === "milestone") return "text-purple-600 bg-purple-50";
    if (action === "reminder") return "text-yellow-600 bg-yellow-50";
    if (action === "borrow_revoked") return "text-red-600 bg-red-50";
    if (action === "item_added") return "text-indigo-600 bg-indigo-50";
    if (action === "borrow_approved") return "text-emerald-600 bg-emerald-50";
    return "text-gray-600 bg-gray-50";
  };

  const parsePhotoUrls = (activity: any): {url: string, filename: string}[] => {
    try {
      if (activity.photoUrls) {
        if (typeof activity.photoUrls === "string") {
          return JSON.parse(activity.photoUrls);
        }
        if (Array.isArray(activity.photoUrls)) {
          return activity.photoUrls;
        }
      }
      // Fallback to single photoUrl (old format)
      if (activity.photoUrl) {
        return [{url: activity.photoUrl, filename: "Foto"}];
      }
    } catch (error) {
      console.error("Error parsing photoUrls:", error);
    }
    return [];
  };

  const parseFileUrls = (activity: any): {url: string, filename: string}[] => {
    try {
      if (activity.fileUrls) {
        if (typeof activity.fileUrls === "string") {
          return JSON.parse(activity.fileUrls);
        }
        if (Array.isArray(activity.fileUrls)) {
          return activity.fileUrls;
        }
      }
    } catch (error) {
      console.error("Error parsing fileUrls:", error);
    }
    return [];
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl pb-24">
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
            <p className="text-muted-foreground">{household?.householdName || "Kein Haushalt ausgewählt"}</p>
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
                              {(activity.taskDetails.dueDate || (activity.metadata && (activity.metadata as any).originalDueDate)) && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-accent">
                                    {activity.action === "completed" ? "Termin am:" : "Fällig:"}
                                  </span>
                                  <span className="text-sm">
                                    {new Date(
                                      (activity.metadata && (activity.metadata as any).originalDueDate) || activity.taskDetails.dueDate
                                    ).toLocaleDateString("de-DE", {
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

                        {/* Borrow Revoked Details */}
                        {activity.action === "borrow_revoked" && activity.metadata && (() => {
                          const meta = activity.metadata as any;
                          return (
                            <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                              <div className="space-y-1.5">
                                {meta.itemName && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Gegenstand:</span>
                                    <span className="text-sm">{meta.itemName}</span>
                                  </div>
                                )}
                                {meta.borrowerName && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Ausleiher:</span>
                                    <span className="text-sm">{meta.borrowerName}</span>
                                  </div>
                                )}
                                {meta.startDate && meta.endDate && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Zeitraum:</span>
                                    <span className="text-sm">
                                      {new Date(meta.startDate).toLocaleDateString('de-DE')} - {new Date(meta.endDate).toLocaleDateString('de-DE')}
                                    </span>
                                  </div>
                                )}
                                {meta.reason && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Begr\u00fcndung:</span>
                                    <span className="text-sm">{meta.reason}</span>
                                  </div>
                                )}
                                {meta.revokedBy && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Widerrufen von:</span>
                                    <span className="text-sm">{meta.revokedBy}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Item Added Details */}
                        {activity.action === "item_added" && activity.metadata && (() => {
                          const meta = activity.metadata as any;
                          return (
                            <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-900">
                              <div className="space-y-1.5">
                                {meta.taskName && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Aufgabe:</span>
                                    <span className="text-sm">{meta.taskName}</span>
                                  </div>
                                )}
                                {meta.occurrenceNumber && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Termin:</span>
                                    <span className="text-sm">Termin {meta.occurrenceNumber}</span>
                                  </div>
                                )}
                                {meta.inventoryItemName && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Gegenstand:</span>
                                    <span className="text-sm">{meta.inventoryItemName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Borrow Approved Details */}
                        {activity.action === "borrow_approved" && activity.metadata && (() => {
                          const meta = activity.metadata as any;
                          return (
                            <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900">
                              <div className="space-y-1.5">
                                {meta.itemName && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Gegenstand:</span>
                                    <span className="text-sm">{meta.itemName}</span>
                                  </div>
                                )}
                                {meta.taskName && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Aufgabe:</span>
                                    <span className="text-sm">{meta.taskName} (Termin {meta.occurrenceNumber})</span>
                                  </div>
                                )}
                                {meta.borrowerName && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Ausleiher:</span>
                                    <span className="text-sm">{meta.borrowerName}</span>
                                  </div>
                                )}
                                {meta.startDate && meta.endDate && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Zeitraum:</span>
                                    <span className="text-sm">
                                      {new Date(meta.startDate).toLocaleDateString('de-DE')} - {new Date(meta.endDate).toLocaleDateString('de-DE')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

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
                              {photoUrls.map((photo, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSelectedImage(photo.url)}
                                  className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                                >
                                  <img
                                    src={photo.url}
                                    alt={photo.filename}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PDFs */}
                        {(() => {
                          const fileUrls = parseFileUrls(activity);
                          return fileUrls.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {fileUrls.length} PDF{fileUrls.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {fileUrls.map((file, index) => (
                                  <a
                                    key={index}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary hover:bg-accent/5 transition-colors"
                                  >
                                    <FileText className="h-5 w-5 text-red-600 shrink-0" />
                                    <span className="text-sm truncate">{file.filename}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
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
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isLoading}
          >
            Zurück
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={isLoading}
                  className="w-9"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || isLoading}
          >
            Weiter
          </Button>
          
          <span className="text-sm text-muted-foreground ml-2">
            Seite {currentPage} von {totalPages}
          </span>
        </div>
      )}
      <BottomNav />
    </AppLayout>
  );
}
