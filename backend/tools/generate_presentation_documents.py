#!/usr/bin/env python3
"""Regénère les PDF de présentation inclus dans le dépôt.

Optionnel : python -m pip install reportlab Pillow
L'installation Laravel n'a pas besoin de Python : les PDF sont déjà fournis.
Ces supports ne reproduisent aucun titre, CIN, acte, certificat ou signature.
"""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageOps
from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    Image as PDFImage,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BACKEND = Path(__file__).resolve().parents[1]
PROJECT = BACKEND.parent
DEST = BACKEND / "database/seeders/fixtures"
LANDS = json.loads((BACKEND / "database/seeders/data/lands.json").read_text())
CRM = json.loads((BACKEND / "database/seeders/data/presentation.json").read_text())
BY_LAND = {land["presentationKey"]: land for land in LANDS}
BY_PERSON = {person["key"]: person for person in CRM["people"]}
OWNERS = {seller["landKey"]: BY_PERSON[seller["clientKey"]] for seller in CRM["sellers"]}
NAVY = colors.HexColor("#172D48")
GOLD = colors.HexColor("#BA904C")
PALE = colors.HexColor("#F4F6F8")
MUTED = colors.HexColor("#596573")
STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(name="HeadingCA", fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=NAVY, spaceAfter=9))
STYLES.add(ParagraphStyle(name="SectionCA", fontName="Helvetica-Bold", fontSize=11, leading=15, textColor=NAVY, spaceBefore=12, spaceAfter=7))
STYLES.add(ParagraphStyle(name="BodyCA", fontName="Helvetica", fontSize=9.5, leading=14, textColor=NAVY, spaceAfter=8))
STYLES.add(ParagraphStyle(name="SmallCA", fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=6))
STYLES.add(ParagraphStyle(name="TableCA", fontName="Helvetica", fontSize=9, leading=12.5, textColor=NAVY))
MANIFEST: list[dict] = []


def ar(value: int | float) -> str:
    return f"{round(value):,}".replace(",", " ") + " Ar"


def m2(value: int) -> str:
    return f"{value:,}".replace(",", " ") + " m²"


def p(text: str, style: str = "BodyCA") -> Paragraph:
    return Paragraph(escape(str(text)).replace("\n", "<br/>"), STYLES[style])


def section(title: str) -> Paragraph:
    return p(title, "SectionCA")


def table(rows: list[tuple | list], widths: list[int] | None = None, heading: bool = False) -> Table:
    width = 515
    widths = widths or [158, width - 158]
    result = Table([[p(str(cell), "TableCA") for cell in row] for row in rows], colWidths=widths, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), .35, colors.HexColor("#DEE3E9")),
        ("BACKGROUND", (0, 0), (0, -1), PALE),
    ]
    if heading:
        commands += [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EDF2"))]
    result.setStyle(TableStyle(commands))
    return result


def page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 72, w, 72, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 21)
    canvas.setFillColor(colors.white)
    canvas.drawString(40, h - 42, "CA IMMO")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#DBE0E8"))
    canvas.drawRightString(w - 40, h - 30, "CHARGÉ D’AFFAIRES IMMOBILIER")
    canvas.drawRightString(w - 40, h - 45, "Votre terrain, Votre futur")
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(2)
    canvas.line(40, h - 73, w - 40, h - 73)
    canvas.setStrokeColor(colors.HexColor("#DFD2BC"))
    canvas.setLineWidth(.6)
    canvas.line(40, 60, w - 40, 60)
    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(40, 45, "CA IMMO — espace de gestion")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(40, 32, "Dossier interne — ne pas diffuser.")
    canvas.drawString(40, 20, f"Édition {CRM['edition']} • CA IMMO")
    canvas.drawRightString(w - 40, 44, f"{doc.page}")
    canvas.restoreState()


def write(relative: str, title: str, flows: list, group: str, case: str):
    path = DEST / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=40, leftMargin=40, topMargin=95, bottomMargin=75, title=f"CA IMMO — {title}", author="CA IMMO", subject="Document interne CA IMMO", pageCompression=1)
    doc.build([p(title, "HeadingCA"), *flows], onFirstPage=page, onLaterPages=page)
    data = path.read_bytes()
    MANIFEST.append(dict(path=relative, group=group, case=case, title=title, type="application/pdf", size=len(data), sha256=hashlib.sha256(data).hexdigest()))


def photo(land: dict):
    source = PROJECT / "frontend/public" / land["imageUrl"].lstrip("/")
    with Image.open(source) as im:
        width = min(1100, im.width, int(im.height * 1100 / 510))
        im = ImageOps.fit(im.convert("RGB"), (width, round(width * 510 / 1100)), method=Image.Resampling.LANCZOS)
        data = io.BytesIO()
        im.save(data, format="JPEG", quality=85, optimize=True)
    data.seek(0)
    return PDFImage(data, width=515, height=239)


def plan(land: dict) -> Drawing:
    d = Drawing(515, 220)
    d.add(Rect(0, 0, 515, 220, fillColor=colors.HexColor("#F7F8F7"), strokeColor=colors.HexColor("#DAE1DC"), strokeWidth=.5))
    d.add(Rect(55, 30, 390, 27, fillColor=colors.HexColor("#D9DEE5"), strokeColor=None))
    d.add(String(250, 39, "Voie d’accès illustrative", fontName="Helvetica", fontSize=9, textAnchor="middle", fillColor=NAVY))
    lots = land.get("lots") or []
    if lots:
        total = sum(lot["area"] for lot in lots)
        x = 55
        for i, lot in enumerate(lots):
            width = 390 * lot["area"] / total
            d.add(Rect(x, 67, width, 110, fillColor=[colors.HexColor("#E1E9DD"), colors.HexColor("#F2E6CF"), colors.HexColor("#D8E0EB"), colors.HexColor("#DFEAD9")][i % 4], strokeColor=colors.white, strokeWidth=3))
            d.add(String(x + width / 2, 131, lot["number"], fontName="Helvetica-Bold", fontSize=11, textAnchor="middle", fillColor=NAVY))
            d.add(String(x + width / 2, 110, m2(lot["area"]), fontName="Helvetica", fontSize=9, textAnchor="middle", fillColor=NAVY))
            x += width
    else:
        d.add(Polygon([70, 70, 430, 70, 400, 170, 95, 180], fillColor=colors.HexColor("#E4EBDF"), strokeColor=GOLD, strokeWidth=1.5))
        d.add(String(250, 132, "Emprise illustrative", fontName="Helvetica-Bold", fontSize=12, textAnchor="middle", fillColor=NAVY))
        d.add(String(250, 109, m2(land["area"]), fontName="Helvetica", fontSize=10, textAnchor="middle", fillColor=NAVY))
    d.add(Line(475, 145, 475, 182, strokeColor=NAVY, strokeWidth=1.5))
    d.add(Polygon([475, 188, 470, 178, 480, 178], fillColor=NAVY, strokeColor=None))
    d.add(String(475, 196, "N", fontName="Helvetica-Bold", fontSize=9, textAnchor="middle", fillColor=NAVY))
    d.add(String(55, 202, "Schéma non coté • orientation indicative", fontName="Helvetica", fontSize=8, fillColor=MUTED))
    return d


for index, land in enumerate(LANDS, 1):
    key = land["presentationKey"]
    reference = f"Réf. T{index:02}"
    rate = round(land["price"] / land["area"])
    common = [p(f"{reference} • {land['title']} • {land['location']}", "SmallCA")]
    write(f"terrains/{key}/fiche-commerciale.pdf", "Fiche du terrain", common + [
        photo(land), Spacer(1, 8),
        table([(m2(land["area"]), ar(land["price"]), ar(rate) + " / m²")], [170, 180, 165]),
        Spacer(1, 10), p(land["description"]),
        table([("Disponibilité", land["status"]), ("Relief / accès", f"{land['relief']} • {land['access']}"), ("Paiement envisagé", land["payment"])]),
        Spacer(1, 9), p("Prix, caractéristiques et disponibilités à confirmer lors de la visite. Visuel d’illustration, non contractuel.", "SmallCA"),
    ], "terrain", key)
    plan_flows = common + [plan(land), section("Repères du dossier"), table([
        ("Surface déclarée", m2(land["area"])),
        ("Localisation indicative", land["location"]),
        ("Coordonnées indicatives", ", ".join(str(c) for c in land["coordinates"])),
        ("Usage du document", "Description du programme et des parcelles disponibles."),
    ])]
    if land.get("lots"):
        plan_flows += [section("Parcelles du programme"), table([("Lot", "Surface", "Prix", "État"), *[(lot["number"], m2(lot["area"]), ar(lot["price"]), lot["status"]) for lot in land["lots"]]], [90, 95, 180, 150], True)]
    plan_flows += [Spacer(1, 10), p("Plan de situation indicatif : il ne remplace ni un plan cadastral, ni un relevé de géomètre, ni un bornage contradictoire.", "SmallCA")]
    write(f"terrains/{key}/plan-indicatif.pdf", "Plan de situation indicatif", plan_flows, "terrain", key)
    owner = OWNERS.get(key)
    write(f"terrains/{key}/synthese-dossier.pdf", "Synthèse du dossier", common + [
        section("Informations administratives"), table([
            ("Parcelle / surface", f"{land['title']} / {m2(land['area'])}"),
            ("Prix demandé", ar(land["price"])),
            ("Publication", {"publie":"Publié sur le portail public", "brouillon":"Brouillon — non visible sur le portail", "archive":"Archivé — retiré du portail"}[land["publicationStatus"]]),
            ("Situation foncière déclarée", land["titleStatus"]),
            ("Propriétaire", f"{owner['firstName']} {owner['lastName']}" if owner else "Non renseigné"),
        ]),
        section("Inventaire des supports joints"), table([
            ("Fiche du terrain", "Résumé commercial, prix et caractéristiques indicatifs."),
            ("Plan de situation indicatif", "Schéma d’orientation, sans valeur de bornage."),
            ("Synthèse du dossier", "Récapitulatif administratif du dossier vendeur."),
        ]),
        section("Pièces vérifiées avant l’acquisition"),
        p("Avant la signature, l’agence vérifie le titre ou le certificat foncier, le plan cadastral, les pouvoirs du vendeur et les actes antérieurs auprès des autorités compétentes."),
        
    ], "terrain", key)

for request in CRM["requests"]:
    person = BY_PERSON[request["clientKey"]]
    land = BY_LAND[request["landKey"]]
    lot = next((x for x in land.get("lots", []) if x["id"] == request.get("lotId")), None)
    title = "Fiche de préparation de visite" if request["kind"] == "visite" else "Synthèse du projet d’achat"
    price = lot["price"] if lot else land["price"]
    flows = [p(f"Dossier {request['key']} • {person['firstName']} {person['lastName']}", "SmallCA"), section("Projet et interlocuteur"), table([
        ("Client", f"{person['firstName']} {person['lastName']}"),
        ("Courriel", person["email"]),
        ("Projet", request["goal"]),
        ("Terrain", land["title"] + (f" — {lot['number']}" if lot else "")),
        ("Surface / prix envisagé", f"{m2(lot['area'] if lot else land['area'])} / {ar(price)}"),
        ("Budget maximum", ar(request["budgetMax"])),
        ("État du dossier", request["status"]),
    ]), section("Qualification du besoin"), p(request["message"]), p(request["criteria"])]
    if request["kind"] == "visite":
        flows += [section("Préparation du rendez-vous"), p("Confirmer le créneau et le point de rencontre. Présenter l’accès, l’environnement et les supports disponibles. Noter les questions du client et convenir de la prochaine étape. Le rendez-vous est reconfirmé la veille avec le client.")]
    else:
        flows += [section("Hypothèse de financement"), table([
            ("Paiement", request["paymentMode"]),
            ("Acompte envisagé", ar(request["deposit"]) if request["deposit"] else "À discuter"),
            ("Échelonnement", request["paymentDuration"] or "Sans échelonnement dans ce cas"),
        ])]
        if request["paymentDuration"] and request["deposit"]:
            flows += [Spacer(1, 8), p(f"Calcul indicatif hors frais et intérêts : prix {ar(price)}, acompte {ar(request['deposit'])}, solde {ar(price-request['deposit'])}. Sur 12 mois, mensualité indicative {ar((price-request['deposit'])/12)}.", "SmallCA")]
    flows += [Spacer(1, 8), p("Paiement et signature selon les conditions du dossier. Cette synthèse est un document commercial, non un acte de vente.", "SmallCA")]
    write(request["documentPath"], title, flows, "demande", request["key"])

for seller in CRM["sellers"]:
    person = BY_PERSON[seller["clientKey"]]
    land = BY_LAND[seller["landKey"]]
    write(seller["profilePath"], "Profil du propriétaire", [
        p("Dossier vendeur — support administratif", "SmallCA"),
        table([
            ("Nom du client", f"{person['firstName']} {person['lastName']}"),
            ("Activité", person["profession"]),
            ("Zone", person["address"]),
            ("Courriel", person["email"]),
            ("Projet proposé", land["title"]),
            ("Surface / prix indicatif", f"{m2(land['area'])} / {ar(land['price'])}"),
            ("État du dossier", seller["status"]),
        ]), section("État des informations reçues"), p(seller["note"]),
        section("Pièces et démarches à prévoir"), p(seller["legalCheck"]),
        section("Nature de ce document"),
        p("Copie conservée au dossier client. Document de démonstration, non valable comme pièce d’identité."),
        
    ], "proprietaire", seller["key"])

for search in CRM["searches"]:
    person = BY_PERSON[search["clientKey"]]
    write(search["documentPath"], "Cahier de recherche", [
        p(f"Recherche {search['key']} • {person['firstName']} {person['lastName']}", "SmallCA"),
        table([
            ("Client", f"{person['firstName']} {person['lastName']}"),
            ("Usage recherché", search["usage"]),
            ("Budget maximum", ar(search["budgetMax"])),
            ("Surface souhaitée", f"{m2(search['areaMin'])} à {m2(search['areaMax'])}"),
            ("Zone principale", search["mainZone"]),
            ("Autres zones acceptées", search["otherZones"]),
            ("Rayon / flexibilité", f"{search['radiusKm']} km / {search['flexible']}"),
            ("État du dossier", search["status"]),
        ]), section("Critères exprimés"), p(search["criteria"]),
        section("Propositions envoyées"),
        p("\n".join(BY_LAND[key]["title"] for key in search["proposalLandKeys"]) or "Aucun terrain proposé à cette étape."),
        Spacer(1, 8), p("Cahier de recherche : critères recueillis lors de l’entretien, à actualiser à chaque échange.", "SmallCA"),
    ], "recherche", search["key"])

# Index et contrôles d'intégrité : seulement les PDF nécessaires au jeu.
DEST.mkdir(parents=True, exist_ok=True)
(DEST / "manifest.json").write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2) + "\n")
lines = ["# CA IMMO — index des pièces de présentation", "", "**Jeu de démonstration.** Supports d’illustration : ce ne sont pas des titres ou des pièces authentiques.", "", f"{len(MANIFEST)} PDF fournis. Le chargement Laravel copie ces PDF sur le disque privé ; ils sont consultables après connexion à l’espace de gestion.", "", "| Fichier | Dossier | Nature |", "|---|---|---|"]
lines += [f"| `{row['path']}` | {row['case']} | {row['title']} |" for row in MANIFEST]
lines += ["", "`manifest.json` donne la taille et le SHA-256 de chaque fichier. Les originaux éventuellement déjà présents dans le logiciel ne sont ni remplacés ni supprimés."]
(DEST / "INDEX_DES_PIECES.md").write_text("\n".join(lines) + "\n")
print(f"{len(MANIFEST)} PDF générés — {sum(row['size'] for row in MANIFEST):,} octets.")
