import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { FlaskConical, X, UserPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface DemoBannerProps {
  demoToken: string;
  expiresAt: string;
}

export function DemoBanner({ demoToken, expiresAt }: DemoBannerProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation("auth");
  const [dismissed, setDismissed] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setHoursLeft(Math.max(0, Math.ceil(ms / 3600000)));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 shadow-sm">
      <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-amber-800 font-medium">
          {t("demo.demoTitle", "Demo-Modus")}
        </span>
        <span className="text-xs text-amber-700 ml-2 hidden sm:inline">
          {t("demo.demoBannerText", "Ihre Daten werden nach 24 Stunden gelöscht.")}
        </span>
        {hoursLeft > 0 && (
          <span className="text-xs text-amber-600 ml-2 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("demo.demoTimeLeft", "Noch {{hours}} Stunden verfügbar", { hours: hoursLeft })}
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 bg-white gap-1.5 text-xs h-7 px-2"
        onClick={() => setLocation(`/register?demo=${encodeURIComponent(demoToken)}`)}
      >
        <UserPlus className="h-3 w-3" />
        <span className="hidden sm:inline">{t("demo.demoBannerClaim", "Konto erstellen & Haushalt behalten")}</span>
        <span className="sm:hidden">{t("demo.demoBannerClaim", "Konto erstellen")}</span>
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500 hover:text-amber-700 shrink-0"
        aria-label="Schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
