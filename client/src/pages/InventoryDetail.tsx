import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Trash2, Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export default function InventoryDetail() {
  const params = useParams<{ id: string }>();
  const itemId = Number(params.id);
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editOwnershipType, setEditOwnershipType] = useState<"personal" | "household">("household");
  const [editOwnerIds, setEditOwnerIds] = useState<number[]>([]);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const utils = trpc.useUtils();
  const { data: item, isLoading } = trpc.inventory.getById.useQuery(
    { itemId },
    { enabled: !!household && !!itemId }
  );

  const { data: categories = [] } = trpc.shopping.listCategories.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const uploadMutation = trpc.upload.uploadPhoto.useMutation({
    onSuccess: (data: { url: string }) => {
      setEditPhotos([...editPhotos, data.url]);
      setUploadingPhoto(false);
      toast.success("Foto hochgeladen");
    },
    onError: (error: any) => {
      setUploadingPhoto(false);
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      utils.inventory.getById.invalidate({ itemId });
      utils.inventory.list.invalidate();
      setIsEditing(false);
      toast.success("Artikel aktualisiert");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success("Artikel gelöscht");
      setLocation("/inventory");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditDetails(item.details || "");
      setEditCategoryId(item.categoryId);
      setEditOwnershipType(item.ownershipType);
      setEditOwnerIds(item.owners.map((o: any) => o.memberId));
      setEditPhotos(item.photoUrls || []);
    }
  }, [item]);

  if (!isAuthenticated || !household || !member) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-6 max-w-4xl">
          <div className="text-center py-12 text-muted-foreground">Lädt...</div>
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="container py-6 max-w-4xl">
          <div className="text-center py-12 text-muted-foreground">Artikel nicht gefunden</div>
        </div>
      </AppLayout>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editPhotos.length >= 5) {
      toast.error("Maximal 5 Fotos erlaubt");
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadMutation.mutate({
        photo: base64,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setEditPhotos(editPhotos.filter((_, i) => i !== index));
  };

  const handleToggleOwner = (memberId: number) => {
    if (editOwnerIds.includes(memberId)) {
      setEditOwnerIds(editOwnerIds.filter(id => id !== memberId));
    } else {
      setEditOwnerIds([...editOwnerIds, memberId]);
    }
  };

  const handleSave = () => {
    if (!editName.trim() || !editCategoryId) {
      toast.error("Name und Kategorie sind erforderlich");
      return;
    }

    if (editOwnershipType === 'personal' && editOwnerIds.length === 0) {
      toast.error("Bitte wähle mindestens einen Eigentümer");
      return;
    }

    updateMutation.mutate({
      itemId,
      name: editName.trim(),
      details: editDetails.trim() || undefined,
      categoryId: editCategoryId,
      photoUrls: editPhotos,
      ownershipType: editOwnershipType,
      ownerIds: editOwnershipType === 'personal' ? editOwnerIds : [],
    });
  };

  const handleDelete = () => {
    if (confirm("Artikel wirklich löschen?")) {
      deleteMutation.mutate({ itemId });
    }
  };

  const getCategoryStyle = (color: string) => {
    return {
      backgroundColor: color + '20',
      borderColor: color,
      color: color,
    };
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl pb-24">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/inventory")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div className="flex-1" />
          {!isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            </>
          )}
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Artikel bearbeiten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="editName">Name *</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="editDetails">Details</Label>
                <Input
                  id="editDetails"
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="editCategory">Kategorie *</Label>
                <Select
                  value={editCategoryId?.toString() || ""}
                  onValueChange={(value) => setEditCategoryId(Number(value))}
                >
                  <SelectTrigger id="editCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fotos (max. 5)</Label>
                <div className="space-y-2">
                  {editPhotos.map((photo, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <img src={photo} alt="Preview" className="w-16 h-16 object-cover rounded" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editPhotos.length < 5 && (
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                      {uploadingPhoto && <p className="text-sm text-muted-foreground mt-1">Lädt hoch...</p>}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Eigentum *</Label>
                <Select
                  value={editOwnershipType}
                  onValueChange={(value: "personal" | "household") => {
                    setEditOwnershipType(value);
                    if (value === 'household') {
                      setEditOwnerIds([]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household">Haushaltseigentum</SelectItem>
                    <SelectItem value="personal">Persönliches Eigentum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editOwnershipType === 'personal' && (
                <div>
                  <Label>Eigentümer auswählen *</Label>
                  <div className="space-y-2 mt-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit-owner-${m.id}`}
                          checked={editOwnerIds.includes(m.id)}
                          onChange={() => handleToggleOwner(m.id)}
                          className="rounded"
                        />
                        <Label htmlFor={`edit-owner-${m.id}`} className="cursor-pointer">
                          {m.memberName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSave}>Speichern</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{item.name}</CardTitle>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs border"
                    style={getCategoryStyle(item.categoryColor || '#3b82f6')}
                  >
                    {item.categoryName}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.details && (
                  <div>
                    <Label className="text-muted-foreground">Details</Label>
                    <p>{item.details}</p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Eigentum</Label>
                  <p>
                    {item.ownershipType === 'household' 
                      ? 'Haushaltseigentum' 
                      : `Persönliches Eigentum: ${item.owners.map((o: any) => o.memberName).join(', ')}`
                    }
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Erstellt von</Label>
                  <p>{item.creatorName} am {new Date(item.createdAt).toLocaleDateString('de-DE')}</p>
                </div>

                {item.photoUrls && item.photoUrls.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Fotos</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {item.photoUrls.map((photo: string, index: number) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`${item.name} ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </AppLayout>
  );
}
