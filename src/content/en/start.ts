// Englisch für Rahmen, Anmeldung, Fehler und Startseite (siehe index.ts)

export const START: Record<string, string> = {
  // Rahmen
  Rechtliches: "Legal",
  Impressum: "Legal notice",
  Datenschutz: "Privacy policy",
  Nutzungsbedingungen: "Terms of use",
  Hilfe: "Help",
  Räume: "Rooms",
  Bücherzimmer: "Library",
  "Ins Bücherzimmer": "Open your library",
  Anmelden: "Sign in",
  "Mit Apple anmelden": "Sign in with Apple",
  "Mit Google anmelden": "Sign in with Google",
  "Einen Moment …": "One moment …",
  "Apple oder Google": "Apple or Google",

  // Fehler
  "Dafür fehlen gerade die Rechte. Melde dich bitte neu an und versuch es nochmal.": "You don't have permission for that right now. Please sign in again and retry.",
  "Du bist nicht mehr angemeldet. Melde dich bitte neu an.": "You're no longer signed in. Please sign in again.",
  "Keine Verbindung. Versuch es gleich nochmal.": "No connection. Please try again in a moment.",
  "Das hat zu lange gedauert. Versuch es gleich nochmal.": "That took too long. Please try again in a moment.",
  "Das gibt es nicht mehr.": "This no longer exists.",
  "Gerade ist zu viel los. Versuch es später nochmal.": "It's busy right now. Please try again later.",
  "Der Speicherplatz ist voll.": "Your storage is full.",
  "Das hat nicht geklappt. Versuch es bitte nochmal.": "That didn't work. Please try again.",
  "Das Anmeldefenster wurde blockiert. Erlaube Fenster für Calima und versuch es nochmal.": "The sign-in window was blocked. Allow pop-ups for Calima and try again.",
  "Zu viele Versuche. Warte bitte einen Moment.": "Too many attempts. Please wait a moment.",
  "Das war ein anderes Konto. Wähle bitte das, mit dem du hier angemeldet bist.": "That was a different account. Please pick the one you're signed in with here.",
  "Dieses Konto ist gesperrt. Schreib mir, wenn das ein Irrtum ist.": "This account is blocked. Write to me if that's a mistake.",
  "Mit dieser E-Mail-Adresse gibt es schon ein Konto über den anderen Anbieter. Melde dich bitte damit an.":
    "There's already an account with this email address through the other provider. Please sign in with that one.",
  "Die Anmeldung hat nicht geklappt. Versuch es bitte nochmal.": "Signing in didn't work. Please try again.",

  // Landing: Kopf
  "Auf dieser Seite": "On this page",
  "Deine Fotos, gebunden.": "Your photos, bound.",
  "Ein Ordner Fotos wird ein Buch, das man wirklich umblättert. Mit dem Fuji-Rezept als Zettel dazu.":
    "A folder of photos becomes a book you actually leaf through. With the Fuji recipe tucked in as a note.",
  "Kostenlos. Wer einen Link bekommt, liest ohne Konto.": "Free. Anyone you send a link to reads without an account.",
  "Ein Buch zum Blättern im Browser, kein Druck. Anmeldung mit {providers}, es gelten die":
    "A book to leaf through in the browser, not a print. Sign in with {providers}, subject to the",
  "und der": "and",


  // Landing neu (#264)
  "Blätter mal.": "Take a look.",
  "Ein Fotobuch zum Umblättern, von Michel. Kostenlos, ohne Konto zum Anschauen.": "A photo book you actually leaf through, by Michel. Free, no account needed to look.",
  "Mach dein eigenes.": "Make your own.",
  "Was Calima kann": "What Calima does",
  "So geht’s": "How it works",
  "Die Kamera gibt es nur in der iPhone-App.": "The camera is only in the iPhone app.",
  "Sie kommt bald in den App Store.": "It's coming to the App Store soon.",
  "Vorab testen mit TestFlight": "Try it early with TestFlight",
  "Clip: Calima liest Fuji-Rezept und Lightroom-Preset, ein Look für alle Fotos": "Clip: Calima reads the Fuji recipe and the Lightroom preset, one look for every photo",
  "Clip: Fotos werden ein Buch, das Buch wird einer Person hingelegt": "Clip: photos become a book, and the book is handed to one person",
  "Kein Profil, kein Feed. Ein Buch sieht nur, wer den Link hat, und jeden Link kannst du einzeln zurückziehen.": "No profile, no feed. Only people with the link see a book, and you can take back each link on its own.",
  "Fotos reinziehen": "Drop in your photos",
  "Im Bücherzimmer ein Buch anlegen und Fotos auswählen. Calima setzt sie nach Aufnahmezeit zu Doppelseiten.": "Start a book in your library and pick photos. Calima lays them out as spreads, by capture time.",
  "Gestalten, wenn du willst": "Arrange, if you like",
  "Bilder schieben, zuschneiden, Text dazu. Das Fuji-Rezept liegt als Zettel unter dem Foto.": "Move pictures, crop, add text. The Fuji recipe sits as a note under the photo.",
  "Für jede Person ein eigener Link. Sie blättert ohne Konto und lässt dir Zettel da.": "Each person gets their own link. They leaf through without an account and leave you notes.",
  "Hinlegen|Landing": "Hand it over",
  "Mehr in der Hilfe": "More in the help",

  // Landing: Werkbank
  "Reinziehen.": "Drop them in.",
  "Fertig gesetzt.": "Laid out.",
  "Fotos vom Handy, von der Fuji oder aus Lightroom auf die Werkbank ziehen, auch HEIC und DNG. Nach ein, zwei Sekunden stehen sie als Doppelseiten da, nach Aufnahmezeit geordnet. Ortsdaten fallen beim Hochladen weg.":
    "Drag photos from your phone, your Fuji or Lightroom onto the workbench, HEIC and DNG included. A second or two later they stand as spreads, in the order you took them. Location data is dropped on upload.",
  "Erst mittags offen": "Open from noon",
  Eingerollt: "Rolled up",
  Platt: "Flat",
  "Drachenbaum, links": "Dragon tree, left",
  "4 Fotos, nach Aufnahmezeit": "4 photos, by capture time",
  "Eine Doppelseite, ohne einen Handgriff": "One spread, without lifting a finger",

  // Landing: Rezept
  "Das Rezept liegt bei.": "The recipe comes with it.",
  "Filmsimulation, Körnung, Weißabgleich: Was die Fuji in die Datei schreibt, liegt als Zettel unter dem Foto. Lightroom-Presets nimmt man gleich als .xmp mit.":
    "Film simulation, grain, white balance: what the Fuji writes into the file sits as a note beneath the photo. Lightroom presets come along as .xmp.",
  "Rezept · Beispielwerte": "Recipe · sample values",
  "Dynamik|Fuji": "Dynamic range",
  "Lichter · Schatten": "Highlights · shadows",
  Farbe: "Color",
  Körnung: "Grain",
  "schwach, klein": "weak, small",
  Weißabgleich: "White balance",

  // Landing: Hinlegen
  "Für Jana, von Michel": "For Jana, from Michel",
  "Zettel zu Tafel 7, von Jana": "Note on plate 7, from Jana",
  "Das Tor im Regen hätte ich gern an der Wand.": "I'd love the gate in the rain on my wall.",
  "Hinlegen, nicht posten.": "Hand it over, don't post it.",
  "Für jede Person ein eigener Link. Sie blättert ohne Konto, auf dem Telefon Seite für Seite, und lässt dir Zettel und Eselsohren da, die nur du liest.":
    "A link of their own for each person. They leaf through without an account, page by page on a phone, and leave you notes and dog-ears only you can read.",

  // Landing: Schluss
  "Leg deinen Sommer auf den Tisch.": "Put your summer on the table.",
  "Erstes Buch anlegen": "Start your first book",
  "Kostenlos, Anmeldung mit {providers}. Bücher sieht nur, wem du einen Link gibst.": "Free, sign in with {providers}. Only people you give a link to see your books.",
  "Beispielfotos von Michel Leotta": "Sample photos by Michel Leotta",
};
