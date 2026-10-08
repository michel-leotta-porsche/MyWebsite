# Calima für iOS

Die App ist dieselbe statische Fassung wie calima.web.app, nur mit `NEXT_PUBLIC_APP=1` gebaut und im App-Bundle
ausgeliefert (Capacitor, keine Website-Adresse). Die Seiten liegen unter `capacitor://localhost`.

## Bauen (auf dem Mac)

1. Einmalig: Xcode aus dem App Store installieren und einmal öffnen.
2. In `photos/.env.local` muss `FUJI_IMPRESSUM_ADRESSE` stehen, sonst bricht der Build ab (Impressum).
3. `npm run ios:build` baut die App-Fassung, prüft sie und kopiert sie nach `ios/App/App/public`.
4. `npx cap open ios` öffnet Xcode. Unter Signing & Capabilities das eigene Team wählen, Gerät wählen, Run.

## Was hier eigens eingestellt ist

- `App/SceneDelegate.swift`: `CalimaRouter` liefert `/zimmer` als `zimmer.html` aus; Capacitors Standard
  schickt jeden Pfad ohne Endung auf `index.html`. Unbekannte Seiten zeigen `404.html`.
- `App/Info.plist`: nur Hochformat, Kamera-Text, `ITSAppUsesNonExemptEncryption = NO`, helle Statusleiste.
- `App/PrivacyInfo.xcprivacy`: Name, E-Mail, Nutzer-ID, Fotos, Zettel; kein Tracking. Muss zu den Angaben in
  App Store Connect und zu `/datenschutz` passen.
- Nur iPhone (`TARGETED_DEVICE_FAMILY = 1`), Bundle-ID `app.calima`.
- App-Icon aus `src/app/icon.svg` ohne Rundung und ohne Transparenz, Startbild in Tischfarbe.

## Noch offen (Paket 5)

Die Anmeldung läuft noch über das Google-Popup der Website; in der App-Webansicht ist das nicht verlässlich und
`capacitor://localhost` ist keine freigegebene Firebase-Domain. Paket 5 stellt auf native Anmeldung mit Google und
Apple um.
