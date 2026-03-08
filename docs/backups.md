# Backups

## Strategie

Firestore-Daten werden täglich automatisch per GitHub Actions in ein separates, privates Repository exportiert:
[SGFH-Kiel/sgfh-tracking-backups](https://github.com/SGFH-Kiel/sgfh-tracking-backups)

- **Frequenz**: täglich, 02:00 UTC
- **Aufbewahrung**: 60 Tage (ältere Backups werden automatisch bereinigt)
- **Kosten**: kostenlos (GitHub Actions Free Tier)
- **Format**: JSON-Dateien pro Collection, mit Firestore-Typ-Serialisierung

## Skripte

| Skript | Zweck |
|---|---|
| `scripts/backup-firestore.mjs` | Exportiert alle Collections nach JSON |
| `scripts/restore-firestore.mjs` | Importiert ein Backup in Firestore |

### Backup lokal ausführen

```bash
export FIREBASE_PROJECT_ID=sgfh-tracking-prod
export FIREBASE_SERVICE_ACCOUNT=$(cat path/to/service-account.json)
node scripts/backup-firestore.mjs
# Output: ./backup/2025-06-01T02-00-00/
```

### Restore lokal ausführen

```bash
# Dry Run (empfohlen zuerst)
DRY_RUN=true node scripts/restore-firestore.mjs backup/2025-06-01T02-00-00

# Live Restore (überschreibt existierende Dokumente)
node scripts/restore-firestore.mjs backup/2025-06-01T02-00-00
```

## GitHub Actions Workflows

### Automatisches Backup (`backup.yml`)

Wird täglich automatisch ausgeführt. Kann auch manuell ausgelöst werden:

1. GitHub → `sgfh-tracking` → **Actions** → **Firestore Backup** → **Run workflow**
2. Optional: Begründung eingeben
3. Das Backup wird erstellt und in `sgfh-tracking-backups` committet

### Restore über GitHub Actions

Restore wird im Backup-Repository ausgelöst — siehe [README des Backup-Repos](https://github.com/SGFH-Kiel/sgfh-tracking-backups#readme) für die vollständige Anleitung.

**Kurzübersicht:**
1. `sgfh-tracking-backups` → **Actions** → **Firestore Restore** → **Run workflow**
2. `backup_timestamp` leer lassen → listet verfügbare Backups
3. Timestamp eingeben + `dry_run: true` → Dry Run zur Validierung
4. `dry_run: false` + `confirm: RESTORE` → Live Restore

## Einmalige Einrichtung (Secrets)

Folgende GitHub Secrets müssen einmalig gesetzt werden:

### In `sgfh-tracking` (Settings → Secrets → Actions)

| Secret | Wert |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase Projekt-ID (z.B. `sgfh-tracking`) |
| `FIREBASE_SERVICE_ACCOUNT` | Inhalt der Service Account JSON-Datei (siehe unten) |
| `BACKUP_REPO_PAT` | GitHub Personal Access Token mit `repo`-Scope für `sgfh-tracking-backups` |

### In `sgfh-tracking-backups` (Settings → Secrets → Actions)

| Secret | Wert |
|---|---|
| `FIREBASE_PROJECT_ID` | Gleiche Projekt-ID wie oben |
| `FIREBASE_SERVICE_ACCOUNT` | Gleicher Service Account wie oben |
| `SGFH_TRACKING_PAT` | GitHub PAT mit Read-Zugriff auf `sgfh-tracking` (für Restore-Script) |

### Firebase Service Account erstellen

1. [Firebase Console](https://console.firebase.google.com) → Projekteinstellungen → Dienstkonten
2. **Neuen privaten Schlüssel generieren** → JSON herunterladen
3. Inhalt als `FIREBASE_SERVICE_ACCOUNT` Secret in GitHub hinterlegen

### GitHub PAT erstellen

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Repository: `sgfh-tracking-backups`, Permission: **Contents: Read & Write**
3. Als `BACKUP_REPO_PAT` in `sgfh-tracking` hinterlegen

## Backup-Format

Collections werden als `<collection>.json` exportiert. Dokument-IDs sind die Schlüssel:

```json
{
  "doc-id-1": {
    "field": "value",
    "createdAt": { "_type": "Timestamp", "seconds": 1748736000, "nanoseconds": 0 }
  }
}
```

Firestore-Sondertypen werden serialisiert und beim Restore automatisch zurückkonvertiert:

| Typ | Serialisierungsformat |
|---|---|
| `Timestamp` | `{ "_type": "Timestamp", "seconds": N, "nanoseconds": N }` |
| `GeoPoint` | `{ "_type": "GeoPoint", "latitude": N, "longitude": N }` |
| `DocumentReference` | `{ "_type": "DocumentReference", "path": "..." }` |
