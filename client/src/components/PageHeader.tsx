import { Home } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  /** Lucide-Icon, das links neben dem Titel erscheint */
  icon: LucideIcon;
  /** Farbe des Icons, z.B. "text-yellow-600" */
  iconColor?: string;
  /** Hintergrundfarbe des Icon-Containers, z.B. "bg-yellow-50" */
  iconBg?: string;
  /** Seitentitel */
  title: string;
  /** Optionale Kinder-Elemente (z.B. zusätzliche Buttons) rechts neben dem Home-Button */
  children?: React.ReactNode;
}

/**
 * Einheitlicher Seiten-Header: Icon + Titel links, Home-Button rechts.
 * Wird auf allen Feature-Seiten verwendet.
 */
export default function PageHeader({
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  title,
  children,
}: PageHeaderProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation("common");

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      {/* Linke Seite: Icon + Titel */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <h1 className="text-3xl font-bold truncate">{title}</h1>
      </div>

      {/* Rechte Seite: optionale Kinder + Home-Button */}
      <div className="flex items-center gap-2 shrink-0">
        {children}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5"
          aria-label={t("navigation.home", "Startseite")}
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">{t("navigation.home", "Startseite")}</span>
        </Button>
      </div>
    </div>
  );
}
