import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import {
  requestNotificationPermission,
  getNotificationPermission,
  areNotificationsSupported,
  showNotification,
} from "@/lib/pushNotifications";
import { toast } from "sonner";

export function NotificationSettings() {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted');

  useEffect(() => {
    setPermission(getNotificationPermission());
    setPushEnabled(getNotificationPermission() === 'granted');
  }, []);

  const handleEnablePush = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    
    if (result === 'granted') {
      setPushEnabled(true);
      toast.success('Browser-Benachrichtigungen aktiviert');
      
      // Show test notification
      showNotification('Benachrichtigungen aktiviert', {
        body: 'Sie erhalten jetzt Browser-Benachrichtigungen für wichtige Ereignisse',
      });
    } else if (result === 'denied') {
      setPushEnabled(false);
      toast.error('Benachrichtigungen wurden blockiert. Bitte ändern Sie die Browser-Einstellungen.');
    }
  };

  const handleDisablePush = () => {
    setPushEnabled(false);
    toast.info('Browser-Benachrichtigungen deaktiviert. Berechtigungen können in den Browser-Einstellungen widerrufen werden.');
  };

  const handleTestNotification = () => {
    if (permission === 'granted') {
      showNotification('Test-Benachrichtigung', {
        body: 'Dies ist eine Test-Benachrichtigung vom Haushaltsmanager',
        requireInteraction: false,
      });
      toast.success('Test-Benachrichtigung gesendet');
    } else {
      toast.error('Benachrichtigungen sind nicht aktiviert');
    }
  };

  if (!areNotificationsSupported()) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benachrichtigungseinstellungen</DialogTitle>
            <DialogDescription>
              Ihr Browser unterstützt keine Push-Benachrichtigungen.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Benachrichtigungseinstellungen</DialogTitle>
          <DialogDescription>
            Verwalten Sie Ihre Benachrichtigungspräferenzen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Push Notifications */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Label htmlFor="push-notifications" className="text-base">
                Browser-Benachrichtigungen
              </Label>
              <p className="text-sm text-muted-foreground">
                Erhalten Sie Benachrichtigungen auch wenn der Browser geschlossen ist
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={pushEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleEnablePush();
                } else {
                  handleDisablePush();
                }
              }}
            />
          </div>

          {/* Permission Status */}
          {permission === 'denied' && (
            <div className="rounded-lg bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                Benachrichtigungen wurden blockiert. Bitte ändern Sie die Berechtigungen in Ihren Browser-Einstellungen.
              </p>
            </div>
          )}

          {/* Test Notification Button */}
          {permission === 'granted' && (
            <Button
              onClick={handleTestNotification}
              variant="outline"
              className="w-full"
            >
              Test-Benachrichtigung senden
            </Button>
          )}

          {/* Info */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Hinweis:</strong> Sie erhalten Benachrichtigungen für:
            </p>
            <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Fällige Aufgaben (1 Tag vorher und am Tag selbst)</li>
              <li>Neue Aufgabenzuweisungen</li>
              <li>Kommentare auf Ihren Aufgaben</li>
              <li>Wichtige Haushaltsereignisse</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
