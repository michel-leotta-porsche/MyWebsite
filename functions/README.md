# Cloud Functions

`mailOnReport`: Bei jeder neuen Meldung (`reports/{id}`) schickt Calima eine Mail an Michel. So hält die Zusage
aus den Nutzungsbedingungen, Meldungen binnen 24 Stunden zu prüfen. Höchstens 10 Mails pro Stunde (Zähler in
`meta/reportMail`), weitere Meldungen stehen trotzdem im Profil.

## Einmalig einrichten

1. Konto auf resend.com mit **michel.julian.leotta@gmail.com** anlegen. Ohne eigene Domain stellt Resend nur an
   die Adresse des Kontos zu; Absender ist dann `onboarding@resend.dev`.
2. In Resend einen API-Schlüssel anlegen (Recht „Sending access“ reicht).
3. Im Hauptordner: `firebase functions:secrets:set RESEND_API_KEY --project fujiventura` und den Schlüssel einfügen.
4. `cd functions && npm install && cd .. && firebase deploy --only functions --project fujiventura`.

Meldet die CLI beim Deploy, dass Region und Firestore-Standort nicht passen, in `index.js` bei `onDocumentCreated`
`region` auf den Standort der Datenbank setzen (z. B. `europe-west3`).

## Testen

Ein Buch über einen fremden Link melden. Die Mail kommt nach wenigen Sekunden. Fehler stehen in der Firebase-Konsole
unter Functions → Logs.
