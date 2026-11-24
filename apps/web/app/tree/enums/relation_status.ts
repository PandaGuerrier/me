export const RELATION_STATUSES = ['disliked', 'acquaintance', 'friend', 'crush', 'lover'] as const

export type RelationStatus = (typeof RELATION_STATUSES)[number]
