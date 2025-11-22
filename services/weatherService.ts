
import { WeatherData } from "../types";

// WMO Weather interpretation codes (Simplified for UI)
const getWeatherDescription = (code: number): string => {
    if (code === 0) return "Clear Sky";
    if (code === 1) return "Mainly Clear";
    if (code === 2) return "Partly Cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Foggy";
    if (code >= 51 && code <= 55) return "Drizzle";
    if (code >= 56 && code <= 57) return "Freezing Drizzle";
    if (code === 61) return "Slight Rain";
    if (code === 63) return "Moderate Rain";
    if (code === 65) return "Heavy Rain";
    if (code >= 66 && code <= 67) return "Freezing Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain Showers";
    if (code >= 85 && code <= 86) return "Snow Showers";
    if (code >= 95) return "Thunderstorm";
    return "Unknown";
};

export const fetchWeatherForecast = async (lat: number, lon: number, dateStr: string): Promise<WeatherData> => {
    try {
        // Fetch Daily + Hourly data
        // Added: precipitation_probability_max
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,windspeed_10m_max,windgusts_10m_max,uv_index_max,sunrise,sunset&hourly=pressure_msl,cloud_cover,relative_humidity_2m&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();

        if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
            throw new Error("No weather data available for this date");
        }

        // Aggregate hourly data (taking mean)
        const pressures = data.hourly.pressure_msl as number[];
        const clouds = data.hourly.cloud_cover as number[];
        const humidities = data.hourly.relative_humidity_2m as number[];
        
        const avgPressure = pressures.length ? Math.round(pressures.reduce((a,b) => a+b, 0) / pressures.length) : 1013;
        const avgCloudCover = clouds.length ? Math.round(clouds.reduce((a,b) => a+b, 0) / clouds.length) : 0;
        const avgHumidity = humidities.length ? Math.round(humidities.reduce((a,b) => a+b, 0) / humidities.length) : 50;

        const weatherCode = data.daily.weathercode[0];

        // Return the first (and only) day requested
        return {
            date: dateStr,
            maxTemp: data.daily.temperature_2m_max[0],
            minTemp: data.daily.temperature_2m_min[0],
            feelsLikeMax: data.daily.apparent_temperature_max[0],
            precipitation: data.daily.precipitation_sum[0],
            precipitationProbability: data.daily.precipitation_probability_max[0],
            weatherDescription: getWeatherDescription(weatherCode),
            windSpeed: data.daily.windspeed_10m_max[0],
            windGusts: data.daily.windgusts_10m_max[0],
            weatherCode: weatherCode,
            uvIndex: data.daily.uv_index_max[0],
            sunrise: data.daily.sunrise[0],
            sunset: data.daily.sunset[0],
            pressure: avgPressure,
            cloudCover: avgCloudCover,
            humidity: avgHumidity
        };

    } catch (error) {
        console.error("Weather API Error:", error);
        throw error;
    }
};
