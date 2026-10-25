# Planung: Sprach-Assistent im Familiengedächtnis

Stand: 25.10.2026 · Status: Planung, noch nichts gebaut

## Ziel

Ein Chatbot für meine Eltern, der so einfach ist, dass sie ihn ohne Technik-Erfahrung nutzen können.
Er beantwortet Fragen aus einem Familien-Datenspeicher, den Kinder und Enkel pflegen, und aus wenigen,
fest ausgewählten Quellen im Internet.

## Rahmen

| Punkt | Entscheidung |
|---|---|
| Nutzer | Eltern (ein gemeinsames iPad, vorhanden) |
| Wohnort | Kassel (für Wetter, Bus und Bahn) |
| Bedienung | **Sprache zuerst**: tippen geht heute noch, kann aber schwerer werden |
| Anrede | Du |
| Name des Bots | offen |
| Grundlage | bestehende App `index.html` (Familiengedächtnis), wurde den Eltern noch nicht gezeigt, darf also umgebaut werden |

## Architektur

```
iPad (index.html, als Symbol auf dem Home-Bildschirm)
   │  Sprache → Text (Spracherkennung im iPad)
   ▼
Google Apps Script  ──►  Claude API (mit Websuche nur auf erlaubten Seiten)
   │                 ──►  Wetterdienst (Bright Sky / Open-Meteo)
   ▼
Google Sheet (Familiendaten)
```

- Der API-Schlüssel liegt nur im Apps Script (Skripteigenschaften), **nie im Browser**.
- Wir brauchen keinen eigenen Server.
- Die Familiendaten bekommt der Bot bei jeder Frage vollständig mit, eine eigene Datenbank oder Suche ist nicht nötig.
  *Annahme:* Die Daten bleiben bei Hunderten, nicht Zehntausenden Zeilen.
- Bestehendes Backend: `apps-script/Code.gs` (liest/schreibt „Termine“ und „Sachen“, liefert Kalender-Feed).
  Die Blätter haben eine Kopfzeile, die mit „Datum“ bzw. „Gegenstand“ beginnt; Zeilen darüber werden ignoriert.
- **Absicherung nötig:** Die Web-App ist heute für jeden mit dem Link erreichbar (lesen und schreiben).
  Sobald sie Claude aufruft, könnte jeder mit dem Link Kosten verursachen. Deshalb vor Phase 1 einen
  geheimen Zugangsschlüssel einbauen, den nur das iPad kennt.

## Bedienung

Startseite:

```
┌─────────────────────────────┐
│   Sonntag, 25. Oktober      │
│        14:32 Uhr            │
│  ┌───────────────────────┐  │
│  │  🎤  Frag mich etwas  │  │   ← Hauptknopf, sehr groß
│  └───────────────────────┘  │
│  Heute: 15:00 Arzt          │   ← nur der nächste Termin
└─────────────────────────────┘
```

- Knopf antippen, sprechen. Die Aufnahme endet von selbst, wenn man aufhört zu reden. Kein ständiges Mithören.
- Oben steht, was verstanden wurde: „Du hast gefragt: …“
- Die Antwort wird **vorgelesen** (eingebaute iPad-Stimme, etwas langsamer) und erscheint groß auf dem Bildschirm.
- Große Knöpfe: **„Nochmal fragen“** und **„Nochmal vorlesen“**.
- Einstellungen verstecken (lange drücken statt sichtbarem ⚙).
- Die Formulare „+ Neuer Termin“ und „+ Neue Sache“ fallen für die Eltern weg. Einträge machen die Familie im Sheet und später der Bot.

**Noch zu testen:** Wie zuverlässig die Spracherkennung in Safari auf dem iPad ist, wissen wir nicht.
Erkennt sie die Eltern oft falsch, steigen wir auf einen Spracherkennungsdienst im Internet um
(weiterer Anbieter, Kosten, die Aufnahmen verlassen das Gerät).

## Wie der Bot antwortet

- Höchstens 2–3 kurze Sätze, ein Gedanke pro Antwort, keine Aufzählungen.
- Danach: „Möchtest du mehr dazu wissen?“
- Bei unklaren Fragen fragt er zurück, statt zu raten.
- Familienfragen beantwortet er **nur aus dem Sheet**. Steht etwas nicht drin: „Das weiß ich nicht. Frag am besten …“
- Er erfindet nichts. Wenn er sich nicht sicher ist, sagt er das.
- Bei Geschichte nennt er die Quelle („Laut Wikipedia …“), damit Streit sachlich bleibt.

### Nichts erfinden (wichtigste Anforderung)

Ganz verhindern lässt sich das nicht, aber mit mehreren Schutzschichten stark verringern:

1. **Feste Regeln im System-Prompt:** Familienfragen nur aus den mitgeschickten Daten beantworten.
   Steht es nicht drin: „Das steht nicht im Familiengedächtnis. Frag am besten …“
2. **Daten mit Kennung:** Jede Zeile aus dem Sheet bekommt eine Kennung (z. B. `Sachen-12`).
3. **Antwort mit Quellenangabe:** Der Bot antwortet in einem festen Format (Structured Output):
   Antworttext + Quelle (`familie` / `web` / `allgemein` / `weiss_nicht`) + verwendete Kennungen.
4. **Prüfung im Apps Script:** Beruft sich der Bot auf Familiendaten, prüft das Script, ob die genannten
   Kennungen wirklich existieren. Wenn nicht, wird die Antwort durch „Das weiß ich leider nicht“ ersetzt.
5. **Internet nur mit Beleg:** Antworten aus der Websuche nennen die Quelle („Laut Wikipedia …“).
6. **Allgemeinwissen mit Vorsicht:** Ist sich der Bot nicht sicher, sagt er das.
7. **Testfragen:** Eine feste Liste von Fragen, darunter bewusst solche, deren Antwort *nicht* im Sheet steht.
   Läuft vor jeder Änderung am Bot; jede erfundene Antwort gilt als Fehler.

Restrisiko: Die Spracherkennung versteht die Frage falsch. Deshalb steht immer „Du hast gefragt: …“ auf dem Bildschirm.

### Witze

- Nur wenn danach gefragt wird („Erzähl mir einen Witz“).
- Kurz, harmlos, auf Deutsch. Keine Witze über Alter, Vergesslichkeit, Krankheit, Tod, Herkunft oder Religion.
- Ausnahme von „nichts erfinden“: Witze dürfen ausgedacht sein, das ist klar Unterhaltung.
  Der Bot vermischt Witze aber nie mit Fakten.
- Wiederholungen: Der Bot weiß ohne Speicher nicht, welche Witze er schon erzählt hat. Später ggf. die letzten
  Witze im Sheet merken.

### Sicherheitsregeln

- **Notfall** (Schmerzen, gestürzt, Hilfe): sofort 112 nennen, dazu die Nummer eines Kindes.
- **Gesundheit:** nur allgemeine Informationen. Keine Diagnose, keine Dosierungen, nie „Medikament absetzen“.
  Bei nicht dringenden Fällen den ärztlichen Bereitschaftsdienst 116117 nennen, sonst den Hausarzt aus den Kontakten.
- **Betrug** (Geld am Telefon, „Enkel in Not“, falsche Polizei): deutlich warnen, „erst ein Kind anrufen“.
- Bei Geld- und Rechtsfragen nichts Verbindliches sagen, sondern auf Familie oder Bank verweisen.

## Quellen

**Reihenfolge:** 1. Familiendaten → 2. feste Quellen → 3. Allgemeinwissen des Bots. **Keine freie Internetsuche.**

| Thema | Quelle | Umsetzung |
|---|---|---|
| Wetter | Bright Sky (Daten vom Deutschen Wetterdienst) oder Open-Meteo | direkte Abfrage, Ort Kassel |
| Nachrichten | nachrichtenleicht.de, tagesschau.de (auch in einfacher Sprache) | Websuche nur auf diesen Seiten |
| Physik, Wissen | Wikipedia + Allgemeinwissen | Websuche nur auf diesen Seiten |
| Geschichte | Wikipedia | Websuche, immer mit Quellenangabe |
| Kochen, Backen | 1. Blatt „Rezepte“ (Familienrezepte), 2. Rezeptseiten | Schritt für Schritt („Sag ‚weiter‘“), auf Wunsch ein Rezept für heute. Mengen nur aus der Quelle, nie geschätzt; umrechnen auf 2 Personen erlaubt |
| Witze | Allgemeinwissen, optional Blatt „Witze“ (Lieblingswitze der Familie) | nur auf Nachfrage; siehe unten |
| Gesundheit | gesund.bund.de, gesundheitsinformation.de | Websuche nur auf diesen Seiten + Sicherheitsregeln |

Vorgeschlagene Liste (noch nicht getestet):
- Nachrichten: tagesschau.de, zdfheute.de, nachrichtenleicht.de
- Kassel und Region: hessenschau.de, hna.de (nur frei zugängliche Artikel)
- Kochen und Backen: oetker.de (Backen), ndr.de (Rezepte), chefkoch.de (sehr groß, Qualität schwankt)
- Wissen und Geschichte: de.wikipedia.org
- Gesundheit: gesund.bund.de, gesundheitsinformation.de

**Vorbild fragFINN** (Kindersuchmaschine): Dort durchsucht man nur eine Liste von Seiten, die Medienpädagogen geprüft haben.
Wir machen dasselbe für ältere Menschen. Kriterien, ob eine Seite auf die Liste kommt:
- seriös und sachlich, keine Panikmache
- frei lesbar, keine Bezahlschranke (Ausnahme: frei zugängliche HNA-Artikel)
- wenig Werbung, keine dubiosen Gesundheitsprodukte, keine Abofallen
- verständlich geschrieben, aber nicht kindlich: Die Eltern sind Erwachsene mit Lebenserfahrung
- Die Familie pflegt die Liste und darf Seiten vorschlagen oder streichen.

Anders als bei fragFINN bekommen die Eltern keine Trefferliste zum Anklicken. Der Bot liest die Seiten
und antwortet in eigenen Worten mit Quellenangabe.

**Knopf „Das stimmt nicht“:** Wie die Meldefunktion bei fragFINN. Ein Tipp darauf schreibt Frage und Antwort
in ein Blatt „Meldungen“; die Kinder schauen es sich an und verbessern Daten, Regeln oder Quellenliste.

**HNA:** Die Eltern haben ein Digital-Abo und lesen die HNA in der App. Der Bot nutzt dieses Abo **nicht**
(keine Zugangsdaten im Bot). Er sieht nur, was öffentlich ist, und verweist sonst auf die App:
„Den ganzen Artikel kannst du in deiner HNA-App lesen.“

Technik: Die Claude-Websuche bekommt eine Liste erlaubter Seiten (`allowed_domains`), andere Seiten werden nicht durchsucht.
**Vor dem Bau prüfen:** Nutzungsbedingungen der Quellen, wie gut sich die Seiten durchsuchen lassen,
welche Modelle welche Websuche-Version unterstützen.

## Familiendaten (Google Sheet)

| Blatt | Spalten | Status |
|---|---|---|
| Termine | Datum, Uhrzeit, Was, Wer | gibt es schon |
| Sachen | Gegenstand, Ort, Hinweis | gibt es schon |
| Kontakte | Name, Kategorie, Telefon, Adresse, Hinweis | neu |
| Wege | Von, Nach, Linie, Haltestelle, Hinweis | neu |
| Familie | Name, Beziehung, Geburtstag | neu |
| Rezepte | Name, Zutaten, Schritte, von wem | neu |
| Anleitungen | Gerät, Schritte | neu |
| Erinnerungen | Datum, Anlass, Was ist passiert, Wer war dabei, Eingetragen von | neu |
| Medikamente | Name, wann, wofür | **später**, Datenschutz zuerst klären |

### Erinnerungen

Erlebnisse, die die Familie festhält, z. B. „Opas 80. Geburtstag im Bergpark, Lena hat Kuchen gebacken“.
Eingetragen von Kindern und Enkeln, später auch per Sprache von den Eltern selbst („Schreib auf: Heute war Lena da“).

- Fragen wie „Erzähl mir vom letzten Geburtstag“ beantwortet der Bot warm und erzählend, aber **nur aus dem Eingetragenen**.
  Er schmückt nichts aus und erfindet keine Einzelheiten.
- Er nennt, wer es eingetragen hat („Das hat Lena aufgeschrieben“).
- Wortwahl: Das Blatt heißt „Erinnerungen“. Der Bot muss „Erzähl mir eine Erinnerung“ (Erlebnis)
  von „Erinner mich an den Arzttermin“ (Termin) unterscheiden.
- **Keine Fotos:** Bilder laufen schon über den elektronischen Bilderrahmen der Eltern.
- Der Bot erzählt **nicht von sich aus** („Heute vor einem Jahr …“), nur auf Nachfrage. Später vielleicht.
- *Annahme:* Solange es überschaubar bleibt, bekommt der Bot alle Erinnerungen mit. Werden es sehr viele lange Texte,
  schicken wir nur die passenden mit.

### Anleitungen

Für Alltagsprobleme mit Technik, z. B. **„Wo ist die HNA-App, und wie melde ich mich wieder an?“**
Die Kinder schreiben die Schritte auf, der Bot liest sie Schritt für Schritt vor („Sag ‚weiter‘“).

- **Keine Passwörter ins Sheet:** Alles im Sheet geht an Claude. Passwörter speichert das iPad selbst
  (Passwörter-App), damit sie beim Anmelden automatisch eingesetzt werden.
- Idee für Phase 2: ein großer Knopf „📰 Zeitung lesen“ auf der Startseite, der die HNA-App öffnet.
  Ob sich die App aus einer Webseite heraus öffnen lässt, ist noch nicht geprüft.

Kontakt-Kategorien z. B.: Hausarzt, Augenarzt, Optiker, Autowerkstatt, Apotheke, Nachbarn.
Kinder und Enkel tragen die Daten direkt im gemeinsamen Google Sheet ein.

Bus und Bahn: zuerst feste Wege im Sheet. Live-Abfahrten für Kassel (NVV/KVG) vielleicht später.
Ob es dafür eine nutzbare Schnittstelle gibt, ist noch nicht geprüft.

## Datenschutz

- Was die Eltern fragen, und die Inhalte des Sheets gehen an Anthropic (USA). Gespeichert sind die Daten bei Google.
- Vor dem Eintragen von Gesundheitsdaten die aktuellen Bedingungen von Anthropic zur Datennutzung prüfen.
- Ist das Repo öffentlich: keine Schlüssel, Passwörter oder persönlichen Daten in den Code.

## Modell und Kosten (grobe Schätzung)

Preise laut Claude-Dokumentation, Stand 06.10.2026. **Annahmen:** 30 Fragen am Tag,
etwa 5.000 Tokens Eingabe und 200 Tokens Antwort pro Frage.

| Modell | pro Frage | pro Monat (ca.) |
|---|---|---|
| Haiku 5.5 | ca. 0,06 Cent | ca. 0,50 € |
| Sonnet 5.5 | ca. 1,2 Cent | ca. 11 € |
| Opus 5.5 | ca. 2,4 Cent | ca. 22 € (eher mehr, weil der Bot zusätzlich „nachdenkt“) |

Nicht eingerechnet: Gebühren der Websuche (noch prüfen).
Die Kosten lassen sich senken, indem die Familiendaten zwischengespeichert werden (Prompt-Caching).

**Empfehlung:** Mit Sonnet 5.5 anfangen, Haiku 5.5 mit echten Fragen vergleichen.

## Phasen

1. **Phase 1, Grundversion:** neue Startseite mit Sprechknopf, Spracheingabe, Vorlesen.
   Der Bot liest nur: Termine, Sachen, Kontakte, Familie, Wege. Dazu Wetter für Kassel. Test mit den Eltern.
2. **Phase 2:** Erinnerungen, Nachrichten, Wissen, Geschichte, Gesundheit (feste Quellen), Rezepte, Anleitungen.
   Feinschliff nach dem ersten Test.
3. **Phase 3:** Der Bot kann auch speichern („Ich hab die Brille in die Küchenschublade gelegt“ → Sachen,
   „Schreib auf: Heute war Lena da“ → Erinnerungen).
   Danach prüfen: Medikamente, Live-Abfahrten für Bus und Bahn.

## Offene Punkte

- [x] Apps-Script-Code ins Repo (`apps-script/Code.gs`)
- [ ] Zugangsschlüssel für die Web-App einbauen
- [ ] Freigabe des Google Sheets auf „eingeschränkt“ prüfen
- [ ] Name des Bots
- [ ] Spracherkennung auf dem iPad der Eltern testen
- [ ] Quellen prüfen (Nutzungsbedingungen, Durchsuchbarkeit)
- [ ] Websuche: Gebühren und Unterstützung je Modell prüfen
- [ ] Datenschutz: Bedingungen von Anthropic prüfen
- [ ] Welche Fragen stellen die Eltern heute am häufigsten? (für den Feinschliff)
