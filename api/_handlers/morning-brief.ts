/**
 * morning-brief.ts — Generate the AI morning brief for the athlete.
 *
 * Called by api/coach.ts on GET /api/coach/brief.
 * Returns a MorningBrief object with today's session, pep talk, and weather.
 */
import type { Firestore } from 'firebase-admin/firestore'
import { callClaude } from '../_lib/claude.js'
import type { AthleteProfile, MorningBrief, WeatherContext, SessionType } from '../../src/types/index.js'

interface WeatherSnapshot {
  available: boolean
  temperatureC?: number
  windSpeedMs?: number
  humidity?: number
  condition?: string
  location?: string
}

function formatPace(paceSecPerKm: number): string {
  const m = Math.floor(paceSecPerKm / 60)
  const s = paceSecPerKm % 60
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function sessionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    easy: 'Easy Run',
    threshold: 'Threshold Run',
    vo2max: 'VO2max Intervals',
    long_run: 'Long Run',
    recovery: 'Recovery Run',
    cross_training: 'Cross Training',
    race: 'Race',
  }
  return map[type] ?? type
}

export async function generateMorningBrief(
  db: Firestore,
  uid: string,
  profile: AthleteProfile,
  weather: WeatherSnapshot,
): Promise<MorningBrief> {
  const today = new Date().toISOString().slice(0, 10)

  // Find today's session
  const sessionsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('sessions')
    .where('scheduledDate', '==', today)
    .where('status', '==', 'planned')
    .limit(1)
    .get()

  const todaySessionDoc = sessionsSnap.empty ? null : sessionsSnap.docs[0]
  const todaySessionData = todaySessionDoc
    ? (todaySessionDoc.data() as {
        type: SessionType
        title: string
        plannedDistanceKm: number
        targetPaceMinPerKm: number
        targetHRZone: number
      })
    : null

  // Count completed sessions this week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  const weekSessionsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('sessions')
    .where('scheduledDate', '>=', weekStartStr)
    .where('scheduledDate', '<=', today)
    .where('status', '==', 'completed')
    .get()

  const completedThisWeek = weekSessionsSnap.size

  // Build brief context for Claude
  const weatherSummary = weather.available
    ? `Weather: ${weather.condition}, ${weather.temperatureC}°C, wind ${(weather.windSpeedMs ?? 0) * 3.6} km/h, humidity ${weather.humidity}%`
    : 'Weather data unavailable'

  const sessionSummary = todaySessionData
    ? `Today's session: ${sessionTypeLabel(todaySessionData.type)} — ${todaySessionData.plannedDistanceKm}km at ${formatPace(todaySessionData.targetPaceMinPerKm)} pace (zone ${todaySessionData.targetHRZone})`
    : 'No session scheduled for today (rest day)'

  const systemPrompt = `You are Kadera, a warm and expert AI running coach. Write a brief, motivating morning message for an athlete. Keep it to 2-3 sentences. Be specific to the day's session and weather. Be encouraging but not over the top.`

  const userContent = `Athlete: ${profile.name}
Target race: ${profile.targetRace} on ${profile.targetDate}
Current VDOT: ${profile.vdot}
${weatherSummary}
${sessionSummary}
Sessions completed this week: ${completedThisWeek}

Write the morning pep talk:`

  const { text: content } = await callClaude({
    systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    maxTokens: 256,
    functionName: 'morning-brief',
  })

  const weatherContext: WeatherContext | null = weather.available
    ? {
        condition: weather.condition!,
        tempC: weather.temperatureC!,
        feelsLikeC: weather.temperatureC!, // Open-Meteo free tier doesn't provide feels-like
        windKmh: Math.round((weather.windSpeedMs ?? 0) * 3.6 * 10) / 10,
        humidity: weather.humidity!,
        location: weather.location!,
      }
    : null

  const brief: MorningBrief = {
    date: today,
    content: content.trim(),
    session: todaySessionDoc
      ? {
          sessionId: todaySessionDoc.id,
          type: todaySessionData!.type,
          title: todaySessionData!.title,
          targetPaceMinPerKm: todaySessionData!.targetPaceMinPerKm,
          targetHRZone: todaySessionData!.targetHRZone,
          plannedDistanceKm: todaySessionData!.plannedDistanceKm,
        }
      : null,
    weatherContext,
    cached: false,
  }

  // Cache brief for today
  await db.collection('users').doc(uid).collection('briefs').doc(today).set({ ...brief, cached: true })

  return brief
}
