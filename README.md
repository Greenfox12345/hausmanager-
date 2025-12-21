# Haushaltsmanager

Eine mobile-optimierte Webanwendung zur Verwaltung von Haushalten mit mehreren Mitgliedern.

## Features

### 🏠 Multi-Haushalt-Verwaltung
- Mehrere Haushalte mit separaten Authentifizierungen
- Mitgliederverwaltung mit individuellen Zugängen
- Sichere Passwort-Hashing mit bcrypt

### 🛒 Einkaufsliste
- Kategorisierte Einkaufslisten (Lebensmittel, Haushalt, Pflege, Sonstiges)
- Filterung nach Kategorien
- Artikel als erledigt markieren
- Gemeinsame Nutzung innerhalb des Haushalts

### ✅ Haushaltsaufgaben
- Aufgabenverwaltung mit Beschreibungen
- Wiederkehrende Aufgaben (täglich, wöchentlich, monatlich, benutzerdefiniert)
- Automatische Rotation zwischen Mitgliedern
- Zuweisung an spezifische Mitglieder
- Ausschlussregeln für Rotationen

### 📊 Weitere Features
- Projektmanagement (Platzhalter)
- Aktivitätsverlauf (Platzhalter)
- Nachbarschaftsprojekte (Platzhalter)
- Mitgliederübersicht mit Avataren

## Technologie-Stack

### Frontend
- **React 19** mit TypeScript
- **Tailwind CSS 4** für elegantes, responsives Design
- **Wouter** für Routing
- **tRPC** für type-safe API-Kommunikation
- **shadcn/ui** Komponenten
- **Inter** Schriftart für moderne Typografie

### Backend
- **Node.js** mit Express
- **tRPC 11** für API-Endpunkte
- **Drizzle ORM** für Datenbankzugriff
- **MySQL/TiDB** Datenbank
- **bcrypt** für Passwort-Hashing

### Testing
- **Vitest** für Unit-Tests
- Umfassende Tests für Authentifizierung und Kernfunktionen

## Datenbankstruktur

Die Anwendung verwendet eine gut strukturierte relationale Datenbank mit folgenden Haupttabellen:

- `households` - Haushalte
- `household_members` - Haushaltsmitglieder
- `shopping_items` - Einkaufsgegenstände
- `tasks` - Haushaltsaufgaben
- `task_rotation_exclusions` - Ausschlüsse für Aufgabenrotation
- `projects` - Projekte
- `project_households` - Projekt-Haushalt-Zuordnungen
- `project_tasks` - Projektaufgaben
- `project_task_dependencies` - Aufgabenabhängigkeiten
- `activity_history` - Aktivitätsverlauf

## Installation

```bash
# Abhängigkeiten installieren
pnpm install

# Datenbank-Schema migrieren
pnpm db:push

# Entwicklungsserver starten
pnpm dev

# Tests ausführen
pnpm test

# Produktions-Build erstellen
pnpm build

# Produktionsserver starten
pnpm start
```

## Umgebungsvariablen

Die Anwendung benötigt folgende Umgebungsvariablen:

- `DATABASE_URL` - MySQL/TiDB Verbindungsstring
- `JWT_SECRET` - Secret für Session-Cookies
- `VITE_APP_ID` - Manus OAuth Application ID
- Weitere OAuth- und API-Konfigurationen

## Mobile-Optimierung

Die Anwendung ist vollständig für mobile Geräte optimiert:

- Touch-freundliche Interaktionen (44px Mindestgröße)
- Responsive Layouts für alle Bildschirmgrößen
- Optimierte Schriftgrößen (16px Minimum für iOS)
- Safe-Area-Unterstützung für Geräte mit Notch
- Smooth Scrolling und Animationen

## Design

Das Design folgt modernen Prinzipien:

- Elegante Farbpalette mit OKLCH-Farbraum
- Inter-Schriftart mit OpenType-Features
- Konsistente Abstände und Border-Radius
- Sanfte Schatten und Übergänge
- Klare visuelle Hierarchie

## Lizenz

MIT

## Entwickelt mit

Diese Anwendung wurde mit dem Manus AI-Assistenten entwickelt und nutzt die Manus-Plattform für Hosting und Authentifizierung.
