# CORS des Foto-Speichers

Die Bildbearbeitung lädt Fotos per `fetch` und `img.crossOrigin` aus Firebase Storage. Ohne CORS-Freigabe am Bucket
zeigt die Seite die Fotos zwar an, die Bearbeitung meldet aber „Das Foto ließ sich nicht laden. Error: Bild lädt nicht“.

Die Freigabe steht in `storage-cors.json` und gilt für den Bucket `fujiventura.firebasestorage.app`.
Sie gehört nicht zum Deploy und muss nach Änderungen von Hand gesetzt werden:

```sh
gcloud storage buckets update gs://fujiventura.firebasestorage.app --cors-file=storage-cors.json --project fujiventura
```

Prüfen (ein beliebiger Download-Link eines Fotos):

```sh
curl -s -o /dev/null -D - -H "Origin: https://calima.web.app" "<download-url>" | grep -i access-control-allow-origin
```

Gesetzt am 8. Oktober 2026.
