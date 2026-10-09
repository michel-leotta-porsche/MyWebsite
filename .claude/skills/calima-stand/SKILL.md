---
name: calima-stand
description: Zeigt Michel, was bei Calima gerade wo steht: offene PRs, gemergt aber nicht live, live im Web, Stand der App in TestFlight. Nutzen bei Fragen wie „was ist live?“ oder „Stand?“.
---

# Calima: Was ist wo?

Michel will auf einen Blick sehen, in welcher Stufe jede Änderung steckt. Es gibt vier Stufen, immer in dieser Reihenfolge:

1. **Offen**: PR auf GitHub, mit eigenem Vorschau-Link (automatisch je PR).
2. **Gemergt**: auf `main`, aber noch nicht live.
3. **Live im Web**: auf calima.web.app. Geht nur per Knopf: Actions → „Ausspielen“ → Run workflow auf `main`.
4. **In der App**: Xcode Cloud baut nach jedem Merge auf `main` und legt den Build in TestFlight.

Repo: `michel-leotta-porsche/calima` (in den GitHub-MCP-Tools als Repo-Name `MyWebsite`). Firebase-Projekt `fujiventura`.

## Ablauf

Nur lesen. Nichts mergen, ausspielen oder bauen, außer Michel sagt es ausdrücklich.

1. **Main**: `list_commits` auf `main`, die letzten 15. Jeder Squash-Merge trägt die PR-Nummer im Titel.
2. **Live im Web**: `actions_list` → `list_workflow_runs` für `ausspielen.yml`, Event `workflow_dispatch`. Der neueste Lauf mit `conclusion: success` gibt per `head_sha` den Live-Stand. Ein Lauf mit `status: in_progress` heißt „wird gerade ausgespielt“. Alle Commits auf `main` nach diesem `head_sha` sind „gemergt, noch nicht live“. Commits, die nur `ios/`, `docs/`, `*.md`, `.claude/` oder `.github/` ändern, brauchen kein Ausspielen; kennzeichne sie so.
3. **App**: Xcode Cloud meldet jeden Build als Check am Commit auf `main`. Lies die Check-Runs des neuesten `main`-Commits und such einen Eintrag von Xcode Cloud. Ist keiner lesbar, schreib „App: am iPhone in TestFlight die Build-Nummer prüfen“ und rate nicht.
4. **Offen**: `list_pull_requests` mit `state: open`. Pro PR die Check-Runs: alle grün = „bereit zum Mergen“, etwas läuft = „Prüfungen laufen“, rot = „Fehler“, Entwurf = „Entwurf“. Dependabot-PRs (Titel „Pakete: Bump …“) getrennt und knapp aufführen.

## Antwort

Auf Deutsch, kurz, ohne Commit-Hashes. Änderungen mit ihrem PR-Titel in Michels Worten benennen, PRs verlinken.

```
Live im Web: Stand von <Uhrzeit>, bis einschließlich „<letzter PR-Titel>“
In der App: <letzter Build oder „unbekannt“>
Gemergt, noch nicht live: <Liste oder „nichts“>
Offen: <PR – Zustand – Vorschau-Link>

Nächster Schritt: <genau eine Empfehlung, z. B. „Ausspielen drücken“ oder „#123 mergen“>
```

Wenn alles live und in der App ist, genügt ein Satz: „Alles ist live und in der App, offen ist nur …“.
