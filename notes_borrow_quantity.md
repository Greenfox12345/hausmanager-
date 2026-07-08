# Borrow Quantity Tracking – Implementierungsnotizen

## DB-Änderungen benötigt
1. `borrow_requests` Tabelle: 2 neue Felder
   - `loanQuantity INT DEFAULT 1` – Anzahl ausgeliehener Einheiten
   - `returnedQuantity INT DEFAULT 0` – Bereits zurückgegebene Menge

2. Neue Tabelle `borrow_quantity_returns`
   - id, borrowRequestId (FK), returnedQty, returnedAt, returnedByMemberId, note
   - Für Teilrückgaben-Verlauf

## Server-Änderungen
- `inventoryAvailability.checkItemAvailability`: Mengen-basierte Verfügbarkeit berechnen
  - Summe aller aktiven/genehmigten loanQuantity für den Zeitraum
  - Verfügbare Menge = item.quantity - summe_ausgeliehener_menge
  - Status: "available" | "partially_available" | "unavailable"
  - Konfliktliste mit: borrowerName (nur wenn berechtigt), startDate, endDate, loanQuantity
  
- `borrow.request`: loanQuantity-Parameter hinzufügen, Validierung (max = verfügbare Menge)

- `borrow.markReturned`: Für Vollrückgabe (returnedQuantity = loanQuantity)

- Neue Mutation `borrow.partialReturn`:
  - Input: requestId, returnQty, note
  - Erstellt Eintrag in borrow_quantity_returns
  - Aktualisiert returnedQuantity in borrow_requests
  - Wenn returnedQuantity >= loanQuantity → Status = "completed"
  - Erstellt Aktivitätseintrag: "A hat X Einheit zurückgegeben, leiht noch Y aus"

## Frontend-Änderungen

### BorrowRequestDialog.tsx
- Neue Props: itemQuantity (number), itemUnitSymbol (string)
- Mengen-Anzeige: Verfügbare Menge aus checkItemAvailability
- QuantityInput (1 bis verfügbare Menge)
- Konflikt-Anzeige: "X Einheit bereits ausgeliehen (DD.MM – DD.MM)" 
  - Borrower-Name nur wenn: eigene Anfrage ODER gleicher Haushalt ODER verknüpfter Haushalt

### BorrowReturnDialog.tsx
- Vollrückgabe-Button (default)
- Collapsible "Teilrückgabe" mit QuantityInput (1 bis noch-ausgeliehene Menge)
- Zeigt: "Noch ausgeliehen: X Einheit"

### Inventar-Karte (Inventory.tsx)
- Mengen-Badge erweitern:
  - Wenn Ausleihen aktiv: "3 von 5 verfügbar"
  - Wenn nur reserviert (approved, nicht active): "X reserviert"
  - Wenn active: "X ausgeliehen (an Person)" [Person nur wenn berechtigt]

## Berechtigungslogik für Borrower-Namen
Sichtbar wenn:
1. Eigene Anfrage (borrowerMemberId === currentMemberId)
2. Gleicher Haushalt (borrowerHouseholdId === currentHouseholdId)
3. Verknüpfter Haushalt (in linked_households Tabelle)

## i18n-Schlüssel (borrow-Namespace)
- quantity.label: "Anzahl"
- quantity.available: "{{count}} verfügbar"
- quantity.reserved: "{{count}} reserviert"
- quantity.borrowed: "{{count}} ausgeliehen"
- quantity.conflict: "{{count}} bereits ausgeliehen ({{start}} – {{end}})"
- quantity.conflictBy: "von {{name}}"
- partialReturn.title: "Teilrückgabe"
- partialReturn.returnQty: "Zurückzugebende Menge"
- partialReturn.stillBorrowed: "Noch ausgeliehen: {{count}}"
- partialReturn.activityLog: "{{name}} hat {{returned}} {{unit}} zurückgegeben, leiht noch {{remaining}} {{unit}} aus"
