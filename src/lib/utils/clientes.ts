export const DEFAULT_CLIENT_ICON = '🏢'

export const CLIENT_ICON_OPTIONS = [
  '🏢',
  '🏋️',
  '🎾',
  '⚽',
  '🏀',
  '🏊',
  '🧘',
  '💃',
  '🥊',
  '🏛️',
  '💼',
  '⭐',
]

export function normalizeClientIcon(icon?: string | null) {
  if (!icon) return DEFAULT_CLIENT_ICON
  const sanitized = icon.trim()
  return sanitized || DEFAULT_CLIENT_ICON
}

export function formatClientName(nombre: string, icono?: string | null) {
  return `${normalizeClientIcon(icono)} ${nombre}`
}
