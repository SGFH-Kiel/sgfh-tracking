# App für Smartphones: Umsetzung und Veröffentlichung

Stand: 17.10.2026

## Empfehlung

**Die App wird als Progressive Web App (PWA) direkt über die Website installiert.** Sie entsteht im normalen Build (`npm run build`) und wird mit jedem Push auf `main` automatisch per GitHub Pages ausgeliefert. Es gibt keinen Store, keine Gebühren und keinen Review. Updates sind sofort bei allen.

| Plattform | Installation | Hinweis |
|---|---|---|
| Android (Chrome, Edge, Samsung Internet) | Button „App installieren“ in der App bzw. Browser-Menü „App installieren“ | volle Unterstützung, eigenes App-Symbol und Vollbild |
| iPhone/iPad (Safari) | Teilen → „Zum Home-Bildschirm“ (die App zeigt eine Anleitung) | Apple bietet keinen Installations-Button für Websites. Home-Bildschirm-Web-Apps sind nach kurzzeitiger Einschränkung 2024 auch in der EU wieder verfügbar. |
| Desktop (Chrome, Edge) | Installations-Symbol in der Adressleiste bzw. Button in der App | optional |

## Technische Umsetzung (im Repository)

- `public/manifest.json`: Name, deutsche Beschreibung, `start_url`/`scope` `/`, `display: standalone`, Vereinsfarben, Icons 192/512 px plus maskierbare Varianten, Kurzbefehle (Arbeitsstunden, Kalender).
- `public/service-worker.js`: handgeschrieben, ohne zusätzliche Abhängigkeiten.
  - Seitenaufrufe: zuerst Netzwerk, ohne Verbindung die zwischengespeicherte App.
  - Gehashte Build-Dateien (`/static/…`): zuerst Cache.
  - Firestore- und Anmelde-Anfragen (fremde Domains) werden nie zwischengespeichert. Daten kommen immer live aus Firestore.
  - Neue Versionen übernehmen beim nächsten Neuladen. Weil Seitenaufrufe zuerst aus dem Netz kommen, startet eine installierte App mit Verbindung immer in der aktuellen Version.
  - Bei länger geöffneter App (z. B. aus dem Hintergrund zurückgeholt) vergleicht die App beim Zurückholen und stündlich das laufende Bundle mit `asset-manifest.json` und zeigt „Neue Version verfügbar – Neu laden“. Änderungen am Service Worker selbst werden zusätzlich über den Service-Worker-Update-Mechanismus erkannt.
- `src/pwa/`: Registrierung des Service Workers (nur im Produktions-Build), Erkennung von Installierbarkeit und Standalone-Modus, iOS-Anleitung.
- „App installieren“ erscheint als Symbol in der Kopfzeile (v1 und v2), in v2 zusätzlich unter „Mehr“ und als Karte in der Übersicht. Angeboten wird die Installation **nur, wenn der Service Worker erfolgreich läuft** (`navigator.serviceWorker.ready`). Im Entwicklungsmodus (`npm start`) und in Browsern ohne Service-Worker-Unterstützung bleibt sie deshalb ausgeblendet.
- Anmeldung: Im installierten Modus bleibt man angemeldet (lokale Persistenz). Im Browser gilt wie bisher die Sitzung.
- GitHub Pages: `404.html` (bereits vorhanden) sorgt für funktionierende Deep-Links.

### Bekannte Einschränkung: Google-/Microsoft-Anmeldung im installierten iOS-Modus

Firebase empfiehlt für Popup- und Redirect-Anmeldungen bei blockiertem Drittanbieter-Speicher eine eigene `authDomain` auf der App-Domain ([Firebase: Redirect Best Practices](https://firebase.google.com/docs/auth/web/redirect-best-practices)). GitHub Pages kann `/__/auth` nicht durchreichen. In installierten iOS-Web-Apps kann das Popup deshalb scheitern. Die E-Mail/Passwort-Anmeldung funktioniert überall. **Vor der breiten Ankündigung auf echten iPhones testen.** Falls nötig, Hosting auf Firebase Hosting umstellen (dort gibt es `/__/auth` auf der eigenen Domain).

## Optional: Google Play Store (Android)

Eine PWA lässt sich als **Trusted Web Activity (TWA)** in den Play Store bringen. Werkzeuge sind [Bubblewrap](https://www.thinktecture.com/en/pwa/twa-bubblewrap) (CLI) oder [PWABuilder](https://github.com/pwa-builder/pwabuilder/issues/6160) (Web-Oberfläche).

- Voraussetzungen:
  - Google-Entwicklerkonto (einmalig 25 US-$)
  - signiertes App-Bundle (`.aab`)
  - `/.well-known/assetlinks.json` auf der Domain mit dem Fingerabdruck des Signaturschlüssels; sonst öffnet sich die App nur als Browser-Tab ([web.dev](https://web.dev/articles/using-a-pwa-in-your-android-app))
  - Store-Grafiken
- **Privat statt öffentlich:** über die Testspuren „Interner Test“ (bis 100 Tester per E-Mail-Liste) oder „Geschlossener Test“. Alternativ die von PWABuilder erzeugte APK direkt verteilen (Sideloading).
- **Achtung:** Ab 31.08.2026 verlangt Google Play Ziel-API 36. Laut einem Issue im PWABuilder-Projekt zielte die Bubblewrap-Vorlage zuletzt noch auf API 35 ([Issue #6160](https://github.com/pwa-builder/pwabuilder/issues/6160)). Vor dem Bauen die aktuelle Version prüfen.
- **Einbindung in den Build:**
  - `assetlinks.json` unter `public/.well-known/` ablegen. GitHub Pages braucht dafür eine `.nojekyll`-Datei (die Deploy-Action legt sie standardmäßig an).
  - Das App-Bundle wird selten neu gebaut, weil sich Inhalte über die Website aktualisieren. Ein manueller Bubblewrap-Lauf genügt. Ein CI-Job wäre möglich, bräuchte aber den Signaturschlüssel als Secret.

## Optional: Apple App Store (iOS)

- Voraussetzungen: Apple Developer Program (99 US-$ pro Jahr), ein nativer Wrapper (z. B. Capacitor) und Xcode auf einem Mac.
- Reine Website-Hüllen werden nach Richtlinie 4.2 („Minimum Functionality“) oft abgelehnt.
- Private Verteilung ist über TestFlight möglich (Builds laufen nach 90 Tagen ab).
- **Für einen Verein nicht empfohlen.** Die Installation über den Home-Bildschirm deckt den Bedarf.

## Quellen

- [Firebase: Best practices for signInWithRedirect](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [web.dev: Using a PWA in your Android app](https://web.dev/articles/using-a-pwa-in-your-android-app)
- [Thinktecture: Bubblewrap – PWA im Play Store](https://www.thinktecture.com/en/pwa/twa-bubblewrap)
- [PWABuilder Issue #6160 (Ziel-API 36)](https://github.com/pwa-builder/pwabuilder/issues/6160)
- [Apple Developer Forums: Home Screen Web Apps in der EU](https://developers.apple.com/forums/thread/745414?page=2)
- [WebKit Bug 268643](https://bugs.webkit.org/show_bug.cgi?id=268643)
