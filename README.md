# Tankpreis-Analyse Dashboard
---

## Projektinformationen

| | |
|---|---|
| **Hochschule** | Hochschule für Technik Stuttgart |
| **Vorlesung** | [Informationsvisualisierung und Visual Analytics] |
| **Semester** | Wintersemester 2025/26 |
| **Gruppe** | Gruppe 9 |

### Gruppenmitglieder

| Name |
|------|
| [Giuliano Donato] |
| [Klempar Sheyenne] |
| [Nakay Selcuk] |
| [Yanik Enes] |
| [Yansulak Tayfun] |

---

## Fragestellungen & Visualisierungen

Dieses Dashboard beantwortet vier zentrale Fragestellungen zur Entwicklung von Kraftstoffpreisen.

---

### Markttrends
**Fragestellung:** *Wie bewegen sich generell die Tankpreise, welche Marktphasen sind zu beobachten?*

| | |
|---|---|
| **Diagrammtyp** | Interaktives Liniendiagramm |S
| **Interaktion** | Auswahl von Kraftstoffart, Jahr und Ort • Ein-/Ausschalten von Marktphasen, Ölpreis-Referenz und Volatilitätsband • Detaillierter Tooltip bei Hover |

**Designbegründung:**
- Der **gleitende Durchschnitt** glättet tägliche Preisschwankungen und macht Trends sichtbar.
- Das **Volatilitätsband** visualisiert die Unsicherheit im Markt.
- Marktphasen werden als dezente **Hintergrund-Farbflächen** dargestellt, um Marktmechanismen verständlich zu machen.

---

### Regional-Vergleich
**Fragestellung:** *Welche regionalen Unterschiede in Deutschland sind zu erkennen?*

| | |
|---|---|
| **Diagrammtyp** | Grid-basierte Heatmap
| **Interaktion** | Zeitsteuerung über Jahr und Monat • Barrierefrei-Modus (Grün-Rot → Blau-Rot) • Detailvergleich zweier Regionen (Slot A/B) mit Modal-Fenster |

**Designbegründung:**
- Das **Gitter-Raster** ermöglicht eine flächendeckende Darstellung Deutschlands.
- Die **Perzentil-Skalierung** filtert statistische Ausreißer.
- Der Detail-Vergleich erlaubt eine präzise, punktuelle Analyse ohne Informationsüberflutung.

---

### Corona-Krise 2020
**Fragestellung:** *Wie haben sich die Kraftstoffpreise während der Corona-Pandemie verändert und welche Muster sind erkennbar?*

| | |
|---|---|
| **Diagrammtyp** | Multi-Layer Liniendiagramm|
| **Interaktion** | Umschalten der Kraftstoffart • Event-Analyse durch fest verankerte Zeitmarker (Lockdowns) • Statistische Übersichtskarten (Tiefst-/Höchstwert) |

**Designbegründung:**
- Die direkte Verknüpfung von **politischen Ereignissen** (Lockdowns) mit der Preiskurve zeigt Kausalitäten auf.
- Der **Rohölpreis (Brent)** ist als graue Fläche im Hintergrund hinterlegt, um die Entkoppelung von Rohstoff- und Endverbraucherpreis während der Krise zu verdeutlichen.

---

### Ukraine-Schock 2022
**Fragestellung:** *Welchen Einfluss hatte der Ukraine-Krieg auf die Kraftstoffpreise in Deutschland?*

| | |
|---|---|
| **Diagrammtyp** | Bubble Chart mit Zeitachse |
| **Interaktion** | Barrierefrei-Modus für die Farbskala • Fixieren von Blasen (Pins) zur dauerhaften Anzeige • Vertikale Ereignis-Marker für Meilensteine |

**Designbegründung:**
- **Visualisierung der Dynamik**: Jede Blase repräsentiert einen Tag. Die Größe und der vertikale Abstand zeigen die Intensität der Preisänderung.
- **Die "Raupe"**: Im stabilen Markt bilden die Blasen eine geschlossene Kette.
- **Lückenanzeige (Vakuum)**: Wenn zwei Kreise getrennt sind, signalisiert dies einen **massiven Preissprung** innerhalb von 24 Stunden. Dieser "Bruch" in der Visualisierung macht Marktschocks haptisch greifbar.
- Die **Ereignis-Linien** enden am oberen Rand der Blasen, um den "Aufprall" des Ereignisses auf den Markt zu symbolisieren, ohne die Daten zu verdecken.

---

## Installation

### Voraussetzungen

- Python 3.8+ (für lokale Installation)
- Docker (für Container-Installation)
- Git

---

### Option 1: Docker

```bash
# 1. Repository klonen
git clone https://gitlab.rz.hft-stuttgart.de/dpt_winter2526/tankdaten_infvis.git
cd tankdaten_infvis

# 2. Docker-Image bauen und Container starten
docker build -t tankdaten-app .
docker run -d -p 5000:5000 --name tankdata_instance tankdaten-app

# 3. Im Browser öffnen
# http://localhost:5000
```

**Container stoppen/neu starten:**
```bash
# Container stoppen
docker stop tankdata_instance

# Container entfernen und neu bauen (nach Code-Änderungen)
docker rm -f tankdata_instance
docker build -t tankdaten-app .
docker run -d -p 5000:5000 --name tankdata_instance tankdaten-app
```

---

### Option 2: Lokale Installation

```bash
# 1. Repository klonen
git clone https://gitlab.rz.hft-stuttgart.de/dpt_winter2526/tankdaten_infvis.git
cd tankdaten_infvis

# 2. (Optional) Virtuelle Umgebung erstellen
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# 3. Python Dependencies installieren
pip install -r requirements.txt

# 4. Backend starten
python app.py

# 5. Im Browser öffnen
# http://localhost:5000
```

---

## 📁 Projektstruktur

```
## 📁 Projektstruktur

```text
tankdaten_infvis/
├── backend/
│   ├── app.py                  # Flask API Server mit Endpoints
│   ├── market_phases.py        # Logik zur Erkennung von Marktphasen
│   ├── data/                   # Daten-Verzeichnis
│   │   ├── cache/              # Berechnete Caches für Performance
│   │   ├── geometries/         # GeoJSON für die Deutschlandkarte
│   │   └── *.parquet           # Optimierte Preisdaten (Täglich/Wöchentlich/Monatlich)
│   └── scripts/                # Hilfsskripte für Datenimport & Berechnung
│
├── frontend/
│   ├── index.html              # Zentrale Einstiegsseite (Single Page App)
│   ├── index.css               # Globales Styling & Variablen
│   ├── img/                    # Grafiken und Icons
│   └── js/                     # Frontend-Logik
│       ├── main.js             # Initialisierung & Routing
│       ├── state.js            # Globales State-Management
│       ├── components/         # Wiederverwendbare Visualisierungs-Komponenten
│       │   ├── CrisisChart.js          # Corona-Chart
│       │   ├── MarketPhasesChart.js    # Markttrends-Chart
│       │   ├── RegionalMap.js          # Deutschlandkarte
│       │   └── UkraineBubbleChart.js   # Ukraine-Bubble-Chart
│       └── pages/              # Seiten-Controller
│           ├── CrisisPage.js
│           ├── MarketPhasesPage.js
│           ├── RegionalPage.js
│           └── UkrainePage.js
│
├── Dockerfile                  # Konfiguration für Docker-Container
├── requirements.txt            # Python-Abhängigkeiten
└── README.md                   # Projekt-Dokumentation
```

## Technologie-Stack

### Frontend

- **HTML5 / CSS3** - Semantisches Markup, CSS Grid/Flexbox
- **JavaScript (ES6+)** - Modulare Architektur
- **D3.js v7** - Datenvisualisierung
- **Leaflet** - Kartenintegration

### Backend

- **Python 3** - Serverlogik
- **Flask** - REST API Framework
- **Pandas** - Datenverarbeitung

### DevOps

- **Docker** - Containerisierung
- **Git** - Versionskontrolle

---

## Datenquellen

- **Tankstellenpreise**: Tankerkönig
- **Rohölpreise (Brent)**: US EAI
- **Wechselkurse (EUR/USD)**: EZB
