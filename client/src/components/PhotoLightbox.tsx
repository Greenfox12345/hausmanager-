import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Photo {
  url: string;
  label?: string;
}

interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function PhotoLightbox({ photos, currentIndex, onClose, onNext, onPrev }: PhotoLightboxProps) {
  const { t } = useTranslation(["common"]);
  const photo = photos[currentIndex];
  const hasMultiple = photos.length > 1;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && onNext) onNext();
    if (e.key === "ArrowLeft" && onPrev) onPrev();
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={onClose}
        aria-label={t("common:actions.close")}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Prev button */}
      {hasMultiple && onPrev && (
        <button
          className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label={t("common:labels.prevPhoto")}
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.url}
          alt={photo.label ?? t("common:labels.photo")}
          className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
        {photo.label && (
          <p className="text-white/80 text-sm text-center px-4">{photo.label}</p>
        )}
      </div>

      {/* Next button */}
      {hasMultiple && onNext && (
        <button
          className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label={t("common:labels.nextPhoto")}
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}

/** Small helper: a clickable thumbnail that opens the lightbox */
interface ClickablePhotoProps {
  src: string;
  alt?: string;
  className?: string;
  onClick: () => void;
}

export function ClickablePhoto({ src, alt, className, onClick }: ClickablePhotoProps) {
  return (
    <div className="relative group cursor-zoom-in" onClick={onClick}>
      <img
        src={src}
        alt={alt ?? "Foto"}
        className={className}
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded">
        <ZoomIn className="w-6 h-6 text-white drop-shadow" />
      </div>
    </div>
  );
}
