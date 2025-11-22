# TrekkingTime Pro

**TrekkingTime Pro** is an advanced, client-side web application designed for hikers, mountaineers, and trail runners. It analyzes GPX files to provide accurate route statistics, elevation visualizations, and time estimates based on multiple scientific algorithms.

## 🚀 Key Features

*   **Multi-Algorithm Estimation**: Calculates estimated moving time using 5 distinct methods:
    *   **Naismith's Rule**: The classic hiking rule.
    *   **Tobler's Hiking Function**: Scientific velocity calculation based on slope.
    *   **Munter Method**: Alpinism-focused calculation using "effort units".
    *   **Swiss Hiking Federation (DIN 33466)**: Standard method used in the Alps.
    *   **Petzoldt's Energy Mile**: Energy-expenditure based estimation.
*   **Smart Aggregation**: Automatically detects outliers in the algorithms and suggests a "Smart Estimate" (Mean vs. Median).
*   **Interactive Visualizations**:
    *   **Map**: 4 Layer styles (Topographic, Satellite, Standard, CyclOSM).
    *   **Elevation Profile**: Interactive chart with slope-based color gradients (Green=Flat, Red=Steep) and smoothing toggle.
*   **Weather Forecast**: Integrated Open-Meteo API to fetch detailed weather data (Temp, Wind, Rain, Cloud Cover, Pressure, UV) for the specific route location and date.
*   **Difficulty Scoring**: Auto-calculates a "Hiking Grade" (Easy to Extreme) based on distance and elevation gain.
*   **Customizable Profile**: Adjusts calculations based on your Fitness Level, Pace Style, and Pack Weight.

## 🛠️ Technology Stack

*   **Core**: React 19, TypeScript, Vite (implied structure).
*   **Styling**: Tailwind CSS.
*   **Maps**: Leaflet & React-Leaflet.
*   **Charts**: Recharts.
*   **Icons**: Lucide-React.
*   **API**: Open-Meteo (No API Key required).

## 📦 Deployment

This project is built to be deployed statically (e.g., GitHub Pages).
1.  Upload the `index.html` and assets.
2.  The app runs entirely in the browser (no backend required).

## 📊 Algorithms Explained

1.  **Naismith**: `1h / 5km` + `1h / 600m ascent`.
2.  **Tobler**: `Velocity = 6 * e^(-3.5 * |slope + 0.05|)`.
3.  **Munter**: `Time = (Dist + Gain/100) / Speed`.
4.  **Swiss**: Balances horizontal vs vertical time logic.
5.  **Petzoldt**: Converts elevation gain into equivalent horizontal distance.

---
*Created for the hiking community.*