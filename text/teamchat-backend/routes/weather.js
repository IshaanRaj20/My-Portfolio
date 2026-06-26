const express = require('express');
const axios   = require('axios');
const router  = express.Router();

/* ── GET /weather?city=NewYork ── */
router.get('/', async (req, res) => {
  const { city, lat, lon } = req.query;
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENWEATHER_API_KEY not set' });

  try {
    let params = { appid: key, units: 'imperial' };
    if (lat && lon) {
      params.lat = lat; params.lon = lon;
    } else if (city) {
      params.q = city;
    } else {
      return res.status(400).json({ error: 'Provide city or lat/lon' });
    }

    const [currentRes, forecastRes] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', { params }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', { params: { ...params, cnt: 5 } }),
    ]);

    const c = currentRes.data;
    const weather = {
      city:        c.name,
      country:     c.sys.country,
      temp:        Math.round(c.main.temp),
      feels_like:  Math.round(c.main.feels_like),
      humidity:    c.main.humidity,
      description: c.weather[0].description,
      icon:        `https://openweathermap.org/img/wn/${c.weather[0].icon}@2x.png`,
      wind:        Math.round(c.wind.speed),
      forecast:    forecastRes.data.list.map(f => ({
        time:  f.dt_txt,
        temp:  Math.round(f.main.temp),
        desc:  f.weather[0].description,
        icon:  `https://openweathermap.org/img/wn/${f.weather[0].icon}.png`,
      })),
    };

    res.json(weather);
  } catch (err) {
    console.error('Weather error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not fetch weather. Check city name or API key.' });
  }
});

module.exports = router;