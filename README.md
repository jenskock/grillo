# Grillo

Interaktiver Gartengrundriss für Pestalozzistraße 28, Münster.

## Start

```bash
npm install
npm run dev
```

Vite öffnet die App mit Hot Reload unter [http://localhost:5173](http://localhost:5173).

## Ansicht

Aktuell nur **3D** (Three.js, Orbit). 2D-Grundriss-Code liegt noch in `src/garden.js` für später (Maße/Plan).

Die Szene ist in `src/scene/` aufgeteilt: `layout.js` (alle Maße), `site.js` (Haus, Garage, Pflaster, Zaun), `vegetation.js` (Rasen, Hecke, Baum, Bambus, Gräser, Stauden), `pergola.js` (Lamellendach), `furniture.js` (Küche, Essplatz, Lounge, Schirm). Texturen sind CC0 von Poly Haven (siehe `public/CREDITS.md`).

## Weitere Befehle

```bash
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

