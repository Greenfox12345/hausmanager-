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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Trash2, Calendar, Globe, Lock, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { BorrowRequestDialog } from "@/components/BorrowRequestDialog";
import { BorrowGuidelinesEditor } from "@/components/BorrowGuidelinesEditor";
import { BorrowReturnDialog } from "@/components/BorrowReturnDialog";
import { RevokeApprovalDialog } from "@/components/RevokeApprovalDialog";
import { BorrowProtocol } from "@/components/BorrowProtocol";
import { PhotoLightbox, ClickablePhoto } from "@/components/PhotoLightbox";
import { compressImage } from "@/lib/imageCompression";
import { useTranslation } from "react-i18next";

type Visibility = "private" | "connected" | "selected";
interface LightboxState { photos: { url: string; label?: string }[]; index: number; }

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
  const [editVisibility, setEditVisibility] = useState<Visibility>("private");
  const [editAllowedHouseholdIds, setEditAllowedHouseholdIds] = useState<number[]>([]);

  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState<number | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeRequest, setRevokeRequest] = useState<{ id: number; borrowerName: string; startDate: string; endDate: string } | null>(null);
  const [detailTab, setDetailTab] = useState<"requests" | "guidelines">("requests");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const { t } = useTranslation(["inventory", "borrow", "common"]);
  const [expandedRequests, setExpandedRequests] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

  const { data: connectedHouseholds = [] } = trpc.inventory.getConnectedHouseholds.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: allowedHouseholdIds = [] } = trpc.inventory.getAllowedHouseholds.useQuery(
    { itemId },
    { enabled: !!itemId }
  );

  const uploadMutation = trpc.upload.uploadPhoto.useMutation({
    onSuccess: (data: { url: string, filename: string }) => {
      setEditPhotos(prev => [...prev, { url: data.url, filename: data.filename }]);
      setUploadingPhoto(false);
      toast.success(t("inventory:messages.photoUploaded", "Foto hochgeladen"));
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
      utils.inventory.getAllowedHouseholds.invalidate({ itemId });
      utils.inventory.listAll.invalidate();
      setIsEditing(false);
      toast.success(t("inventory:messages.itemUpdated", "Artikel aktualisiert"));
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const setVisibilityMutation = trpc.inventory.setVisibility.useMutation({
    onSuccess: () => {
      utils.inventory.getAllowedHouseholds.invalidate({ itemId });
      utils.inventory.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success(t("inventory:messages.itemDeleted", "Artikel gelöscht"));
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
        toast.success(t("inventory:messages.borrowAutoApproved", "Ausleih-Anfrage automatisch genehmigt (Haushaltseigentum)"));
      } else {
        toast.success(t("inventory:messages.borrowRequested", "Ausleih-Anfrage gesendet. Warte auf Genehmigung."));
      }
      utils.borrow.listByItem.invalidate({ itemId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const approveMutation = trpc.borrow.approve.useMutation({
    onSuccess: () => {
      toast.success(t("inventory:messages.requestApproved", "Anfrage genehmigt"));
      utils.borrow.listByItem.invalidate({ itemId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.borrow.reject.useMutation({
    onSuccess: () => {
      toast.success(t("inventory:messages.requestRejected", "Anfrage abgelehnt"));
      utils.borrow.listByItem.invalidate({ itemId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const revokeMutation = trpc.borrow.revoke.useMutation({
    onSuccess: () => {
      toast.success(t("inventory:messages.approvalRevoked", "Genehmigung widerrufen"));
      utils.borrow.listByItem.invalidate({ itemId });
      setShowRevokeDialog(false);
      setRevokeRequest(null);
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
    approveMutation.mutate({ requestId, approverId: member.memberId });
  };

  const handleReject = (requestId: number) => {
    if (!member) return;
    rejectMutation.mutate({ requestId, approverId: member.memberId });
  };

  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditDetails(item.details || "");
      setEditCategoryId(item.categoryId);
      setEditOwnershipType(item.ownershipType);
      setEditOwnerIds(item.owners.map((o: any) => o.memberId));
      setEditVisibility((item as any).visibility ?? "private");
      const photos = item.photoUrls || [];
      const convertedPhotos = photos.map((p: any) =>
        typeof p === 'string' ? { url: p, filename: 'Foto' } : p
      );
      setEditPhotos(convertedPhotos);
    }
  }, [item]);

  useEffect(() => {
    // Always sync allowedHouseholdIds (even when empty, to reset stale state)
    setEditAllowedHouseholdIds(allowedHouseholdIds);
  }, [allowedHouseholdIds]);

  if (!isAuthenticated || !household || !member) return null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-6 max-w-4xl">
          <div className="text-center py-12 text-muted-foreground">{t("common:loading")}</div>
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="container py-6 max-w-4xl">
          <div className="text-center py-12 text-muted-foreground">{t("inventory:notFound", "Artikel nicht gefunden")}</div>
        </div>
      </AppLayout>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editPhotos.length >= 5) {
      toast.error(t("inventory:messages.maxPhotos", "Maximal 5 Fotos erlaubt"));
      return;
    }
    setUploadingPhoto(true);
    try {
      const compressedFile = await compressImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        uploadMutation.mutate({ photo: base64, filename: compressedFile.name });
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Compression error:', error);
      toast.error(t("inventory:messages.compressionError", "Fehler beim Komprimieren des Bildes"));
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEditPhotos(editPhotos.filter((_, i) => i !== index));
  };

  const handleToggleOwner = (memberId: number) => {
    setEditOwnerIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleToggleAllowedHousehold = (hid: number) => {
    setEditAllowedHouseholdIds(prev =>
      prev.includes(hid) ? prev.filter(id => id !== hid) : [...prev, hid]
    );
  };

  const handleSave = () => {
    if (!editName.trim() || !editCategoryId) {
      toast.error(t("inventory:messages.nameAndCategoryRequired", "Name und Kategorie sind erforderlich"));
      return;
    }
    if (editOwnershipType === 'personal' && editOwnerIds.length === 0) {
      toast.error(t("inventory:messages.ownerRequired", "Bitte wähle mindestens einen Eigentümer"));
      return;
    }
    if (editVisibility === 'selected' && editAllowedHouseholdIds.length === 0) {
      toast.error(t("inventory:messages.householdRequired", "Bitte wähle mindestens einen Haushalt aus"));
      return;
    }

    // Send visibility together with the update to avoid race conditions
    updateMutation.mutate({
      itemId,
      name: editName.trim(),
      details: editDetails.trim() || undefined,
      categoryId: editCategoryId,
      photoUrls: editPhotos,
      ownershipType: editOwnershipType,
      ownerIds: editOwnershipType === 'personal' ? editOwnerIds : [],
      visibility: editVisibility,
      allowedHouseholdIds: editVisibility === 'selected' ? editAllowedHouseholdIds : [],
    });
  };

  const handleDelete = () => {
    if (confirm(t("inventory:messages.confirmDelete", "Artikel wirklich löschen?"))) {
      deleteMutation.mutate({ itemId });
    }
  };

  const getCategoryStyle = (color: string) => ({
    backgroundColor: color + '20',
    borderColor: color,
    color: color,
  });

  const visibilityLabel = (v: string) => {
    if (v === 'private') return t("inventory:visibilityPrivate", "Nur dieser Haushalt");
    if (v === 'connected') return t("inventory:visibilityConnected", "Alle verknüpften Haushalte");
    if (v === 'selected') return t("inventory:visibilitySelected", "Ausgewählte Haushalte");
    return v;
  };

  const visibilityIcon = (v: string) => {
    if (v === 'private') return <Lock className="h-3 w-3" />;
    if (v === 'connected') return <Globe className="h-3 w-3" />;
    return <Users className="h-3 w-3" />;
  };

  // Determine if a borrow request is from an external household
  const isExternalRequest = (request: any) =>
    request.borrowerHouseholdId && request.borrowerHouseholdId !== household.householdId;

  const getExternalHouseholdName = (request: any) => {
    const h = connectedHouseholds.find((ch: any) => ch.id === request.borrowerHouseholdId);
    return h?.name ?? `Haushalt #${request.borrowerHouseholdId}`;
  };

  const currentVisibility = (item as any).visibility ?? "private";

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl pb-24">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/inventory")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common:actions.back", "Zurück")}
          </Button>
          <div className="flex-1" />
          {!isEditing && (
            <>
              <Button variant="default" onClick={() => setShowBorrowDialog(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                {t("borrow:borrow", "Ausleihen")}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                {t("common:actions.edit")}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common:actions.delete")}
              </Button>
            </>
          )}
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("inventory:editItem", "Artikel bearbeiten")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="editName">{t("inventory:fields.name", "Name")} *</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="editDetails">{t("inventory:fields.details", "Details")}</Label>
                <Input
                  id="editDetails"
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="editCategory">{t("inventory:fields.category", "Kategorie")} *</Label>
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
                <Label>{t("inventory:fields.photos", "Fotos")} (max. 5)</Label>
                <div className="space-y-2">
                  {editPhotos.map((photo, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <img src={photo.url} alt={photo.filename} className="w-16 h-16 object-cover rounded" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemovePhoto(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editPhotos.length < 5 && (
                    <div>
                      <Input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                      {uploadingPhoto && <p className="text-sm text-muted-foreground mt-1">{t("common:uploading", "Lädt hoch...")}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>{t("inventory:fields.ownership", "Eigentum")} *</Label>
                <Select
                  value={editOwnershipType}
                  onValueChange={(value: "personal" | "household") => {
                    setEditOwnershipType(value);
                    if (value === 'household') setEditOwnerIds([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household">{t("inventory:ownershipHousehold", "Haushaltseigentum")}</SelectItem>
                    <SelectItem value="personal">{t("inventory:ownershipPersonal", "Persönliches Eigentum")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editOwnershipType === 'personal' && (
                <div>
                  <Label>{t("inventory:fields.selectOwners", "Eigentümer auswählen")} *</Label>
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

              {/* Visibility Setting */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t("inventory:visibilityLabel", "Sichtbarkeit für andere Haushalte")}
                </Label>
                <Select
                  value={editVisibility}
                  onValueChange={(value: Visibility) => {
                    setEditVisibility(value);
                    if (value !== 'selected') setEditAllowedHouseholdIds([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <span className="flex items-center gap-2">
                        <Lock className="h-3 w-3" /> {t("inventory:visibilityPrivate", "Nur dieser Haushalt")}
                      </span>
                    </SelectItem>
                    <SelectItem value="connected">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3 w-3" /> {t("inventory:visibilityConnected", "Alle verknüpften Haushalte")}
                      </span>
                    </SelectItem>
                    <SelectItem value="selected">
                      <span className="flex items-center gap-2">
                        <Users className="h-3 w-3" /> {t("inventory:visibilitySelected", "Ausgewählte Haushalte")}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {editVisibility === 'selected' && connectedHouseholds.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <Label className="text-sm text-muted-foreground">{t("inventory:selectHouseholds", "Haushalte auswählen:")}</Label>
                    {connectedHouseholds.map((h: any) => (
                      <div key={h.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`allowed-hh-${h.id}`}
                          checked={editAllowedHouseholdIds.includes(h.id)}
                          onChange={() => handleToggleAllowedHousehold(h.id)}
                          className="rounded"
                        />
                        <Label htmlFor={`allowed-hh-${h.id}`} className="cursor-pointer">
                          {h.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {editVisibility === 'selected' && connectedHouseholds.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("inventory:noConnectedHouseholds", "Keine verknüpften Haushalte vorhanden. Verbinde zuerst Haushalte unter \"Haushalt\".")}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  {t("common:actions.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending || setVisibilityMutation.isPending}>
                  {t("common:actions.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>{item.name}</CardTitle>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs border"
                    style={getCategoryStyle(item.categoryColor || '#3b82f6')}
                  >
                    {item.categoryName}
                  </span>
                  {/* Visibility badge */}
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    {visibilityIcon(currentVisibility)}
                    {visibilityLabel(currentVisibility)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.details && (
                  <div>
                    <Label className="text-muted-foreground">{t("inventory:fields.details", "Details")}</Label>
                    <p>{item.details}</p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">{t("inventory:fields.ownership", "Eigentum")}</Label>
                  <p>
                    {item.ownershipType === 'household'
                      ? t("inventory:ownershipHousehold", "Haushaltseigentum")
                      : `${t("inventory:ownershipPersonal", "Persönliches Eigentum")}: ${item.owners.map((o: any) => o.memberName).join(', ')}`
                    }
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">{t("inventory:fields.createdBy", "Erstellt von")}</Label>
                  <p>{item.creatorName} {t("common:labels.on", "am")} {new Date(item.createdAt).toLocaleDateString(undefined)}</p>
                </div>

                {item.photoUrls && item.photoUrls.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">{t("inventory:fields.photos", "Fotos")}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {item.photoUrls.map((photo: string | {url: string, filename: string}, index: number) => (
                        <ClickablePhoto
                          key={index}
                          src={typeof photo === 'string' ? photo : photo.url}
                          alt={typeof photo === 'string' ? `${item.name} ${index + 1}` : photo.filename}
                          className="w-full h-48 object-cover rounded-lg"
                          onClick={() => setLightbox({
                            photos: (item.photoUrls ?? []).map((p: string | {url: string, filename: string}, i: number) => ({
                              url: typeof p === 'string' ? p : p.url,
                              label: typeof p === 'string' ? `${item.name} ${i + 1}` : p.filename,
                            })),
                            index,
                          })}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {lightbox && (
                  <PhotoLightbox
                    photos={lightbox.photos}
                    currentIndex={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onNext={lightbox.photos.length > 1 ? () => setLightbox(lb => lb ? { ...lb, index: (lb.index + 1) % lb.photos.length } : null) : undefined}
                    onPrev={lightbox.photos.length > 1 ? () => setLightbox(lb => lb ? { ...lb, index: (lb.index - 1 + lb.photos.length) % lb.photos.length } : null) : undefined}
                  />
                )}
              </CardContent>
            </Card>

            {/* Tabs: Anfragen + Vorgaben */}
            <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as "requests" | "guidelines")} className="mb-6">
              <TabsList className="w-full">
                <TabsTrigger value="requests" className="flex-1">
                  {t("borrow:requests", "Ausleih-Anfragen")}
                  {borrowRequests.filter((r: any) => r.status === 'pending').length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs w-4 h-4">
                      {borrowRequests.filter((r: any) => r.status === 'pending').length}
                    </span>
                  )}
                </TabsTrigger>
                {(item.ownershipType === 'household' ||
                  (item.ownershipType === 'personal' && item.owners?.some((owner: any) => owner.memberId === member?.memberId))
                ) && (
                  <TabsTrigger value="guidelines" className="flex-1">{t("borrow:guidelines", "Ausleihvorgaben")}</TabsTrigger>
                )}
              </TabsList>

              {/* Anfragen Tab */}
              <TabsContent value="requests">
                {borrowRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("borrow:noRequests", "Keine Ausleih-Anfragen vorhanden.")}</p>
                ) : (
                  <div className="space-y-4 pt-4">
                    {[...borrowRequests].sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((request: any) => {
                      const isPending = request.status === 'pending';
                      const isApproved = request.status === 'approved';
                      const isActive = request.status === 'active';
                      const isCompleted = request.status === 'completed';
                      const isRejected = request.status === 'rejected';
                      const isExternal = isExternalRequest(request);
                      const isOverdue = isActive && request.endDate && new Date(request.endDate) < new Date();

                      return (
                        <div key={request.id} className={`border rounded-lg p-4 ${isExternal ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                          {/* External household banner */}
                          {isExternal && (
                            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                              <Globe className="h-3.5 w-3.5" />
                              {t("inventory:externalRequest", "Anfrage von externem Haushalt")}: {getExternalHouseholdName(request)}
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium">
                                {isExternal
                                  ? (request.borrowerMemberName || `Mitglied von ${getExternalHouseholdName(request)}`)
                                  : (members.find(m => m.id === request.borrowerMemberId)?.memberName || t("common:labels.unknown", "Unbekannt"))
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(request.startDate).toLocaleDateString('de-DE')} – {new Date(request.endDate).toLocaleDateString('de-DE')}
                              </div>
                            </div>
                            <div>
                              {isPending && (
                                <span className="px-2 py-1 rounded-full text-xs bg-amber-400 text-white">
                                  {t("borrow:status.pending", "Ausständig")}
                                </span>
                              )}
                              {isApproved && (
                                <span className="px-2 py-1 rounded-full text-xs bg-blue-500 text-white">
                                  {t("borrow:status.approved", "Genehmigt")}
                                </span>
                              )}
                              {isActive && (
                                <div className="flex flex-col items-end gap-1">
                                  {isOverdue && (
                                    <span className="px-2 py-1 rounded-full text-xs bg-red-600 text-white font-semibold">
                                      {t("borrow:status.overdue", "Überfällig")}
                                    </span>
                                  )}
                                  <span className="px-2 py-1 rounded-full text-xs bg-green-500 text-white">
                                    {t("borrow:status.active", "Ausgeliehen")}
                                  </span>
                                </div>
                              )}
                              {isCompleted && (
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-500 text-white">
                                  {t("borrow:status.completed", "Zurückgegeben")}
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2 py-1 rounded-full text-xs bg-red-400 text-white">
                                  {t("borrow:status.rejected", "Abgelehnt")}
                                </span>
                              )}
                            </div>
                          </div>

                          {request.requestMessage && (
                            <div className="text-sm text-muted-foreground mb-3">
                              "{request.requestMessage}"
                            </div>
                          )}

                          {/* Aufklappbare Protokoll-Ansicht */}
                          {(isCompleted || isActive) && (
                            <BorrowProtocol
                              request={request}
                              members={members}
                              isExternal={isExternal}
                              getExternalHouseholdName={getExternalHouseholdName}
                              expandedRequests={expandedRequests}
                              toggleExpanded={toggleExpanded}
                            />
                          )}

                          {isPending && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(request.id)}
                                disabled={approveMutation.isPending}
                              >
                                {t("borrow:actions.approve", "Genehmigen")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request.id)}
                                disabled={rejectMutation.isPending}
                              >
                                {t("borrow:actions.reject", "Ablehnen")}
                              </Button>
                            </div>
                          )}

                          {(isApproved || isActive) && (
                            <div className="flex gap-2 mt-3">
                              {isActive && !isExternal && request.borrowerMemberId === member?.memberId && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedReturnRequest(request.id);
                                    setShowReturnDialog(true);
                                  }}
                                >
                                  {t("borrow:actions.return", "Zurückgeben")}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const borrowerName = isExternal
                                    ? (request.borrowerMemberName || getExternalHouseholdName(request))
                                    : (members.find(m => m.id === request.borrowerMemberId)?.memberName || t("common:labels.unknown", "Unbekannt"));
                                  setRevokeRequest({
                                    id: request.id,
                                    borrowerName,
                                    startDate: new Date(request.startDate).toLocaleDateString('de-DE'),
                                    endDate: new Date(request.endDate).toLocaleDateString('de-DE'),
                                  });
                                  setShowRevokeDialog(true);
                                }}
                              >
                                {t("borrow:actions.revoke", "Widerrufen")}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Vorgaben Tab */}
              {(item.ownershipType === 'household' ||
                (item.ownershipType === 'personal' && item.owners?.some((owner: any) => owner.memberId === member?.memberId))
              ) && (
                <TabsContent value="guidelines">
                  <div className="pt-4">
                    <BorrowGuidelinesEditor
                      itemId={itemId}
                      memberId={member?.memberId ?? 0}
                      onSave={() => {}}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
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

      {revokeRequest && (
        <RevokeApprovalDialog
          open={showRevokeDialog}
          onOpenChange={(open) => {
            setShowRevokeDialog(open);
            if (!open) setRevokeRequest(null);
          }}
          itemName={item.name}
          borrowerName={revokeRequest.borrowerName}
          startDate={revokeRequest.startDate}
          endDate={revokeRequest.endDate}
          onConfirm={(reason) => {
            if (!member || !household) return;
            revokeMutation.mutate({
              requestId: revokeRequest.id,
              revokerId: member.memberId,
              revokerHouseholdId: household.householdId,
              reason,
            });
          }}
          isSubmitting={revokeMutation.isPending}
        />
      )}

      <BottomNav />
    </AppLayout>
  );
}
