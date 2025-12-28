import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Clock, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { toast } from "sonner";

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettings({ open, onOpenChange }: NotificationSettingsProps) {
  const { household, member } = useCompatAuth();
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false);
  const [taskAssignedEnabled, setTaskAssignedEnabled] = useState(true);
  const [taskDueEnabled, setTaskDueEnabled] = useState(true);
  const [taskCompletedEnabled, setTaskCompletedEnabled] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [dndStartTime, setDndStartTime] = useState("");
  const [dndEndTime, setDndEndTime] = useState("");
  const [permissionStatus, setPermissionStatus] = useState<"default" | "granted" | "denied">("default");

  // Load preferences
  const { data: preferences, refetch } = trpc.notifications.getPreferences.useQuery(
    {
      householdId: household?.householdId ?? 0,
      memberId: member?.memberId ?? 0,
    },
    {
      enabled: !!household && !!member && open,
    }
  );

  // Update preferences mutation
  const updatePreferences = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Einstellungen gespeichert");
    },
  });

  // Load preferences when dialog opens
  useEffect(() => {
    if (preferences) {
      setBrowserPushEnabled(preferences.enableBrowserPush ?? false);
      setTaskAssignedEnabled(preferences.enableTaskAssigned ?? true);
      setTaskDueEnabled(preferences.enableTaskDue ?? true);
      setTaskCompletedEnabled(preferences.enableTaskCompleted ?? true);
      setCommentsEnabled(preferences.enableComments ?? true);
      setDndStartTime(preferences.dndStartTime ?? "");
      setDndEndTime(preferences.dndEndTime ?? "");
    }
  }, [preferences]);

  // Check notification permission status
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleBrowserPushToggle = async (enabled: boolean) => {
    if (enabled && permissionStatus === "default") {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission !== "granted") {
        toast.error("Benachrichtigungen wurden nicht erlaubt");
        return;
      }
      toast.success("Browser-Benachrichtigungen aktiviert");
    }

    setBrowserPushEnabled(enabled);
    if (household?.householdId && member?.memberId) {
      updatePreferences.mutate({
        householdId: household.householdId,
        memberId: member.memberId,
        enableBrowserPush: enabled,
      });
    }
  };

  const handlePreferenceToggle = (key: string, value: boolean) => {
    if (!household?.householdId || !member?.memberId) return;

    const updates: any = {
      householdId: household.householdId,
      memberId: member.memberId,
    };
    updates[key] = value;

    updatePreferences.mutate(updates);
  };

  const handleDndTimeChange = () => {
    if (!household?.householdId || !member?.memberId) return;

    updatePreferences.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      dndStartTime: dndStartTime || null,
      dndEndTime: dndEndTime || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Benachrichtigungseinstellungen
          </DialogTitle>
          <DialogDescription>
            Passen Sie an, welche Benachrichtigungen Sie erhalten möchten
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Browser Push Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="browser-push" className="text-base font-medium">
                Browser-Benachrichtigungen
              </Label>
              <Switch
                id="browser-push"
                checked={browserPushEnabled}
                onCheckedChange={handleBrowserPushToggle}
                disabled={permissionStatus === "denied"}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Erhalten Sie Benachrichtigungen auch wenn der Browser geschlossen ist
            </p>
            {permissionStatus === "denied" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Benachrichtigungen wurden blockiert. Bitte aktivieren Sie sie in den Browser-Einstellungen.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium">Benachrichtigungstypen</h3>

            {/* Task Assigned */}
            <div className="flex items-center justify-between">
              <Label htmlFor="task-assigned" className="text-sm">
                Aufgabenzuweisungen
              </Label>
              <Switch
                id="task-assigned"
                checked={taskAssignedEnabled}
                onCheckedChange={(checked) => {
                  setTaskAssignedEnabled(checked);
                  handlePreferenceToggle("enableTaskAssigned", checked);
                }}
              />
            </div>

            {/* Task Due */}
            <div className="flex items-center justify-between">
              <Label htmlFor="task-due" className="text-sm">
                Fällige Aufgaben
              </Label>
              <Switch
                id="task-due"
                checked={taskDueEnabled}
                onCheckedChange={(checked) => {
                  setTaskDueEnabled(checked);
                  handlePreferenceToggle("enableTaskDue", checked);
                }}
              />
            </div>

            {/* Task Completed */}
            <div className="flex items-center justify-between">
              <Label htmlFor="task-completed" className="text-sm">
                Erledigte Aufgaben
              </Label>
              <Switch
                id="task-completed"
                checked={taskCompletedEnabled}
                onCheckedChange={(checked) => {
                  setTaskCompletedEnabled(checked);
                  handlePreferenceToggle("enableTaskCompleted", checked);
                }}
              />
            </div>

            {/* Comments */}
            <div className="flex items-center justify-between">
              <Label htmlFor="comments" className="text-sm">
                Kommentare
              </Label>
              <Switch
                id="comments"
                checked={commentsEnabled}
                onCheckedChange={(checked) => {
                  setCommentsEnabled(checked);
                  handlePreferenceToggle("enableComments", checked);
                }}
              />
            </div>
          </div>

          {/* Do Not Disturb */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-sm font-medium">Nicht stören</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Keine Benachrichtigungen während dieser Zeit
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dnd-start" className="text-xs">
                  Von
                </Label>
                <Input
                  id="dnd-start"
                  type="time"
                  value={dndStartTime}
                  onChange={(e) => setDndStartTime(e.target.value)}
                  onBlur={handleDndTimeChange}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dnd-end" className="text-xs">
                  Bis
                </Label>
                <Input
                  id="dnd-end"
                  type="time"
                  value={dndEndTime}
                  onChange={(e) => setDndEndTime(e.target.value)}
                  onBlur={handleDndTimeChange}
                  className="mt-1"
                />
              </div>
            </div>
            {dndStartTime && dndEndTime && (
              <p className="text-xs text-muted-foreground">
                Aktiv von {dndStartTime} bis {dndEndTime} Uhr
              </p>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Einstellungen werden automatisch gespeichert
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
