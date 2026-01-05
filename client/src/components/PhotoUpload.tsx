import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  onUploadingChange?: (uploading: boolean) => void;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 5, onUploadingChange }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const uploadMutation = trpc.upload.uploadPhoto.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[PhotoUpload] handleFileSelect called');
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('[PhotoUpload] No files selected');
      return;
    }
    console.log('[PhotoUpload] Files selected:', files.length);

    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximal ${maxPhotos} Fotos erlaubt`);
      return;
    }

    console.log('[PhotoUpload] Current photos:', photos);
    setUploading(true);
    onUploadingChange?.(true);
    console.log('[PhotoUpload] Upload started');
    setUploadProgress(0);
    const newPhotos: string[] = [];
    const fileArray = Array.from(files);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setCurrentFileName(file.name);
        setUploadProgress(Math.round((i / fileArray.length) * 100));

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} ist zu groß (max. 5MB)`);
          continue;
        }

        // Check file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} ist kein Bild`);
          continue;
        }

        // Convert to base64 for upload
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload to server via tRPC
        console.log('[PhotoUpload] Uploading file:', file.name);
        const { url } = await uploadMutation.mutateAsync({
          photo: base64,
          filename: file.name,
        });
        console.log('[PhotoUpload] Upload successful, URL:', url);
        newPhotos.push(url);
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100));
      }

      const updatedPhotos = [...photos, ...newPhotos];
      console.log('[PhotoUpload] Calling onPhotosChange with:', updatedPhotos);
      onPhotosChange(updatedPhotos);
      toast.success(`${newPhotos.length} Foto(s) hochgeladen`);
      console.log('[PhotoUpload] Upload complete');
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen der Fotos");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      setUploadProgress(0);
      setCurrentFileName("");
      // Reset input
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || photos.length >= maxPhotos}
          className="hidden"
          id="photo-upload"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("photo-upload")?.click()}
          disabled={uploading || photos.length >= maxPhotos}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Hochladen...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Fotos hinzufügen ({photos.length}/{maxPhotos})
            </>
          )}
        </Button>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="truncate">{currentFileName}</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
        </div>
      )}

      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Foto entfernen"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                Foto {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && !uploading && (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Noch keine Fotos hochgeladen</p>
          <p className="text-xs text-muted-foreground mt-1">Klicken Sie auf "Fotos hinzufügen"</p>
        </div>
      )}
    </div>
  );
}
