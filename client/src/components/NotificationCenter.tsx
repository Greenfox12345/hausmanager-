import { useState } from "react";
import { Bell, Settings, X, Check, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationCenterProps {
  householdId: number;
  memberId: number;
}

export function NotificationCenter({ householdId, memberId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = trpc.notifications.getNotifications.useQuery(
    { householdId, memberId },
    { enabled: isOpen }
  );

  // Fetch unread count
  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(
    { householdId, memberId },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch settings
  const { data: settings } = trpc.notifications.getSettings.useQuery(
    { memberId },
    { enabled: isSettingsOpen }
  );

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const deleteNotificationMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const updateSettingsMutation = trpc.notifications.updateSettings.useMutation();

  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }

    // Navigate to related item
    if (notification.relatedItemType === "task" && notification.relatedItemId) {
      setIsOpen(false);
      setLocation(`/tasks`);
    } else if (notification.relatedItemType === "project" && notification.relatedItemId) {
      setIsOpen(false);
      setLocation(`/projects`);
    } else if (notification.relatedItemType === "proposal") {
      setIsOpen(false);
      setLocation(`/tasks`);
    }
  };

  const handleSettingChange = (key: string, value: boolean) => {
    updateSettingsMutation.mutate({
      memberId,
      [key]: value,
    });
  };

  return (
    <>
      {/* Bell Icon with Badge */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notification Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Benachrichtigungen</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSettingsOpen(true)}
                  title="Einstellungen"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between p-2 border-b bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate({ householdId, memberId })}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Alle als gelesen markieren
                </Button>
              </div>
            )}

            {/* Notifications List */}
            <ScrollArea className="flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <p>Keine Benachrichtigungen</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{notification.title}</h3>
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.createdAt).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate({ notificationId: notification.id });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benachrichtigungseinstellungen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="taskAssigned">Aufgabe zugewiesen</Label>
              <Switch
                id="taskAssigned"
                checked={settings?.taskAssigned ?? true}
                onCheckedChange={(checked) => handleSettingChange("taskAssigned", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="taskCompleted">Aufgabe erledigt</Label>
              <Switch
                id="taskCompleted"
                checked={settings?.taskCompleted ?? true}
                onCheckedChange={(checked) => handleSettingChange("taskCompleted", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="taskDueSoon">Aufgabe bald fällig</Label>
              <Switch
                id="taskDueSoon"
                checked={settings?.taskDueSoon ?? true}
                onCheckedChange={(checked) => handleSettingChange("taskDueSoon", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="taskOverdue">Aufgabe überfällig</Label>
              <Switch
                id="taskOverdue"
                checked={settings?.taskOverdue ?? true}
                onCheckedChange={(checked) => handleSettingChange("taskOverdue", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="editProposal">Bearbeitungsvorschlag</Label>
              <Switch
                id="editProposal"
                checked={settings?.editProposal ?? true}
                onCheckedChange={(checked) => handleSettingChange("editProposal", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dependencyProposal">Abhängigkeitsvorschlag</Label>
              <Switch
                id="dependencyProposal"
                checked={settings?.dependencyProposal ?? true}
                onCheckedChange={(checked) => handleSettingChange("dependencyProposal", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="proposalApproved">Vorschlag genehmigt</Label>
              <Switch
                id="proposalApproved"
                checked={settings?.proposalApproved ?? true}
                onCheckedChange={(checked) => handleSettingChange("proposalApproved", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="proposalRejected">Vorschlag abgelehnt</Label>
              <Switch
                id="proposalRejected"
                checked={settings?.proposalRejected ?? true}
                onCheckedChange={(checked) => handleSettingChange("proposalRejected", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="projectUpdate">Projekt-Update</Label>
              <Switch
                id="projectUpdate"
                checked={settings?.projectUpdate ?? true}
                onCheckedChange={(checked) => handleSettingChange("projectUpdate", checked)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
