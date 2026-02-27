import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Amadeus from 'amadeus';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay();
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Filtra por horário de partida
function filterByTime(results, depTimeFrom, depTimeTo, retTimeFrom, retTimeTo) {
  return results.filter(flight => {
    if (depTimeFrom && depTimeTo) {
      const seg = flight.itineraries[0]?.segments[0];
      if (seg) {
        const time = seg.departure.at.substring(11, 16);
        if (time < depTimeFrom || time > depTimeTo) return false;
      }
    }
    if (retTimeFrom && retTimeTo && flight.itineraries[1]) {
      const seg = flight.itineraries[1]?.segments[0];
      if (seg) {
        const time = seg.departure.at.substring(11, 16);
        if (time < retTimeFrom || time > retTimeTo) return false;
      }
    }
    return true;
  });
}

// Filtra por número máximo de paradas
function filterByStops(results, maxStops) {
  if (maxStops === undefined || maxStops === null || maxStops >= 99) return results;
  return results.filter(flight => {
    return flight.itineraries.every(it => {
      const stops = it.segments.length - 1; // segmentos - 1 = paradas
      return stops <= maxStops;
    });
  });
}

async function searchFlight(origin, destination, departureDate, returnDate, adults = 1, travelClass = 'ECONOMY') {
  try {
    const params = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults,
      travelClass,
      max: 15,
      currencyCode: 'BRL',
    };
    if (returnDate) params.returnDate = returnDate;

    const response = await amadeus.shopping.flightOffersSearch.get(params);
    return response.data.map(offer => ({
      id: offer.id,
      price: parseFloat(offer.price.grandTotal),
      currency: offer.price.currency,
      departureDate,
      returnDate: returnDate || null,
      itineraries: offer.itineraries.map(it => ({
        duration: it.duration,
        segments: it.segments.map(s => ({
          departure: { iataCode: s.departure.iataCode, at: s.departure.at },
          arrival: { iataCode: s.arrival.iataCode, at: s.arrival.at },
          carrierCode: s.carrierCode,
          flightNumber: s.number,
          aircraft: s.aircraft?.code,
          duration: s.duration,
          stops: s.numberOfStops,
        })),
      })),
      seats: offer.numberOfBookableSeats,
      lastTicketingDate: offer.lastTicketingDate,
    }));
  } catch (e) {
    return [];
  }
}

// ─── Rotas ───────────────────────────────────────────────────────────────────

// Busca por data específica
app.post('/api/search/specific', async (req, res) => {
  const {
    origin, destination, departureDate, returnDate,
    adults, travelClass, maxStops,
    depTimeFrom, depTimeTo, retTimeFrom, retTimeTo,
  } = req.body;
  try {
    let results = await searchFlight(origin, destination, departureDate, returnDate, adults, travelClass);
    results = filterByStops(results, maxStops);
    results = filterByTime(results, depTimeFrom, depTimeTo, retTimeFrom, retTimeTo);
    res.json({ results: results.slice(0, 10) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Busca por dia da semana
app.post('/api/search/weekday', async (req, res) => {
  const {
    origin, destination, departureDayOfWeek, returnDayOfWeek,
    startDate, endDate, adults, travelClass, maxStops,
    depTimeFrom, depTimeTo, retTimeFrom, retTimeTo,
  } = req.body;
  try {
    const allDates = getDateRange(startDate, endDate);
    const departureDates = allDates.filter(d => getDayOfWeek(d) === parseInt(departureDayOfWeek));
    const limitedDates = departureDates.slice(0, 8);
    const results = [];

    for (const depDate of limitedDates) {
      let retDate = null;
      if (returnDayOfWeek !== undefined && returnDayOfWeek !== null) {
        for (let i = 1; i <= 14; i++) {
          const candidate = addDays(depDate, i);
          if (getDayOfWeek(candidate) === parseInt(returnDayOfWeek)) {
            retDate = candidate;
            break;
          }
        }
      }

      let flights = await searchFlight(origin, destination, depDate, retDate, adults, travelClass);
      flights = filterByStops(flights, maxStops);
      flights = filterByTime(flights, depTimeFrom, depTimeTo, retTimeFrom, retTimeTo);
      if (flights.length > 0) results.push(flights[0]);
      await new Promise(r => setTimeout(r, 300));
    }

    results.sort((a, b) => a.price - b.price);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Busca por duração
app.post('/api/search/flexible', async (req, res) => {
  const {
    origin, destination, tripDurationDays,
    startDate, endDate, adults, travelClass, maxStops,
    depTimeFrom, depTimeTo, retTimeFrom, retTimeTo,
  } = req.body;
  try {
    const allDates = getDateRange(startDate, endDate);
    const sampledDates = allDates.filter((_, i) => i % 3 === 0);
    const limitedDates = sampledDates.slice(0, 10);
    const results = [];

    for (const depDate of limitedDates) {
      const retDate = addDays(depDate, parseInt(tripDurationDays));
      if (retDate > endDate) break;

      let flights = await searchFlight(origin, destination, depDate, retDate, adults, travelClass);
      flights = filterByStops(flights, maxStops);
      flights = filterByTime(flights, depTimeFrom, depTimeTo, retTimeFrom, retTimeTo);
      if (flights.length > 0) results.push(flights[0]);
      await new Promise(r => setTimeout(r, 300));
    }

    results.sort((a, b) => a.price - b.price);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Busca de aeroportos
app.get('/api/airports', async (req, res) => {
  const { keyword } = req.query;
  try {
    let results = [];
    try {
      const brResponse = await amadeus.referenceData.locations.get({
        keyword,
        subType: 'AIRPORT,CITY',
        countryCode: 'BR',
        'page[limit]': 8,
      });
      results = brResponse.data || [];
    } catch (e) {}

    if (results.length === 0) {
      const globalResponse = await amadeus.referenceData.locations.get({
        keyword,
        subType: 'AIRPORT,CITY',
        'page[limit]': 8,
      });
      results = globalResponse.data || [];
    }

    const airports = results.map(loc => ({
      iataCode: loc.iataCode,
      name: loc.name,
      cityName: loc.address?.cityName,
      countryName: loc.address?.countryName,
      countryCode: loc.address?.countryCode,
    }));

    res.json({ airports });
  } catch (e) {
    res.json({ airports: [] });
  }
});

// Monitoramento
app.post('/api/monitor/check', async (req, res) => {
  const { origin, destination, departureDate, returnDate, adults, travelClass } = req.body;
  try {
    const results = await searchFlight(origin, destination, departureDate, returnDate, adults, travelClass);
    const bestPrice = results.length > 0 ? results[0].price : null;
    res.json({ price: bestPrice, flight: results[0] || null, checkedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✈️  Server running on http://localhost:${PORT}`));
