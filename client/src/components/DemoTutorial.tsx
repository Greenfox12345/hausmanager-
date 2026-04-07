/**
 * DemoTutorial
 *
 * Persistentes Tutorial-Panel, das über alle Seitenwechsel hinweg offen bleibt.
 * - Kein Overlay / kein Backdrop – der Nutzer kann die App frei benutzen
 * - Direkter "Zur Seite"-Button im Panel für einfache Navigation
 * - Hebt das jeweils relevante Sidebar-Element mit einem Spotlight-Rahmen hervor
 * - Lebt als globales Singleton in App.tsx (via TutorialContext)
 */

import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTutorial } from "@/contexts/TutorialContext";
import {
  CheckSquare,
  ShoppingCart,
  CalendarDays,
  FolderKanban,
  Package,
  Users,
  ArrowRight,
  ArrowLeft,
  X,
  BookOpen,
  Home,
  Repeat,
  Star,
  Navigation,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface TutorialStep {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  titleKey: string;
  titleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  highlightsFallback?: string[];
  highlightsKey?: string[];
  /** data-nav-Wert des Sidebar-Elements das hervorgehoben werden soll */
  spotlightNav?: string;
  badge?: { textKey: string; textFallback: string; color: string };
}

// ─── Tutorial-Schritte ────────────────────────────────────────────────────────

const STEPS: TutorialStep[] = [
  {
    icon: Home,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    titleKey: "tutorial:steps.welcome.title",
    titleFallback: "Willkommen im Haushaltsmanager!",
    descriptionKey: "tutorial:steps.welcome.description",
    descriptionFallback:
      "Diese kurze Tour zeigt dir die wichtigsten Funktionen. Klick dich einfach selbst durch die App – das Tutorial begleitet dich dabei.",
    highlightsFallback: [
      "Navigiere über die linke Seitenleiste",
      "Alle Daten gehören zu deinem Demo-Haushalt",
      "Du kannst alles ausprobieren – nichts geht kaputt",
    ],
    highlightsKey: ["tutorial:steps.welcome.h1", "tutorial:steps.welcome.h2", "tutorial:steps.welcome.h3"],
    spotlightNav: "/",
  },
  {
    icon: ShoppingCart,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
    titleKey: "tutorial:steps.shopping.title",
    titleFallback: "Einkaufsliste",
    descriptionKey: "tutorial:steps.shopping.description",
    descriptionFallback:
      "Führe eine gemeinsame Einkaufsliste für deinen Haushalt. Artikel können nach Kategorien sortiert, mit Aufgaben verknüpft und beim Einkauf abgehakt werden.",
    highlightsFallback: [
      "Gemeinsame Liste für alle Haushaltsmitglieder",
      "Kategorien mit Farbmarkierung",
      "Artikel mit Aufgaben verknüpfen",
    ],
    highlightsKey: ["tutorial:steps.shopping.h1", "tutorial:steps.shopping.h2", "tutorial:steps.shopping.h3"],
    spotlightNav: "/shopping",
    badge: { textKey: "tutorial:steps.shopping.badge", textFallback: "Einkauf", color: "bg-orange-100 text-orange-700" },
  },
  {
    icon: CheckSquare,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
    titleKey: "tutorial:steps.tasks.title",
    titleFallback: "Aufgaben verwalten",
    descriptionKey: "tutorial:steps.tasks.description",
    descriptionFallback:
      "Erstelle Aufgaben für deinen Haushalt, weise sie Mitgliedern zu und lege Fälligkeitstermine fest. Aufgaben können einmalig oder wiederkehrend sein.",
    highlightsFallback: [
      "Einmalige oder regelmäßig wiederkehrende Aufgaben",
      "Zuweisung an Haushaltsmitglieder",
      "Projekte zur Gruppierung verwandter Aufgaben",
    ],
    highlightsKey: ["tutorial:steps.tasks.h1", "tutorial:steps.tasks.h2", "tutorial:steps.tasks.h3"],
    spotlightNav: "/tasks",
    badge: { textKey: "tutorial:steps.tasks.badge", textFallback: "Aufgaben", color: "bg-green-100 text-green-700" },
  },
  {
    icon: Repeat,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    titleKey: "tutorial:steps.recurring.title",
    titleFallback: "Wiederkehrende Aufgaben",
    descriptionKey: "tutorial:steps.recurring.description",
    descriptionFallback:
      "Lege Aufgaben an, die sich automatisch wiederholen – täglich, wöchentlich, monatlich oder nach einem individuellen Rotationsplan. Unregelmäßige Termine können manuell geplant werden.",
    highlightsFallback: [
      "Feste Intervalle: täglich, wöchentlich, monatlich",
      "Unregelmäßige Termine individuell planen",
      "Rotationsplan: Aufgaben reihum zuweisen",
    ],
    highlightsKey: ["tutorial:steps.recurring.h1", "tutorial:steps.recurring.h2", "tutorial:steps.recurring.h3"],
    spotlightNav: "/tasks",
  },
  {
    icon: CalendarDays,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-100",
    titleKey: "tutorial:steps.calendar.title",
    titleFallback: "Kalender & Termine",
    descriptionKey: "tutorial:steps.calendar.description",
    descriptionFallback:
      "Der Kalender zeigt alle anstehenden Aufgaben und Termine in einer übersichtlichen Monats- oder Listenansicht. Folgetermine, Sondertermine und Ausleihen sind farblich markiert.",
    highlightsFallback: [
      "Monatsansicht und chronologische Liste",
      "Termine direkt aus dem Kalender abschließen oder auslassen",
      "Terminnotizen für einzelne Folgetermine",
    ],
    highlightsKey: ["tutorial:steps.calendar.h1", "tutorial:steps.calendar.h2", "tutorial:steps.calendar.h3"],
    spotlightNav: "/calendar",
    badge: { textKey: "tutorial:steps.calendar.badge", textFallback: "Kalender", color: "bg-indigo-100 text-indigo-700" },
  },
  {
    icon: Package,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-100",
    titleKey: "tutorial:steps.inventory.title",
    titleFallback: "Inventar & Ausleihen",
    descriptionKey: "tutorial:steps.inventory.description",
    descriptionFallback:
      "Verwalte Gegenstände in deinem Haushalt. Du kannst Artikel erfassen, Ausleihregeln festlegen und Ausleihvorgänge nachverfolgen – auch haushaltsübergreifend.",
    highlightsFallback: [
      "Inventarliste mit Kategorien und Fotos",
      "Ausleihregeln und Anfragen verwalten",
      "Rückgabetermine im Kalender sichtbar",
    ],
    highlightsKey: ["tutorial:steps.inventory.h1", "tutorial:steps.inventory.h2", "tutorial:steps.inventory.h3"],
    spotlightNav: "/inventory",
    badge: { textKey: "tutorial:steps.inventory.badge", textFallback: "Inventar", color: "bg-teal-100 text-teal-700" },
  },
  {
    icon: FolderKanban,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-100",
    titleKey: "tutorial:steps.projects.title",
    titleFallback: "Projekte",
    descriptionKey: "tutorial:steps.projects.description",
    descriptionFallback:
      "Gruppiere zusammengehörige Aufgaben in Projekten. Projekte helfen, größere Vorhaben wie Renovierungen oder Umzüge übersichtlich zu strukturieren.",
    highlightsFallback: [
      "Aufgaben einem oder mehreren Projekten zuordnen",
      "Fortschritt auf einen Blick sehen",
    ],
    highlightsKey: ["tutorial:steps.projects.h1", "tutorial:steps.projects.h2"],
    spotlightNav: "/projects",
    badge: { textKey: "tutorial:steps.projects.badge", textFallback: "Projekte", color: "bg-violet-100 text-violet-700" },
  },
  {
    icon: Users,
    iconColor: "text-pink-600",
    iconBg: "bg-pink-100",
    titleKey: "tutorial:steps.members.title",
    titleFallback: "Mitglieder & Nachbarschaft",
    descriptionKey: "tutorial:steps.members.description",
    descriptionFallback:
      "Lade weitere Personen in deinen Haushalt ein und verwalte Rollen. Über die Nachbarschaftsfunktion kannst du dich mit anderen Haushalten vernetzen und Gegenstände teilen.",
    highlightsFallback: [
      "Mitglieder per Einladungscode hinzufügen",
      "Aufgaben gezielt zuweisen",
      "Nachbarschaftsnetzwerk für gemeinsame Ausleihen",
    ],
    highlightsKey: ["tutorial:steps.members.h1", "tutorial:steps.members.h2", "tutorial:steps.members.h3"],
    spotlightNav: "/members",
    badge: { textKey: "tutorial:steps.members.badge", textFallback: "Mitglieder", color: "bg-pink-100 text-pink-700" },
  },
  {
    icon: Star,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
    titleKey: "tutorial:steps.finish.title",
    titleFallback: "Bereit loszulegen!",
    descriptionKey: "tutorial:steps.finish.description",
    descriptionFallback:
      "Du hast alle Hauptfunktionen kennengelernt. Erkunde den Demo-Haushalt in Ruhe – alle Daten sind vorausgefüllt, damit du alles direkt ausprobieren kannst.",
    highlightsFallback: [
      "Demo-Daten sind zum Ausprobieren vorausgefüllt",
      "Erstelle ein Konto, um deinen Haushalt dauerhaft zu behalten",
      "Das Tutorial ist jederzeit über das Demo-Banner erneut aufrufbar",
    ],
    highlightsKey: ["tutorial:steps.finish.h1", "tutorial:steps.finish.h2", "tutorial:steps.finish.h3"],
  },
];

// ─── Spotlight-Hook ───────────────────────────────────────────────────────────
// Wendet inline-styles direkt auf das Element an (zuverlässiger als CSS-Klassen
// weil keine CSSOM-Reihenfolge-Probleme entstehen).

const SPOTLIGHT_STYLE = {
  outline: "2.5px solid var(--color-primary, #2563eb)",
  outlineOffset: "2px",
  borderRadius: "8px",
  boxShadow: "0 0 0 4px rgba(37,99,235,0.20), 0 0 16px 2px rgba(37,99,235,0.18)",
  animation: "tutorial-pulse 1.8s ease-in-out infinite",
  position: "relative" as const,
  zIndex: "51",
} as const;

function useSpotlight(navPath: string | undefined, active: boolean) {
  const applySpotlight = useCallback(() => {
    if (!navPath) return;
    // Alle vorhandenen Spotlight-Elemente bereinigen
    document.querySelectorAll<HTMLElement>("[data-tutorial-spotlight]").forEach((el) => {
      el.removeAttribute("style");
      el.removeAttribute("data-tutorial-spotlight");
    });
    if (!active) return;

    const el = document.querySelector<HTMLElement>(`[data-nav="${navPath}"]`);
    if (!el) return;
    Object.assign(el.style, SPOTLIGHT_STYLE);
    el.setAttribute("data-tutorial-spotlight", "1");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [navPath, active]);

  useEffect(() => {
    // Sofort versuchen
    applySpotlight();
    // Nochmal nach kurzem Delay falls DOM noch nicht bereit
    const t1 = setTimeout(applySpotlight, 150);
    const t2 = setTimeout(applySpotlight, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      // Spotlight entfernen
      document.querySelectorAll<HTMLElement>("[data-tutorial-spotlight]").forEach((el) => {
        el.removeAttribute("style");
        el.removeAttribute("data-tutorial-spotlight");
      });
    };
  }, [applySpotlight]);
}

// ─── Komponente ───────────────────────────────────────────────────────────────

export function DemoTutorial() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { open, step, closeTutorial, setStep, nextStep, prevStep, totalSteps } = useTutorial();

  const currentStep = STEPS[step] ?? STEPS[0];
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;
  const progress = ((step + 1) / totalSteps) * 100;

  // Spotlight auf das aktuelle Sidebar-Element
  useSpotlight(currentStep.spotlightNav, open);

  if (!open) return null;

  const Icon = currentStep.icon;

  const handleNavigate = () => {
    if (currentStep.spotlightNav) {
      navigate(currentStep.spotlightNav);
    }
  };

  return (
    /* Tutorial-Panel – unten rechts, kein Overlay */
    <div
      className="fixed bottom-6 right-6 z-[200] w-[340px] max-w-[calc(100vw-2rem)] bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
      style={{ maxHeight: "calc(100vh - 5rem)" }}
    >
      {/* Fortschrittsleiste */}
      <div className="h-1 bg-muted w-full shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("tutorial:title", "Tutorial")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {step + 1} / {totalSteps}
          </span>
          <button
            onClick={closeTutorial}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-accent"
            aria-label={t("common:actions.close", "Schließen")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inhalt */}
      <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        {/* Icon + Titel */}
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2.5 shrink-0 ${currentStep.iconBg}`}>
            <Icon className={`h-5 w-5 ${currentStep.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h2 className="text-base font-semibold leading-tight">
                {t(currentStep.titleKey, currentStep.titleFallback)}
              </h2>
              {currentStep.badge && (
                <Badge
                  variant="outline"
                  className={`text-xs font-medium border-0 ${currentStep.badge.color}`}
                >
                  {t(currentStep.badge.textKey, currentStep.badge.textFallback)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(currentStep.descriptionKey, currentStep.descriptionFallback)}
            </p>
          </div>
        </div>

        {/* Highlights */}
        {currentStep.highlightsFallback && currentStep.highlightsFallback.length > 0 && (
          <ul className="space-y-1.5 pl-0.5">
            {currentStep.highlightsFallback.map((fallback, i) => {
              const key = currentStep.highlightsKey?.[i];
              return (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 h-3.5 w-3.5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <span className="text-foreground/80">
                    {key ? t(key, fallback) : fallback}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Direkter Navigations-Button */}
        {currentStep.spotlightNav && currentStep.spotlightNav !== "/" && (
          <button
            onClick={handleNavigate}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors mt-0.5 self-start"
          >
            <Navigation className="h-3 w-3" />
            {t("tutorial:goToPage", "Diese Seite jetzt öffnen")}
          </button>
        )}
      </div>

      {/* Schritt-Punkte */}
      <div className="flex items-center justify-center gap-1 py-2 shrink-0">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`rounded-full transition-all duration-200 ${
              i === step
                ? "w-4 h-2 bg-primary"
                : i < step
                ? "w-2 h-2 bg-primary/40"
                : "w-2 h-2 bg-muted-foreground/20"
            }`}
            aria-label={`Schritt ${i + 1}`}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={closeTutorial}
          className="text-muted-foreground text-xs h-8 px-2"
        >
          {t("tutorial:skip", "Überspringen")}
        </Button>
        <div className="flex items-center gap-1.5">
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={prevStep} className="gap-1 h-8 text-xs px-3">
              <ArrowLeft className="h-3 w-3" />
              {t("common:actions.back", "Zurück")}
            </Button>
          )}
          <Button size="sm" onClick={nextStep} className="gap-1 h-8 text-xs px-3">
            {isLast
              ? t("tutorial:finish", "Loslegen!")
              : t("common:actions.next", "Weiter")}
            {!isLast && <ArrowRight className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Re-export für Abwärtskompatibilität
export { resetTutorial } from "@/contexts/TutorialContext";
