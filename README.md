# 🛢️ FuelIntel Germany - Tankpreis-Analyse Dashboard

> **Interaktives Dashboard zur Visualisierung und Analyse deutscher Kraftstoffpreise**

Ein modernes, responsives Web-Dashboard zur Analyse von Tankstellenpreisen in Deutschland. Das Projekt visualisiert historische Preisdaten und zeigt die Auswirkungen globaler Krisen (Corona-Pandemie, Ukraine-Krieg) auf die Kraftstoffpreise.

---

## 📸 Screenshots

### Übersicht Dashboard

![Dashboard Overview](frontend/img/logo.png)

### Corona-Krisenanalyse 2020

Interaktive Visualisierung der COVID-19 Auswirkungen auf Kraftstoffpreise mit Lockdown-Markierungen.

### Ukraine-Schock 2022 (Bubble Chart)

Einzigartige Bubble-Chart Visualisierung - jede Blase repräsentiert einen Tag, Größe = Preis, Farbe = Preisniveau.

---

## ✨ Features

### 📊 Visualisierungen

- **Übersicht**: Aktuelle Durchschnittspreise und Tagestrends
- **Preistrends**: Historische Preisentwicklung mit interaktiven Charts
- **Krisen-Analyse (Corona 2020)**: Korrelation zwischen Lockdowns und Preisverfall
- **Ukraine-Schock 2022**: Bubble-Chart mit animierten Tagesblasen
- **Regional-Vergleich**: Kartenbasierte Preisunterschiede nach Bundesland

### 🎨 Design

- Modernes Light-Theme Design
- Responsive Layout für alle Bildschirmgrößen
- Animierte Übergänge und Hover-Effekte
- Interaktive Tooltips mit "Click-to-Pin" Funktion

### 🔧 Technische Features

- Echtzeit-Datenvisualisierung mit D3.js
- ResizeObserver für responsive Charts
- Flask REST API Backend
- Modulare JavaScript Architektur

---

## 🚀 Installation

### Voraussetzungen

- Python 3.8+
- Node.js (optional, für Entwicklung)
- Git

### 1. Repository klonen

```bash
git clone https://github.com/donatogiuliano/Tankdaten_InfVis.git
cd Tankdaten_InfVis
```

### 2. Python Dependencies installieren

```bash
pip install -r requirements.txt
```

### 3. Backend starten

```bash
cd backend
python app.py
```

### 4. Im Browser öffnen

```
http://localhost:5000
```

---

## 📁 Projektstruktur

```
tankdaten_infvis/
├── backend/
│   ├── app.py              # Flask API Server
│   ├── data/               # CSV Datensätze
│   │   ├── 2020.csv        # Corona-Jahr Daten
│   │   ├── 2022.csv        # Ukraine-Krise Daten
│   │   └── macro_data.csv  # Rohölpreise (Brent)
│   └── scripts/            # Datenverarbeitungs-Skripte
│       ├── ingest_data.py
│       ├── enrich_with_macro.py
│       └── fetch_real_macro.py
│
├── frontend/
│   ├── index.html          # Haupt-HTML
│   ├── index.css           # Globale Styles
│   ├── js/
│   │   ├── main.js         # App Entry Point
│   │   └── pages/          # Seiten-Module
│   │       ├── OverviewPage.js
│   │       ├── TrendsPage.js
│   │       ├── CrisisPage.js    # Corona-Analyse
│   │       ├── UkrainePage.js   # Ukraine Bubble-Chart
│   │       └── RegionalPage.js
│   └── img/                # Assets
│
├── Dockerfile              # Container Build
├── requirements.txt        # Python Dependencies
└── README.md
```

---

## 🔌 API Endpoints

| Endpoint                 | Beschreibung                     |
| ------------------------ | -------------------------------- |
| `GET /api/data/corona`   | Preisdaten 2020 mit Rohölpreisen |
| `GET /api/data/ukraine`  | Preisdaten 2022 mit Rohölpreisen |
| `GET /api/data/trends`   | Historische Trenddaten           |
| `GET /api/data/overview` | Aktuelle Übersichtsdaten         |

---

## 🛠️ Technologie-Stack

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

## 📈 Datenquellen

- **Tankstellenpreise**: Tankerkönig API / MTS-K Datensatz
- **Rohölpreise (Brent)**: Yahoo Finance / ECB

---

## 🎯 Roadmap

- [x] Corona-Krisenanalyse 2020
- [x] Ukraine-Schock Bubble-Chart 2022
- [x] Responsive Chart-Sizing (ResizeObserver)
- [x] Light-Theme Redesign
- [ ] Jahresvergleich Feature
- [ ] Export als PDF/PNG
- [ ] Dunkel-Modus Toggle

---

## 👥 Team

**Hochschule für Technik Stuttgart**  
Wintersemester 2025/26  
Modul: Datenanalyse & Visualisierung

---

## 📄 Lizenz

Dieses Projekt ist für akademische Zwecke erstellt.

---

## 🙏 Danksagung

- D3.js Community für exzellente Dokumentation
- Tankerkönig für offene Preisdaten
- Leaflet für Kartenbibliothek
