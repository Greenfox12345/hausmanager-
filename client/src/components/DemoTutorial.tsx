/**
 * DemoTutorial
 *
 * Eine interaktive, geführte Tour durch die Hauptfunktionen des Haushaltsmanagers.
 * Wird nach dem Demo-Login automatisch angezeigt (sofern noch nicht gesehen).
 * Kann jederzeit über den DemoBanner erneut geöffnet werden.
 *
 * Aufbau:
 *  - Overlay mit zentriertem Dialog
 *  - Fortschrittsleiste oben
 *  - Jeder Schritt hat: Icon, Titel, Beschreibung, optionale Highlights
 *  - Navigation: Zurück / Weiter / Abschließen
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  ShoppingCart,
  CalendarDays,
  FolderKanban,
  Package,
  Users,
  History,
  MapPin,
  ArrowRight,
  ArrowLeft,
  X,
  BookOpen,
  Home,
  Repeat,
  Star,
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
  highlightsKey?: string[];
  highlightsFallback?: string[];
  route?: string;
  badge?: { textKey: string; textFallback: string; color: string };
}

interface DemoTutorialProps {
  open: boolean;
  onClose: () => void;
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
      "Diese kurze Tour zeigt dir die wichtigsten Funktionen. Du kannst sie jederzeit überspringen und später erneut starten.",
    highlightsKey: ["tutorial:steps.welcome.h1", "tutorial:steps.welcome.h2", "tutorial:steps.welcome.h3"],
    highlightsFallback: [
      "Navigiere über die linke Seitenleiste",
      "Alle Daten gehören zu deinem Demo-Haushalt",
      "Du kannst alles ausprobieren – nichts geht kaputt",
    ],
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
    highlightsKey: [
      "tutorial:steps.tasks.h1",
      "tutorial:steps.tasks.h2",
      "tutorial:steps.tasks.h3",
    ],
    highlightsFallback: [
      "Einmalige oder regelmäßig wiederkehrende Aufgaben",
      "Zuweisung an Haushaltsmitglieder",
      "Projekte zur Gruppierung verwandter Aufgaben",
    ],
    route: "/tasks",
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
    highlightsKey: [
      "tutorial:steps.recurring.h1",
      "tutorial:steps.recurring.h2",
      "tutorial:steps.recurring.h3",
    ],
    highlightsFallback: [
      "Feste Intervalle: täglich, wöchentlich, monatlich",
      "Unregelmäßige Termine individuell planen",
      "Rotationsplan: Aufgaben reihum zuweisen",
    ],
    route: "/tasks",
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
    highlightsKey: [
      "tutorial:steps.calendar.h1",
      "tutorial:steps.calendar.h2",
      "tutorial:steps.calendar.h3",
    ],
    highlightsFallback: [
      "Monatsansicht und chronologische Liste",
      "Termine direkt aus dem Kalender abschließen oder auslassen",
      "Terminnotizen für einzelne Folgetermine",
    ],
    route: "/calendar",
    badge: { textKey: "tutorial:steps.calendar.badge", textFallback: "Kalender", color: "bg-indigo-100 text-indigo-700" },
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
    highlightsKey: [
      "tutorial:steps.shopping.h1",
      "tutorial:steps.shopping.h2",
      "tutorial:steps.shopping.h3",
    ],
    highlightsFallback: [
      "Gemeinsame Liste für alle Haushaltsmitglieder",
      "Kategorien mit Farbmarkierung",
      "Artikel mit Aufgaben verknüpfen",
    ],
    route: "/shopping",
    badge: { textKey: "tutorial:steps.shopping.badge", textFallback: "Einkauf", color: "bg-orange-100 text-orange-700" },
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
    highlightsKey: [
      "tutorial:steps.inventory.h1",
      "tutorial:steps.inventory.h2",
      "tutorial:steps.inventory.h3",
    ],
    highlightsFallback: [
      "Inventarliste mit Kategorien und Fotos",
      "Ausleihregeln und Anfragen verwalten",
      "Rückgabetermine im Kalender sichtbar",
    ],
    route: "/inventory",
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
    highlightsKey: [
      "tutorial:steps.projects.h1",
      "tutorial:steps.projects.h2",
    ],
    highlightsFallback: [
      "Aufgaben einem oder mehreren Projekten zuordnen",
      "Fortschritt auf einen Blick sehen",
    ],
    route: "/projects",
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
    highlightsKey: [
      "tutorial:steps.members.h1",
      "tutorial:steps.members.h2",
      "tutorial:steps.members.h3",
    ],
    highlightsFallback: [
      "Mitglieder per Einladungscode hinzufügen",
      "Aufgaben gezielt zuweisen",
      "Nachbarschaftsnetzwerk für gemeinsame Ausleihen",
    ],
    route: "/members",
    badge: { textKey: "tutorial:steps.members.badge", textFallback: "Mitglieder", color: "bg-pink-100 text-pink-700" },
  },
  {
    icon: History,
    iconColor: "text-slate-600",
    iconBg: "bg-slate-100",
    titleKey: "tutorial:steps.history.title",
    titleFallback: "Verlauf & Statistiken",
    descriptionKey: "tutorial:steps.history.description",
    descriptionFallback:
      "Im Verlauf siehst du alle abgeschlossenen Aufgaben und Aktivitäten deines Haushalts. So behältst du den Überblick, wer was wann erledigt hat.",
    highlightsKey: [
      "tutorial:steps.history.h1",
      "tutorial:steps.history.h2",
    ],
    highlightsFallback: [
      "Chronologische Übersicht aller Aktivitäten",
      "Nach Mitglied oder Aufgabe filtern",
    ],
    route: "/history",
    badge: { textKey: "tutorial:steps.history.badge", textFallback: "Verlauf", color: "bg-slate-100 text-slate-700" },
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
    highlightsKey: [
      "tutorial:steps.finish.h1",
      "tutorial:steps.finish.h2",
      "tutorial:steps.finish.h3",
    ],
    highlightsFallback: [
      "Demo-Daten sind zum Ausprobieren vorausgefüllt",
      "Erstelle ein Konto, um deinen Haushalt dauerhaft zu behalten",
      "Das Tutorial ist jederzeit über das Demo-Banner erneut aufrufbar",
    ],
  },
];

// ─── Komponente ───────────────────────────────────────────────────────────────

const TUTORIAL_SEEN_KEY = "demo_tutorial_seen";

export function DemoTutorial({ open, onClose }: DemoTutorialProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);

  const currentStep = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleClose = useCallback(() => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, handleClose]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleNavigate = useCallback(() => {
    if (currentStep.route) {
      setLocation(currentStep.route);
    }
    handleClose();
  }, [currentStep.route, setLocation, handleClose]);

  if (!open) return null;

  const Icon = currentStep.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Fortschrittsleiste */}
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("tutorial:title", "Tutorial")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-accent"
              aria-label={t("common:actions.close", "Schließen")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inhalt */}
        <div className="px-6 py-6 flex flex-col gap-5">
          {/* Icon + Titel */}
          <div className="flex items-start gap-4">
            <div className={`rounded-xl p-3 shrink-0 ${currentStep.iconBg}`}>
              <Icon className={`h-6 w-6 ${currentStep.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg font-semibold leading-tight">
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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(currentStep.descriptionKey, currentStep.descriptionFallback)}
              </p>
            </div>
          </div>

          {/* Highlights */}
          {currentStep.highlightsFallback && currentStep.highlightsFallback.length > 0 && (
            <ul className="space-y-2 pl-1">
              {currentStep.highlightsFallback.map((fallback, i) => {
                const key = currentStep.highlightsKey?.[i];
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
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

          {/* Zur Seite navigieren */}
          {currentStep.route && (
            <button
              onClick={handleNavigate}
              className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium self-start"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {t("tutorial:goToPage", "Diese Seite jetzt öffnen")}
            </button>
          )}
        </div>

        {/* Schritt-Punkte */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
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

        {/* Footer / Navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-muted-foreground text-xs"
          >
            {t("tutorial:skip", "Überspringen")}
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("common:actions.back", "Zurück")}
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="gap-1">
              {isLast
                ? t("tutorial:finish", "Loslegen!")
                : t("common:actions.next", "Weiter")}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Gibt true zurück, wenn das Tutorial noch nicht gesehen wurde. */
export function shouldShowTutorial(): boolean {
  return !localStorage.getItem(TUTORIAL_SEEN_KEY);
}

/** Setzt den Tutorial-Status zurück (für erneutes Anzeigen). */
export function resetTutorial(): void {
  localStorage.removeItem(TUTORIAL_SEEN_KEY);
}
