import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Upload, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";


interface BorrowGuidelinesEditorProps {
  itemId: number;
  memberId: number;
  onSave?: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

interface PhotoRequirement {
  id: string;
  label: string;
  examplePhotoUrl?: string;
  required: boolean;
}

export function BorrowGuidelinesEditor({ itemId, memberId, onSave }: BorrowGuidelinesEditorProps) {
  const [instructionsText, setInstructionsText] = useState("");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [photoRequirements, setPhotoRequirements] = useState<PhotoRequirement[]>([]);
  const [uploadingExample, setUploadingExample] = useState<string | null>(null);

  // Load existing guidelines
  const { data: guidelines } = trpc.borrow.getGuidelines.useQuery({ itemId });
  const saveMutation = trpc.borrow.saveGuidelines.useMutation();
  const uploadMutation = trpc.storage.upload.useMutation();

  useEffect(() => {
    if (guidelines) {
      setInstructionsText(guidelines.instructionsText || "");
      setChecklistItems((guidelines.checklistItems as ChecklistItem[]) || []);
      setPhotoRequirements((guidelines.photoRequirements as PhotoRequirement[]) || []);
    }
  }, [guidelines]);

  const addChecklistItem = () => {
    setChecklistItems([
      ...checklistItems,
      { id: `check-${Date.now()}`, label: "", required: false },
    ]);
  };

  const removeChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id));
  };

  const updateChecklistItem = (id: string, updates: Partial<ChecklistItem>) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const addPhotoRequirement = () => {
    setPhotoRequirements([
      ...photoRequirements,
      { id: `photo-${Date.now()}`, label: "", required: false },
    ]);
  };

  const removePhotoRequirement = (id: string) => {
    setPhotoRequirements(photoRequirements.filter((req) => req.id !== id));
  };

  const updatePhotoRequirement = (id: string, updates: Partial<PhotoRequirement>) => {
    setPhotoRequirements(
      photoRequirements.map((req) =>
        req.id === id ? { ...req, ...updates } : req
      )
    );
  };

  const handleExamplePhotoUpload = async (reqId: string, file: File) => {
    try {
      setUploadingExample(reqId);
      
      // Show immediate preview
      const previewUrl = URL.createObjectURL(file);
      updatePhotoRequirement(reqId, { examplePhotoUrl: previewUrl });
      
      // Compress image
      const compressedFile = await compressImage(file);
      
      // Upload to S3
      const arrayBuffer = await compressedFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...Array.from(buffer)));
      
      const { url } = await uploadMutation.mutateAsync({
        key: `borrow-examples/${itemId}/${reqId}-${compressedFile.name}`,
        data: base64,
        contentType: compressedFile.type,
      });

      // Replace preview with actual URL
      URL.revokeObjectURL(previewUrl);
      updatePhotoRequirement(reqId, { examplePhotoUrl: url });
      toast.success("Beispielfoto hochgeladen");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploadingExample(null);
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        inventoryItemId: itemId,
        instructionsText: instructionsText || undefined,
        checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
        photoRequirements: photoRequirements.length > 0 ? photoRequirements : undefined,
        createdBy: memberId,
      });

      toast.success("Ausleihvorgaben gespeichert");
      onSave?.();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Fehler beim Speichern");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ausleihvorgaben</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions Text */}
        <div className="space-y-2">
          <Label htmlFor="instructions">Anweisungen (optional)</Label>
          <Textarea
            id="instructions"
            placeholder="z.B. 'Vollgetankt zurückgeben', 'Sauber zurückgeben'"
            value={instructionsText}
            onChange={(e) => setInstructionsText(e.target.value)}
            rows={3}
          />
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Checkliste</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addChecklistItem}
            >
              <Plus className="h-4 w-4 mr-1" />
              Punkt hinzufügen
            </Button>
          </div>

          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                placeholder="z.B. 'Schlüssel vorhanden'"
                value={item.label}
                onChange={(e) =>
                  updateChecklistItem(item.id, { label: e.target.value })
                }
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={item.required}
                  onCheckedChange={(checked) =>
                    updateChecklistItem(item.id, { required: !!checked })
                  }
                />
                <Label className="text-sm">Pflicht</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeChecklistItem(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Photo Requirements */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Foto-Anforderungen</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPhotoRequirement}
            >
              <Plus className="h-4 w-4 mr-1" />
              Anforderung hinzufügen
            </Button>
          </div>

          {photoRequirements.map((req) => (
            <div key={req.id} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="z.B. 'Kilometerzähler', 'Seitenansicht'"
                  value={req.label}
                  onChange={(e) =>
                    updatePhotoRequirement(req.id, { label: e.target.value })
                  }
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={req.required}
                    onCheckedChange={(checked) =>
                      updatePhotoRequirement(req.id, { required: !!checked })
                    }
                  />
                  <Label className="text-sm">Pflicht</Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePhotoRequirement(req.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Example Photo Upload */}
              <div className="flex items-center gap-2">
                {req.examplePhotoUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={req.examplePhotoUrl}
                      alt="Beispiel"
                      className="h-16 w-16 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updatePhotoRequirement(req.id, { examplePhotoUrl: undefined })
                      }
                    >
                      <X className="h-4 w-4 mr-1" />
                      Entfernen
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleExamplePhotoUpload(req.id, file);
                        }
                      }}
                      disabled={uploadingExample === req.id}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingExample === req.id}
                    >
                      {uploadingExample === req.id ? (
                        <>Wird hochgeladen...</>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Beispielfoto hochladen
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Speichert..." : "Vorgaben speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
