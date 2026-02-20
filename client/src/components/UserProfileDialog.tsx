import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const utils = trpc.useUtils();
  
  // Get current profile
  const { data: profile, isLoading } = trpc.userProfile.getProfile.useQuery(undefined, {
    enabled: open,
  });

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Update profile mutation
  const updateProfileMutation = trpc.userProfile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil erfolgreich aktualisiert");
      utils.userProfile.getProfile.invalidate();
      utils.userAuth.getCurrentUser.invalidate();
      resetProfileForm();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Aktualisieren des Profils");
    },
  });

  // Change password mutation
  const changePasswordMutation = trpc.userProfile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Passwort erfolgreich geändert");
      resetPasswordForm();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Ändern des Passworts");
    },
  });

  // Initialize form when profile loads
  useState(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
    }
  });

  // Update form when profile changes
  if (profile && name === "" && email === "") {
    setName(profile.name || "");
    setEmail(profile.email || "");
  }

  const resetProfileForm = () => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleUpdateProfile = () => {
    if (!name.trim()) {
      toast.error("Name darf nicht leer sein");
      return;
    }

    if (!email.trim()) {
      toast.error("E-Mail darf nicht leer sein");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      return;
    }

    updateProfileMutation.mutate({
      name: name.trim(),
      email: email.trim(),
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error("Bitte geben Sie Ihr aktuelles Passwort ein");
      return;
    }

    if (!newPassword) {
      toast.error("Bitte geben Sie ein neues Passwort ein");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profil bearbeiten</DialogTitle>
          <DialogDescription>
            Ändern Sie Ihre persönlichen Informationen oder Ihr Passwort.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Allgemein</TabsTrigger>
              <TabsTrigger value="password">Passwort ändern</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Ihr Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre.email@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichere...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetProfileForm}
                  disabled={updateProfileMutation.isPending}
                >
                  Zurücksetzen
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="password" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">Mindestens 8 Zeichen</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  className="flex-1"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ändere...
                    </>
                  ) : (
                    "Passwort ändern"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetPasswordForm}
                  disabled={changePasswordMutation.isPending}
                >
                  Zurücksetzen
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
