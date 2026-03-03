import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage, type SupportedLanguageCode } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useState } from "react";

interface LanguageSwitcherProps {
  /** Show as compact icon-only button (for sidebar) or full button with label */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LanguageSwitcher({ compact = false, className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const [currentLang, setCurrentLang] = useState<SupportedLanguageCode>(getCurrentLanguage());

  const handleLanguageChange = async (code: SupportedLanguageCode) => {
    await changeLanguage(code);
    setCurrentLang(code);
  };

  const currentLanguageInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={className}
          title={t("language.select")}
        >
          {compact ? (
            <Globe className="h-4 w-4" />
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              <span className="text-sm">{currentLanguageInfo?.flag} {currentLanguageInfo?.name}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("language.uiLanguage")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`cursor-pointer ${currentLang === lang.code ? "font-semibold bg-accent" : ""}`}
          >
            <span className="mr-2">{lang.flag}</span>
            <span>{lang.name}</span>
            {currentLang === lang.code && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {t("language.uiLanguageHint")}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
