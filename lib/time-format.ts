const EASTERN_TIME_ZONE = "America/New_York"
const easternPartsFormatter = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
const twoDigits = (value: number) => String(value).padStart(2, "0")

export function easternDateKey(date: Date) {
  const parts = Object.fromEntries(easternPartsFormatter.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function easternTime(date: Date) {
  const parts = Object.fromEntries(easternPartsFormatter.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.hour}:${parts.minute}`
}

export function easternTimestamp(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  const target = Date.UTC(year, month - 1, day, hours, minutes)
  let timestamp = target
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(easternPartsFormatter.formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]))
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    timestamp += target - represented
  }
  const result = new Date(timestamp)
  if (easternDateKey(result) !== dateKey || easternTime(result) !== time) return null
  return Math.floor(timestamp / 1000)
}

export function formatEasternTime(value: Date | string | number, options: Intl.DateTimeFormatOptions = {}) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  }).format(date)
}

export function formatEasternDateTime(value: Date | string | number, options: Intl.DateTimeFormatOptions = {}) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  }).format(date)
}
