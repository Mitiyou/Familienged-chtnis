/**
 * Familiengedächtnis – Google Apps Script Backend
 *
 * Diese Datei gehört in den Apps-Script-Editor der Google-Tabelle
 * "Familiengedaechtnis" (Erweiterungen → Apps Script → Inhalt von Code.gs
 * durch diesen Text ersetzen). Anschließend als Web-App bereitstellen
 * (siehe Anleitung_Familiengedaechtnis.md, Schritt 2).
 *
 * Liest/schreibt die Tabellenblätter "Termine" und "Sachen" und stellt
 * außerdem einen ICS-Kalenderfeed bereit, den die native Kalender-App
 * des iPads abonnieren kann.
 */

var SHEET_TERMINE = "Termine";
var SHEET_SACHEN = "Sachen";

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "data";
  if (action === "ics") {
    return ContentService.createTextOutput(buildIcs())
      .setMimeType(ContentService.MimeType.ICAL);
  }
  var data = {
    termine: readTermine(),
    sachen: readSachen()
  };
  return jsonResponse(data);
}

// Wichtig: fetch() vom iPad schickt den Body als "text/plain", damit der
// Browser keine CORS-Preflight-Anfrage schickt (die Apps Script nicht
// unterstützt). Wir parsen den Text hier trotzdem als JSON.
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Ungültige Anfrage" });
  }
  try {
    if (body.type === "termin") {
      appendTermin(body);
    } else if (body.type === "sache") {
      appendSache(body);
    } else {
      return jsonResponse({ ok: false, error: "Unbekannter Typ: " + body.type });
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Tabellenblatt nicht gefunden: " + name);
  return sheet;
}

// Findet die Kopfzeile anhand des ersten Zellentexts (z.B. "Datum" oder
// "Gegenstand"), damit Titel-/Hinweiszeilen darüber ignoriert werden.
function findHeaderRow(sheet, regex) {
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) return 1;
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] && regex.test(String(values[i][0]))) return i + 1;
  }
  return 1;
}

function readTermine() {
  var sheet = getSheet(SHEET_TERMINE);
  var headerRow = findHeaderRow(sheet, /^Datum/i);
  var lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return [];
  var range = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 4).getValues();
  var out = [];
  range.forEach(function (r) {
    var datum = formatDateCell(r[0]);
    var uhrzeit = formatTimeCell(r[1]);
    var was = String(r[2] || "").trim();
    var wer = String(r[3] || "").trim();
    if (datum && was) out.push({ datum: datum, uhrzeit: uhrzeit, was: was, wer: wer });
  });
  return out;
}

function readSachen() {
  var sheet = getSheet(SHEET_SACHEN);
  var headerRow = findHeaderRow(sheet, /^Gegenstand/i);
  var lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return [];
  var range = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 3).getValues();
  var out = [];
  range.forEach(function (r) {
    var obj = String(r[0] || "").trim();
    var ort = String(r[1] || "").trim();
    var hinweis = String(r[2] || "").trim();
    if (obj) out.push({ gegenstand: obj, ort: ort, hinweis: hinweis });
  });
  return out;
}

// Google Sheets liefert Datums-/Zeitzellen manchmal als echtes Date-Objekt
// (je nach Zellformat), manchmal als Text. Beides wird hier einheitlich
// in "TT.MM.JJJJ" bzw. "HH:MM" umgewandelt.
function formatDateCell(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "dd.MM.yyyy");
  }
  return String(v || "").trim();
}
function formatTimeCell(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "HH:mm");
  }
  return String(v || "").trim();
}

function appendTermin(body) {
  if (!body.datum || !body.was) throw new Error("Datum und 'Was' sind Pflichtfelder");
  var sheet = getSheet(SHEET_TERMINE);
  sheet.appendRow([body.datum, body.uhrzeit || "", body.was, body.wer || ""]);
}

function appendSache(body) {
  if (!body.gegenstand) throw new Error("Gegenstand ist Pflichtfeld");
  var sheet = getSheet(SHEET_SACHEN);
  sheet.appendRow([body.gegenstand, body.ort || "", body.hinweis || ""]);
}

// Baut einen ICS-Kalenderfeed aus allen Terminen, mit Erinnerung
// 1 Tag vorher und 1 Stunde vorher. Zum Abonnieren in der nativen
// Kalender-App des iPads (siehe Anleitung, Schritt "Kalender abonnieren").
function buildIcs() {
  var termine = readTermine();
  var tz = Session.getScriptTimeZone();
  var lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Familiengedaechtnis//DE");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("X-WR-CALNAME:Familientermine");

  termine.forEach(function (t, idx) {
    var dt = parseGermanDateTime(t.datum, t.uhrzeit);
    if (!dt) return;
    var dtStart = Utilities.formatDate(dt, tz, "yyyyMMdd'T'HHmmss");
    var dtEnd = Utilities.formatDate(new Date(dt.getTime() + 60 * 60 * 1000), tz, "yyyyMMdd'T'HHmmss");
    lines.push("BEGIN:VEVENT");
    lines.push("UID:familiengedaechtnis-" + idx + "-" + dtStart + "@familiengedaechtnis");
    lines.push("DTSTAMP:" + Utilities.formatDate(new Date(), tz, "yyyyMMdd'T'HHmmss'Z'"));
    lines.push("DTSTART;TZID=" + tz + ":" + dtStart);
    lines.push("DTEND;TZID=" + tz + ":" + dtEnd);
    lines.push("SUMMARY:" + icsEscape(t.was + (t.wer ? " (" + t.wer + ")" : "")));
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push("DESCRIPTION:Erinnerung");
    lines.push("TRIGGER:-PT1H");
    lines.push("END:VALARM");
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push("DESCRIPTION:Erinnerung");
    lines.push("TRIGGER:-P1D");
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function icsEscape(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function parseGermanDateTime(datumStr, uhrzeitStr) {
  var m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(datumStr || "");
  if (!m) return null;
  var day = parseInt(m[1], 10), month = parseInt(m[2], 10), year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  var hh = 9, mm = 0;
  var tm = /^(\d{1,2}):(\d{2})/.exec(uhrzeitStr || "");
  if (tm) { hh = parseInt(tm[1], 10); mm = parseInt(tm[2], 10); }
  return new Date(year, month - 1, day, hh, mm, 0);
}
