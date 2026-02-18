import { useState, useEffect, useRef } from "react";
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


interface PDFViewerProps {
  url: string;
  filename: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFViewer({ url, filename, open, onOpenChange }: PDFViewerProps) {
  const [zoom, setZoom] = useState(100);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  // Pinch-to-zoom support
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;
    
    let initialDistance = 0;
    let initialZoom = 100;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        initialZoom = zoom;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        const scale = currentDistance / initialDistance;
        const newZoom = Math.max(5, Math.min(500, Math.round(initialZoom * scale)));
        setZoom(newZoom);
      }
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [zoom]);
  

  
  const handleDownload = () => {
    window.open(url, "_blank");
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl h-[90vh] p-0 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          {/* First Row: Title and Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{filename}</p>
              <p className="text-xs text-muted-foreground">PDF-Dokument</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
          
          {/* Second Row: Zoom Controls */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                // Dynamic step: smaller steps for low zoom, larger for high zoom
                const step = zoom < 100 ? 10 : zoom < 200 ? 25 : 50;
                setZoom(Math.min(500, zoom + step));
              }}
              disabled={zoom >= 500}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-16 text-center font-medium">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                // Dynamic step: smaller steps for low zoom, larger for high zoom
                const step = zoom <= 100 ? 10 : zoom <= 200 ? 25 : 50;
                setZoom(Math.max(5, zoom - step));
              }}
              disabled={zoom <= 5}
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
        </div>

        {/* PDF Embed */}
        <div ref={pdfContainerRef} className="flex-1 min-h-0 overflow-auto">
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
