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
import { ArrowLeft, Edit2, Trash2, Plus, Calendar } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { BorrowRequestDialog } from "@/components/BorrowRequestDialog";
import { BorrowGuidelinesEditor } from "@/components/BorrowGuidelinesEditor";
import { BorrowReturnDialog } from "@/components/BorrowReturnDialog";

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
  const [editPhotos, setEditPhotos] = useState<{url: string, filename: string}[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState<number | null>(null);

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

  const { data: borrowRequests = [] } = trpc.borrow.listByItem.useQuery(
    { itemId },
    { enabled: !!itemId }
  );

  const uploadMutation = trpc.upload.uploadPhoto.useMutation({
    onSuccess: (data: { url: string, filename: string }) => {
      setEditPhotos([...editPhotos, { url: data.url, filename: data.filename }]);
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

  const borrowRequestMutation = trpc.borrow.request.useMutation({
    onSuccess: (data) => {
      setShowBorrowDialog(false);
      if (data.autoApproved) {
        toast.success("Ausleih-Anfrage automatisch genehmigt (Haushaltseigentum)");
      } else {
        toast.success("Ausleih-Anfrage gesendet. Warte auf Genehmigung.");
      }
      utils.borrow.listByItem.invalidate({ itemId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const approveMutation = trpc.borrow.approve.useMutation({
    onSuccess: () => {
      toast.success("Anfrage genehmigt");
      utils.borrow.listByItem.invalidate({ itemId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.borrow.reject.useMutation({
    onSuccess: () => {
      toast.success("Anfrage abgelehnt");
      utils.borrow.listByItem.invalidate({ itemId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleBorrowRequest = (data: { startDate: Date; endDate: Date; message?: string }) => {
    if (!household || !member) return;

    borrowRequestMutation.mutate({
      inventoryItemId: itemId,
      borrowerHouseholdId: household.householdId,
      borrowerMemberId: member.memberId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
      requestMessage: data.message,
    });
  };

  const handleApprove = (requestId: number) => {
    if (!member) return;
    approveMutation.mutate({
      requestId,
      approverId: member.memberId,
    });
  };

  const handleReject = (requestId: number) => {
    if (!member) return;
    rejectMutation.mutate({
      requestId,
      approverId: member.memberId,
    });
  };

  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditDetails(item.details || "");
      setEditCategoryId(item.categoryId);
      setEditOwnershipType(item.ownershipType);
      setEditOwnerIds(item.owners.map((o: any) => o.memberId));
      // Convert string[] to object[] if needed
      const photos = item.photoUrls || [];
      const convertedPhotos = photos.map((p: any) => 
        typeof p === 'string' ? { url: p, filename: 'Foto' } : p
      );
      setEditPhotos(convertedPhotos);
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
              <Button variant="default" onClick={() => setShowBorrowDialog(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Ausleihen
              </Button>
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
                      <img src={photo.url} alt={photo.filename} className="w-16 h-16 object-cover rounded" />
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
                      {item.photoUrls.map((photo: string | {url: string, filename: string}, index: number) => (
                        <img
                          key={index}
                          src={typeof photo === 'string' ? photo : photo.url}
                          alt={typeof photo === 'string' ? `${item.name} ${index + 1}` : photo.filename}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Borrow Requests */}
            {borrowRequests.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Ausleih-Anfragen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {borrowRequests.map((request: any) => {
                      const isPending = request.status === 'pending';
                      const isApproved = request.status === 'approved';
                      const isActive = request.status === 'active';
                      const isCompleted = request.status === 'completed';
                      const isRejected = request.status === 'rejected';

                      return (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium">
                                {members.find(m => m.id === request.borrowerMemberId)?.memberName || 'Unbekannt'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(request.startDate).toLocaleDateString('de-DE')} - {new Date(request.endDate).toLocaleDateString('de-DE')}
                              </div>
                            </div>
                            <div>
                              {isPending && (
                                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  Ausstehend
                                </span>
                              )}
                              {isApproved && (
                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Genehmigt
                                </span>
                              )}
                              {isActive && (
                                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  Ausgeliehen
                                </span>
                              )}
                              {isCompleted && (
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                  Zurückgegeben
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  Abgelehnt
                                </span>
                              )}
                            </div>
                          </div>

                          {request.requestMessage && (
                            <div className="text-sm text-muted-foreground mb-3">
                              "{request.requestMessage}"
                            </div>
                          )}

                          {isPending && item.ownershipType === 'personal' && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(request.id)}
                                disabled={approveMutation.isPending}
                              >
                                Genehmigen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request.id)}
                                disabled={rejectMutation.isPending}
                              >
                                Ablehnen
                              </Button>
                            </div>
                          )}

                          {isActive && request.borrowerMemberId === member?.memberId && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedReturnRequest(request.id);
                                  setShowReturnDialog(true);
                                }}
                              >
                                Zurückgeben
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Guidelines Editor - Only for owners */}
            {item && item.ownershipType === 'personal' && item.owners?.some((owner: any) => owner.memberId === member?.memberId) && (
              <div className="mb-6">
                <BorrowGuidelinesEditor
                  itemId={itemId}
                  memberId={member?.memberId ?? 0}
                  onSave={() => {
                    toast.success("Ausleihvorgaben gespeichert");
                  }}
                />
              </div>
            )}

            {/* Guidelines Editor - For household items, any member can edit */}
            {item && item.ownershipType === 'household' && (
              <div className="mb-6">
                <BorrowGuidelinesEditor
                  itemId={itemId}
                  memberId={member?.memberId ?? 0}
                  onSave={() => {
                    toast.success("Ausleihvorgaben gespeichert");
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <BorrowRequestDialog
        open={showBorrowDialog}
        onOpenChange={setShowBorrowDialog}
        itemName={item.name}
        itemId={itemId}
        onSubmit={handleBorrowRequest}
        isSubmitting={borrowRequestMutation.isPending}
      />

      {selectedReturnRequest && (
        <BorrowReturnDialog
          open={showReturnDialog}
          onOpenChange={setShowReturnDialog}
          borrowRequestId={selectedReturnRequest}
          itemId={itemId}
          itemName={item.name}
          onSuccess={() => {
            utils.borrow.listByItem.invalidate({ itemId });
            setShowReturnDialog(false);
            setSelectedReturnRequest(null);
          }}
        />
      )}

      <BottomNav />
    </AppLayout>
  );
}
