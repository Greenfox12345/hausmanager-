import { useState } from "react";
import { X, Download, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PDFViewerProps {
  url: string;
  filename: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewerSize = "medium" | "large" | "fullscreen";

export function PDFViewer({ url, filename, open, onOpenChange }: PDFViewerProps) {
  const [size, setSize] = useState<ViewerSize>("large");
  
  const sizeClasses = {
    medium: "max-w-4xl max-h-[70vh]",
    large: "max-w-6xl max-h-[85vh]",
    fullscreen: "max-w-[98vw] max-h-[98vh]"
  };
  
  const handleDownload = () => {
    window.open(url, "_blank");
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size]} p-0 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <p className="text-sm font-medium truncate">{filename}</p>
            <p className="text-xs text-muted-foreground">PDF-Dokument</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={size} onValueChange={(v) => setSize(v as ViewerSize)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="large">Groß</SelectItem>
                <SelectItem value="fullscreen">Vollbild</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Extern öffnen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Herunterladen
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* PDF Embed */}
        <div className="flex-1 min-h-0">
          <iframe
            src={url}
            className="w-full h-full border-none"
            title={filename}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
