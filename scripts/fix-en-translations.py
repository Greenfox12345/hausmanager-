#!/usr/bin/env python3
"""Fix all EN translation values that are identical to DE (untranslated)."""
import json, os

BASE = "client/public/locales"

# All corrections: { namespace: { "dot.key": "EN value" } }
CORRECTIONS = {
    "borrow": {
        "actions.approve": "Approve",
        "actions.reject": "Reject",
        "actions.revoke": "Revoke",
        "guidelines": "Loan Guidelines",
        "requests": "Loan Requests",
        "status.active": "On Loan",
        "status.approved": "Approved",
        "status.rejected": "Rejected",
    },
    "borrows": {
        "cancelDialog.optional": "(optional)",   # same in EN – keep
        "metaInfo.dateRange": "{{startDate}} – {{endDate}}",  # same in EN – keep
        "hidePast": "Hide past",
        "showPast": "Show past",
    },
    "calendar": {
        "views.agenda": "Agenda",  # same in EN – keep (proper noun)
    },
    "common": {
        "actions.editDetails": "Edit details",
        "actions.showLess": "Show less",
        "status.loading": "Loading inventory...",
        "labels.name": "Name",        # same in EN – keep
        "labels.status": "Status",    # same in EN – keep
        "labels.tags": "Tags",        # same in EN – keep
        "labels.optional": "Optional",  # same in EN – keep
        "labels.by": "by",
        "labels.clock": "",           # will be handled specially
        "labels.details": "Details",  # same in EN – keep
        "labels.email": "Email",
        "labels.photos": "Photos",
        "labels.time": "Time",
        "labels.unassigned": "Unassigned",
        "messages.info": "Information",  # same in EN – keep
        "household.admin": "Administrator",  # same in EN – keep
        "auth.signInToContinue": "Sign in to continue",  # already EN
        "auth.accessRequiresAuth": "Access to this dashboard requires authentication. Continue to launch the login flow.",  # already EN
        "auth.signIn": "Sign in",   # already EN
        "auth.signOut": "Sign out",  # already EN
        "imageCropEditor.zoomLabel": "Zoom",  # same in EN – keep
        "sidebar.toggleNavigation": "Toggle navigation",  # already EN
        "sidebar.navigation": "Navigation",  # same in EN – keep
        "menu.menu": "Menu",  # same in EN – keep
        "sort.asc": "A–Z",   # same in EN – keep
        "sort.desc": "Z–A",  # same in EN – keep
        "pleaseLogin": "Please log in",
    },
    "history": {
        "fields.details": "Details",  # same in EN – keep
        "labels.pdfCount_one": "{{count}} PDF",   # same in EN – keep
        "labels.pdfCount_other": "{{count}} PDFs",  # same in EN – keep
        "labels.pdfCount": "{{count}} PDF",  # same in EN – keep
    },
    "inventory": {
        "fields.name": "Name",  # same in EN – keep
        "fields.details": "Details",  # same in EN – keep
        "fields.createdAt": "Created on",
        "fields.detailsPlaceholder": "e.g. MacBook Pro 2023",
        "fields.namePlaceholder": "e.g. Laptop",
        "categories.edit": "Edit category",
        "categories.manage": "Manage categories",
        "categories.namePlaceholder": "e.g. Electronics",
        "categories.new": "New category",
        "messages.categoryUpdated": "Category updated",
        "messages.nameCategoryRequired": "Name and category are required",
        "actions.requests": "Requests",
    },
    "members": {
        "fields.name": "Name",  # same in EN – keep
    },
    "neighborhood": {
        "fields.code": "Code:",  # same in EN – keep
    },
    "projects": {
        "fields.status": "Status",  # same in EN – keep
        "fields.budget": "Budget",  # same in EN – keep
    },
    "shopping": {
        "fields.name": "Name",  # same in EN – keep
        "fields.details": "Details",  # same in EN – keep
        "messages.categoryCreated": "Category created",
        "messages.categoryRenamed": "Category renamed",
        "messages.updateError": "Error updating",
    },
    "tasks": {
        "fields.rotation": "Rotation",  # same in EN – keep
        "fields.status": "Status",  # same in EN – keep
        "frequency.rotation": "Rotation",  # same in EN – keep
        "repeat.day": "day",
        "repeat.month": "month",
        "repeat.monthly": "Monthly",
        "repeat.week": "week",
        "dialog.details": "Details",  # same in EN – keep
        "dialog.detailsTab": "Details",  # same in EN – keep
        "dialog.tabDetails": "Details",  # same in EN – keep
        "requiredItems.status": "Status",  # same in EN – keep
        "messages.milestoneRecorded": "Milestone recorded!",
        "actions.recordMilestone": "Record milestone",
        "actions.remind": "Remind",
        "completeDialog.pdfs": "PDFs (optional)",  # same in EN – keep
        "table.status": "Status",  # same in EN – keep
        "labels.assignedTo": "Responsible",
        "permissions.milestonesReminders": "Milestones & Reminders",
        "sharedWith": "Shared with",
    },
}


def set_nested(d, dotkey, value):
    """Set a value in a nested dict using dot notation."""
    keys = dotkey.split(".")
    for k in keys[:-1]:
        d = d.setdefault(k, {})
    d[keys[-1]] = value


def get_nested(d, dotkey):
    keys = dotkey.split(".")
    for k in keys:
        if not isinstance(d, dict):
            return None
        d = d.get(k)
    return d


changed_total = 0
for ns, corrections in CORRECTIONS.items():
    path = f"{BASE}/en/{ns}.json"
    if not os.path.exists(path):
        print(f"⚠️  {path} not found, skipping")
        continue
    with open(path) as f:
        data = json.load(f)

    changed = 0
    for dotkey, new_val in corrections.items():
        old_val = get_nested(data, dotkey)
        if old_val is None:
            continue  # key doesn't exist yet
        # Only update if old value is different from new value
        if old_val != new_val:
            set_nested(data, dotkey, new_val)
            changed += 1

    if changed:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ en/{ns}.json: {changed} Werte korrigiert")
        changed_total += changed

# Special case: labels.clock should be empty string in EN (no "o'clock" suffix needed)
# Actually in EN we use "o'clock" or nothing - let's use empty string
path = f"{BASE}/en/common.json"
with open(path) as f:
    data = json.load(f)
labels = data.get("labels", {})
if labels.get("clock") == "Uhr":
    labels["clock"] = ""
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("✅ en/common.json: labels.clock = '' (kein Suffix in EN)")
    changed_total += 1

print(f"\n✅ Gesamt: {changed_total} EN-Werte korrigiert")
