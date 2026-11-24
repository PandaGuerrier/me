import type { RelationStatus } from '#tree/enums/relation_status'

export const STATUS_META: Record<RelationStatus, { label: string; color: string }> = {
  disliked: { label: "Je n'aime pas", color: '#f87171' },
  acquaintance: { label: 'Connaissance', color: '#a3a3a3' },
  friend: { label: 'Ami·e', color: '#60a5fa' },
  crush: { label: 'Crush', color: '#fbbf24' },
  lover: { label: 'Amoureuse', color: '#f472b6' },
}

export const STATUS_ORDER: RelationStatus[] = [
  'lover',
  'crush',
  'friend',
  'acquaintance',
  'disliked',
]

const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' })

export function formatPeriod(metAt: string | null, endedAt: string | null) {
  const fmt = (iso: string) => monthYear.format(new Date(`${iso}T00:00:00`))
  if (!metAt && !endedAt) return null
  if (metAt && endedAt) return `${fmt(metAt)} → ${fmt(endedAt)}`
  if (metAt) return `depuis ${fmt(metAt)}`
  return `fin ${fmt(endedAt!)}`
}
