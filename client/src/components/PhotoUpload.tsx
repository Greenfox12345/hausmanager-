import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 5 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const uploadMutation = trpc.upload.uploadPhoto.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximal ${maxPhotos} Fotos erlaubt`);
      return;
    }

    setUploading(true);
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
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
        const { url } = await uploadMutation.mutateAsync({
          photo: base64,
          filename: file.name,
        });
        newPhotos.push(url);
      }

      onPhotosChange([...photos, ...newPhotos]);
      // Toast removed to prevent dialog overlay issues
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen der Fotos");
    } finally {
      setUploading(false);
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

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
