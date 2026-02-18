import { useState } from "react";
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
  const [zoom, setZoom] = useState(100);
  
  const sizeClasses = {
    medium: "w-[80vw] max-w-5xl h-[70vh]",
    large: "w-[90vw] max-w-7xl h-[85vh]",
    fullscreen: "w-[98vw] h-[98vh]"
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
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-r pr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(100)}
                disabled={zoom === 100}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
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
        <div className="flex-1 min-h-0 overflow-auto">
          <div 
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`
            }}
          >
            <iframe
              src={url}
              className="w-full h-full border-none"
              title={filename}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
