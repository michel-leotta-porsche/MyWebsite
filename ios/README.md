# Calima für iOS

Die App ist dieselbe statische Fassung wie calima.web.app, nur mit `NEXT_PUBLIC_APP=1` gebaut und im App-Bundle
ausgeliefert (Capacitor, keine Website-Adresse). Die Seiten liegen unter `capacitor://localhost`.

## Bauen (auf dem Mac)

1. Einmalig: Xcode aus dem App Store installieren und einmal öffnen.
2. In `.env.local` muss `FUJI_IMPRESSUM_ADRESSE` stehen, sonst bricht der Build ab (Impressum).
3. `npm run ios:build` baut die App-Fassung, prüft sie und kopiert sie nach `ios/App/App/public`.
4. `npx cap open ios` öffnet Xcode. Unter Signing & Capabilities das eigene Team wählen, Gerät wählen, Run.

## Was hier eigens eingestellt ist

- `App/SceneDelegate.swift`: `CalimaRouter` liefert `/zimmer` als `zimmer.html` aus; Capacitors Standard
  schickt jeden Pfad ohne Endung auf `index.html`. Unbekannte Seiten zeigen `404.html`.
- `App/App.entitlements`: Sign in with Apple. `GoogleService-Info.plist` ist im Projekt eingetragen, die Datei kommt aus Firebase.
- `App/Info.plist`: nur Hochformat, Kamera-Text, `ITSAppUsesNonExemptEncryption = NO`, helle Statusleiste.
- `App/PrivacyInfo.xcprivacy`: Name, E-Mail, Nutzer-ID, Fotos, Zettel; kein Tracking. Muss zu den Angaben in
  App Store Connect und zu `/datenschutz` passen.
- Nur iPhone (`TARGETED_DEVICE_FAMILY = 1`), Bundle-ID `app.calima`.
- App-Icon aus `src/app/icon.svg` ohne Rundung und ohne Transparenz, Startbild in Tischfarbe.

## Anmelden mit Apple und Google (einmalig einrichten)

Der Code ist fertig (`src/lib/firebase.ts`): Auf der Website öffnet sich ein Popup, in der App das native Fenster
von Apple bzw. Google über `@capacitor-firebase/authentication`, angemeldet wird in beiden Fällen im Web-SDK.
Diese Schritte kann nur der Inhaber der Konten machen:

1. **Apple Developer** (developer.apple.com → Certificates, Identifiers & Profiles)
   - Identifiers → App IDs → `app.calima` anlegen (oder Xcode legt es beim ersten Signieren an) und
     **Sign in with Apple** anhaken.
   - Identifiers → Services IDs → neu, z. B. `app.calima.web`. Sign in with Apple aktivieren, als Domain
     `calima.web.app` und als Return URL `https://calima.web.app/__/auth/handler` eintragen. Das braucht nur die Website.
   - Keys → neuer Schlüssel mit Sign in with Apple, `.p8` herunterladen. Key ID und Team ID notieren.
2. **Firebase-Konsole** (Projekt fujiventura)
   - Authentication → Anmeldemethode → **Apple** aktivieren. Services ID, Team ID, Key ID und den Inhalt der `.p8` eintragen.
   - Projekteinstellungen → Meine Apps → **iOS-App** mit Bundle-ID `app.calima` hinzufügen.
     `GoogleService-Info.plist` herunterladen und nach `ios/App/App/GoogleService-Info.plist` legen.
     Die Datei ist kein Geheimnis und darf ins Repository.
3. `npm run ios:build` trägt das URL-Schema für Google (`REVERSED_CLIENT_ID`) selbst in die `Info.plist` ein.
4. In Xcode unter Signing & Capabilities prüfen, dass **Sign in with Apple** erscheint (kommt aus `App/App.entitlements`).

## Konto löschen und Apple

Beim Löschen meldet man sich neu an. Bei Apple liefert diese Anmeldung, womit Calima die Verbindung zur Apple-ID
widerruft (Richtlinie 5.1.1(v)): auf der Website ein Access-Token (`revokeAccessToken`), in der App einen
Autorisierungscode, den `accounts:revokeToken` mit `tokenType: CODE` annimmt. Ein Fehler beim Widerruf hält das
Löschen nicht auf. Auf dem Gerät prüfen: nach dem Löschen steht Calima nicht mehr unter Einstellungen → Apple-ID →
Mit Apple anmelden.
