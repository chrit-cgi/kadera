/**
 * api/weather.ts — Fetch current weather for the athlete's location
 *
 * GET /api/weather
 *
 * Returns temperature, condition, wind speed and humidity using Open-Meteo
 * (no API key required). Location is read from the athlete's profile.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// WMO weather codes → plain English
function describeWmo(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 9) return 'Overcast'
  if (code <= 19) return 'Foggy'
  if (code <= 29) return 'Drizzle'
  if (code <= 39) return 'Rain'
  if (code <= 49) return 'Freezing rain'
  if (code <= 59) return 'Showers'
  if (code <= 69) return 'Snow'
  if (code <= 79) return 'Sleet'
  if (code <= 89) return 'Thunderstorm'
  return 'Unknown'
}

// Simple geocode lookup using Open-Meteo geocoding API (free, no key)
async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&format=json`
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) return null
  const data = (await res.json()) as { results?: Array<{ latitude: number; longitude: number }> }
  const first = data.results?.[0]
  if (!first) return null
  return { lat: first.latitude, lon: first.longitude }
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })

  let user: Awaited<ReturnType<typeof verifyAuth>>
  try {
    user = await verifyAuth(req)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    return send(res, err.statusCode ?? 401, { error: err.message ?? 'Unauthorized' })
  }

  try {
    const db = getDb()
    const profileSnap = await db
      .collection('users')
      .doc(user.uid)
      .collection('profile')
      .doc('current')
      .get()

    const profile = profileSnap.data() as { location?: string; timezone?: string } | undefined
    const location = profile?.location ?? 'Unknown'

    if (!location || location === 'Unknown') {
      return send(res, 200, {
        available: false,
        reason: 'No location on file',
      })
    }

    const coords = await geocode(location)
    if (!coords) {
      return send(res, 200, { available: false, reason: 'Could not geocode location' })
    }

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code` +
      `&wind_speed_unit=ms&temperature_unit=celsius&timezone=auto`

    const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(5000) })
    if (!weatherRes.ok) {
      return send(res, 200, { available: false, reason: 'Weather service unavailable' })
    }

    const weatherData = (await weatherRes.json()) as {
      current: {
        temperature_2m: number
        wind_speed_10m: number
        relative_humidity_2m: number
        weather_code: number
      }
    }

    const c = weatherData.current
    return send(res, 200, {
      available: true,
      temperatureC: Math.round(c.temperature_2m * 10) / 10,
      windSpeedMs: Math.round(c.wind_speed_10m * 10) / 10,
      humidity: c.relative_humidity_2m,
      condition: describeWmo(c.weather_code),
      location,
    })
  } catch (err) {
    const e = err as { message?: string }
    return send(res, 500, { error: e.message ?? 'Internal error' })
  }
}
