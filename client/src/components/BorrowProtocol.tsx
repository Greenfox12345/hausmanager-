import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Camera, MessageSquare, Clock, User, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PhotoLightbox, ClickablePhoto } from "@/components/PhotoLightbox";

interface BorrowProtocolProps {
  request: any;
  members: any[];
  isExternal: boolean;
  getExternalHouseholdName: (req: any) => string;
  expandedRequests: Set<number>;
  toggleExpanded: (id: number) => void;
}

interface LightboxState {
  photos: { url: string; label?: string }[];
  index: number;
}

function PhotoGrid({
  photos,
  label,
  onOpen,
}: {
  photos: { photoUrl: string; label?: string }[];
  label: string;
  onOpen: (index: number) => void;
}) {
  const { t } = useTranslation();
  if (!photos.length) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((p, i) => (
          <div key={i} className="space-y-0.5">
            <ClickablePhoto
              src={p.photoUrl}
              alt={p.label || t("borrows:photoGrid.photoLabel", { index: i + 1 })}
              className="w-full h-24 object-cover rounded"
              onClick={() => onOpen(i)}
            />
            {p.label && <p className="text-xs text-muted-foreground truncate">{p.label}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtocolSection({
  color,
  title,
  timestamp,
  comment,
  mainPhotoUrl,
  requirementPhotos,
  guideline,
}: {
  color: "green" | "blue";
  title: string;
  timestamp?: Date | null;
  comment?: string | null;
  mainPhotoUrl?: string | null;
  requirementPhotos: any[];
  guideline: any;
  phase: "pickup" | "return";
}) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const bg = color === "green"
    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
    : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
  const titleColor = color === "green"
    ? "text-green-700 dark:text-green-400"
    : "text-blue-700 dark:text-blue-400";

  const reqPhotosWithLabels = requirementPhotos.map((rp) => {
    const req = guideline?.photoRequirements?.find((pr: any) => pr.id === rp.photoRequirementId);
    return { photoUrl: rp.photoUrl, label: req?.label ?? rp.filename ?? t("borrows:photo.defaultLabel") };
  });

  // Build all photos for lightbox navigation
  const allPhotos: { url: string; label?: string }[] = [];
  if (mainPhotoUrl) allPhotos.push({ url: mainPhotoUrl, label: title });
  reqPhotosWithLabels.forEach((p) => allPhotos.push({ url: p.photoUrl, label: p.label }));

  const openLightbox = (index: number) => setLightbox({ photos: allPhotos, index });
  const closeLightbox = () => setLightbox(null);
  const nextPhoto = () => setLightbox((lb) => lb ? { ...lb, index: (lb.index + 1) % lb.photos.length } : null);
  const prevPhoto = () => setLightbox((lb) => lb ? { ...lb, index: (lb.index - 1 + lb.photos.length) % lb.photos.length } : null);

  const hasContent = mainPhotoUrl || comment || reqPhotosWithLabels.length > 0;
  if (!hasContent) return null;

  // Offset for req photos in allPhotos array (main photo takes index 0 if present)
  const reqPhotoOffset = mainPhotoUrl ? 1 : 0;

  return (
    <>
      <div className={`p-3 rounded-md border ${bg}`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-semibold flex items-center gap-1 ${titleColor}`}>
            <Camera className="w-3.5 h-3.5" /> {title}
          </p>
          {timestamp && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(timestamp).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>

        {mainPhotoUrl && (
          <ClickablePhoto
            src={mainPhotoUrl}
            alt={title}
            className="w-full max-h-48 object-cover rounded mb-2"
            onClick={() => openLightbox(0)}
          />
        )}

        {comment && (
          <p className="text-xs text-muted-foreground flex items-start gap-1 mb-2">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="italic">„{comment}"</span>
          </p>
        )}

        <PhotoGrid
          photos={reqPhotosWithLabels}
          label={t("borrows:photoGrid.requiredPhotosLabel")}
          onOpen={(i) => openLightbox(i + reqPhotoOffset)}
        />
      </div>

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          currentIndex={lightbox.index}
          onClose={closeLightbox}
          onNext={lightbox.photos.length > 1 ? nextPhoto : undefined}
          onPrev={lightbox.photos.length > 1 ? prevPhoto : undefined}
        />
      )}
    </>
  );
}

export function BorrowProtocol({
  request,
  members,
  isExternal,
  getExternalHouseholdName,
  expandedRequests,
  toggleExpanded,
}: BorrowProtocolProps) {
  const { t } = useTranslation();
  const isExpanded = expandedRequests.has(request.id);

  const borrowerName = isExternal
    ? (request.borrowerMemberName || getExternalHouseholdName(request))
    : (members.find((m: any) => m.id === request.borrowerMemberId)?.memberName || t("borrows:borrower.unknown"));

  const { data: returnPhotos = [] } = trpc.borrow.getReturnPhotos.useQuery(
    { requestId: request.id },
    { enabled: isExpanded }
  );

  const { data: guideline } = trpc.borrow.getGuidelines.useQuery(
    { itemId: request.inventoryItemId },
    { enabled: isExpanded }
  );

  const pickupReqPhotos = returnPhotos.filter(
    (p: any) => p.photoRequirementId && p.uploadedAt && request.borrowedAt &&
      new Date(p.uploadedAt).getTime() <= new Date(request.borrowedAt).getTime() + 60_000
  );
  const returnReqPhotos = returnPhotos.filter(
    (p: any) => !pickupReqPhotos.includes(p)
  );

  

  const hasAnyData =
    request.pickupPhotoUrl || request.pickupComment || pickupReqPhotos.length > 0 ||
    request.returnPhotoUrl || request.returnComment || returnReqPhotos.length > 0;

  if (!hasAnyData) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => toggleExpanded(request.id)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {isExpanded ? t("borrows:protocol.hide") : t("borrows:protocol.show")}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Meta-Infos */}
          <div className="p-2 bg-muted/40 rounded text-xs space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>{t("borrows:metaInfo.borrower")}: <strong>{borrowerName}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {t("borrows:metaInfo.dateRange", { startDate: new Date(request.startDate).toLocaleDateString("de-DE"), endDate: new Date(request.endDate).toLocaleDateString("de-DE") })}
              </span>
            </div>
            {request.requestMessage && (
              <div className="flex items-start gap-1 text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="italic">{t("borrows:metaInfo.request")}: „{request.requestMessage}"</span>
              </div>
            )}
            {request.responseMessage && (
              <div className="flex items-start gap-1 text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="italic">{t("borrows:metaInfo.response")}: „{request.responseMessage}"</span>
              </div>
            )}
          </div>

          {/* Abholprotokoll */}
          <ProtocolSection
            color="green"
            title={t("borrows:protocolSection.pickupCondition")}
            timestamp={request.borrowedAt}
            comment={request.pickupComment}
            mainPhotoUrl={request.pickupPhotoUrl}
            requirementPhotos={pickupReqPhotos}
            guideline={guideline}
            phase="pickup"
          />

          {/* Rückgabeprotokoll */}
          <ProtocolSection
            color="blue"
            title={t("borrows:protocolSection.returnCondition")}
            timestamp={request.returnedAt}
            comment={request.returnComment}
            mainPhotoUrl={request.returnPhotoUrl}
            requirementPhotos={returnReqPhotos}
            guideline={guideline}
            phase="return"
          />
        </div>
      )}
    </div>
  );
}
