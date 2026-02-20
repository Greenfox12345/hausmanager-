import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, X, User } from "lucide-react";
import { useRef } from "react";
import { ImageCropEditor } from "@/components/ImageCropEditor";

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
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Upload profile image mutation
  const uploadProfileImageMutation = trpc.userProfile.uploadProfileImage.useMutation({
    onSuccess: (data) => {
      toast.success("Profilbild erfolgreich hochgeladen");
      utils.userProfile.getProfile.invalidate();
      utils.userAuth.getCurrentUser.invalidate();
      setProfileImagePreview(null);
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Hochladen des Profilbilds");
      setIsUploading(false);
    },
  });

  // Delete profile image mutation
  const deleteProfileImageMutation = trpc.userProfile.deleteProfileImage.useMutation({
    onSuccess: () => {
      toast.success("Profilbild erfolgreich entfernt");
      utils.userProfile.getProfile.invalidate();
      utils.userAuth.getCurrentUser.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Entfernen des Profilbilds");
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wählen Sie eine Bilddatei aus");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5MB groß sein");
      return;
    }

    // Read image and open crop editor
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string;
      setSelectedImageForCrop(imageDataUrl);
      setCropEditorOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedImageDataUrl: string) => {
    setProfileImagePreview(croppedImageDataUrl);
    setCropEditorOpen(false);
    setSelectedImageForCrop(null);
  };

  const handleUploadImage = async () => {
    if (!profileImagePreview) return;

    setIsUploading(true);
    await uploadProfileImageMutation.mutateAsync({
      imageData: profileImagePreview,
      mimeType: "image/jpeg",
    });
  };

  const handleDeleteImage = async () => {
    if (confirm("Möchten Sie Ihr Profilbild wirklich entfernen?")) {
      await deleteProfileImageMutation.mutateAsync();
    }
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
              {/* Profile Image Section */}
              <div className="space-y-2">
                <Label>Profilbild</Label>
                <div className="flex items-center gap-4">
                  {/* Current or Preview Image */}
                  <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Vorschau" className="h-full w-full object-cover" />
                    ) : profile?.profileImageUrl ? (
                      <img src={profile.profileImageUrl} alt="Profilbild" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {profileImagePreview ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUploadImage}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Hochladen...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Hochladen
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setProfileImagePreview(null)}
                          disabled={isUploading}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Abbrechen
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {profile?.profileImageUrl ? "Bild ändern" : "Bild hochladen"}
                        </Button>
                        {profile?.profileImageUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeleteImage}
                            disabled={deleteProfileImageMutation.isPending}
                          >
                            {deleteProfileImageMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <X className="mr-2 h-4 w-4" />
                            )}
                            Entfernen
                          </Button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">JPEG, PNG oder WebP, max. 5MB</p>
                  </div>
                </div>
              </div>

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

      {/* Image Crop Editor */}
      {selectedImageForCrop && (
        <ImageCropEditor
          open={cropEditorOpen}
          onOpenChange={setCropEditorOpen}
          imageSrc={selectedImageForCrop}
          onCropComplete={handleCropComplete}
          isProcessing={false}
        />
      )}
    </Dialog>
  );
}
