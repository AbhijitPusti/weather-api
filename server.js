const express = require("express");
const axios = require("axios");
require("dotenv").config();

const Redis = require("ioredis");
const redis = new Redis();


const app = express();
const port = 3000;


app.get("/api/weather/:city", async (req, res) => {
    const city = req.params.city;
    const cacheKey = `weather:${city.toLowerCase()}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
        console.log("Cache hit for", city);
        return res.json(JSON.parse(cached));
    }

    console.log("Cache miss for", city);

    try {
        const response = await axios.get(
            `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}`,
            {
                params: {
                    key: process.env.WEATHER_API_KEY,
                    unitGroup: 'metric',
                    include: 'current',
                },
            }
        );

        await redis.set(cacheKey, JSON.stringify(response.data), 'EX', 43200);

        res.json(response.data);
    }
    catch (error) {
    if (error.response && error.response.status === 400) {
        return res.status(400).json({
            error: `Invalid location: "${city}". Please check the spelling and try again.`,
        });
    }

    console.error("Weather API error:", error.message);
    res.status(500).json({ error: "Failed to fetch weather data" });
}
});

app.listen(port, (req, res) => {
    console.log(`Weather API is running on port ${port}`);
});