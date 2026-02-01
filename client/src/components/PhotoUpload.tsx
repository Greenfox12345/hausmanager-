import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";
import imageCompression from "browser-image-compression";

interface PhotoUploadProps {
  photos: {url: string, filename: string}[];
  onPhotosChange: (photos: {url: string, filename: string}[]) => void;
  maxPhotos?: number;
  onUploadingChange?: (uploading: boolean) => void;
  acceptedFileTypes?: string;
  fileTypeLabel?: string;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 5, onUploadingChange, acceptedFileTypes = "image/*", fileTypeLabel = "Foto" }: PhotoUploadProps) {
  const uploadId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const uploadMutation = trpc.upload.uploadPhoto.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximal ${maxPhotos} ${fileTypeLabel}s erlaubt`);
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    setUploadProgress(0);
    const newPhotos: {url: string, filename: string}[] = [];
    const fileArray = Array.from(files);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setCurrentFileName(file.name);
        setUploadProgress(Math.round((i / fileArray.length) * 100));

        // Check file type
        const isPDF = acceptedFileTypes === ".pdf";
        if (isPDF && file.type !== "application/pdf") {
          toast.error(`${file.name} ist kein PDF`);
          continue;
        } else if (!isPDF && !file.type.startsWith("image/")) {
          toast.error(`${file.name} ist kein Bild`);
          continue;
        }

        // Compress image before upload (skip for PDFs)
        let compressedFile: File = file;
        if (!isPDF) {
          const options = {
            maxSizeMB: 1, // Max file size in MB
            maxWidthOrHeight: 1920, // Max width or height
            useWebWorker: true, // Use web worker for better performance
            fileType: file.type as any, // Preserve original file type
          };
          
          try {
            compressedFile = await imageCompression(file, options);
          } catch (compressionError) {
            console.error("Compression error:", compressionError);
            toast.error(`Fehler beim Komprimieren von ${file.name}`);
            continue;
          }
        }

        // Check file size (max 5MB for images, 10MB for PDFs)
        const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (compressedFile.size > maxSize) {
          toast.error(`${file.name} ist zu groß (max. ${isPDF ? '10MB' : '5MB'})`);
          continue;
        }

        // Convert file to base64 for upload
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });

        // Upload to server via tRPC
        const { url, filename } = await uploadMutation.mutateAsync({
          photo: base64,
          filename: file.name,
        });
        newPhotos.push({ url, filename });
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100));
      }

      const updatedPhotos = [...photos, ...newPhotos];
      onPhotosChange(updatedPhotos);
      // Toast removed to prevent dialog overlay
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Fehler beim Hochladen der ${fileTypeLabel}s`);
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
          accept={acceptedFileTypes}
          multiple
          onChange={handleFileSelect}
          disabled={uploading || photos.length >= maxPhotos}
          className="hidden"
          id={uploadId}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(uploadId)?.click()}
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
              {fileTypeLabel}s hinzufügen ({photos.length}/{maxPhotos})
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
              {acceptedFileTypes === ".pdf" ? (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg border border-border">
                  <svg className="h-12 w-12 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9L13,3.5L13,9H18.5Z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
              )}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title={`${fileTypeLabel} entfernen`}
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {photo.filename}
              </div>
            </div>
          ))}
        </div>
      )}


    </div>
  );
}
