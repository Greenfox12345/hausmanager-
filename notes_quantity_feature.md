# Mengen-/Einheiten-Feature Implementierungsnotizen

## DB-Schema Änderungen
1. Neue Tabelle `item_units` (haushaltsweit):
   - id, householdId, name (varchar 50), symbol (varchar 10, optional), sortOrder (int), isDefault (bool), createdAt
   - Standard-Einheiten: Stück, Kilo, Gramm, Meter, Zentimeter

2. `shopping_items` erweitern:
   - quantity: decimal(10,3) nullable
   - unitId: int nullable → FK → item_units.id (onDelete: set null)

3. `inventory_items` erweitern:
   - quantity: decimal(10,3) nullable
   - unitId: int nullable → FK → item_units.id (onDelete: set null)

## Server Änderungen
- Neue Router-Datei: `server/routers/units.ts` (CRUD für item_units)
- shopping.ts: add/update/completeShopping um quantity/unitId erweitern
- inventory.ts: add/update um quantity/unitId erweitern
- db.ts: createShoppingItem, updateShoppingItem, addInventoryItem, updateInventoryItem, getInventoryItems, getShoppingItems um quantity/unitId erweitern
- routers.ts: unitsRouter einbinden

## Frontend Änderungen
### Neue Komponenten
- `client/src/components/QuantityInput.tsx`:
  - Props: value, onChange, unit, onUnitChange, units (Liste), disabled
  - +/- Buttons mit adaptiver Schrittgröße:
    - < 100: Schritt 1
    - 100-999: Schritt 50
    - >= 1000: Schritt 500
  - Freitexteingabe (number input)
  - Einheitenauswahl (Select)
  
- `client/src/components/ManageUnitsDialog.tsx`:
  - CRUD für haushaltsweit Einheiten
  - Ähnlich wie ManageCategoriesDialog

### Geänderte Seiten/Komponenten
- `Shopping.tsx`:
  - Mengenanzeige in der Liste: "2 kg Mehl"
  - Menge in Erstell-/Bearbeitungsformular
  - Menge im completeShopping-Dialog (Übernahme-Screen): vorausgefüllt, +/- Buttons
  - ManageUnitsDialog-Button neben Kategorie-Button
  
- `Inventory.tsx`:
  - Mengenanzeige in der Liste
  - Menge in Erstell-/Bearbeitungsformular
  - ManageUnitsDialog-Button neben Kategorie-Button

## i18n Schlüssel (neu)
- units:title, units:manage, units:add, units:edit, units:delete
- units:name, units:symbol, units:default
- units:defaults.piece, units:defaults.kilo, units:defaults.gram, units:defaults.meter, units:defaults.centimeter
- shopping:quantity, shopping:unit, shopping:quantityLabel
- inventory:quantity, inventory:unit

## Schrittgröße Logik
```ts
function getStep(value: number): number {
  if (value >= 1000) return 500;
  if (value >= 100) return 50;
  return 1;
}
```

## Mengenanzeige in Listen
Format: "2 kg" oder "500 g" oder "3 Stück" oder "1,5 m"
- Wenn quantity null: nichts anzeigen
- Wenn unitId null aber quantity gesetzt: nur Zahl anzeigen
- Dezimalstellen: nur wenn nötig (1.5 → "1,5", 2.0 → "2")
