import type { RelationStatus } from '#tree/enums/relation_status'
import type Person from '#tree/models/person'

export interface PersonPayload {
  firstName: string
  lastName?: string | null
  status: RelationStatus
  metAt?: Date | null
  endedAt?: Date | null
  notes?: string | null
  parentUuid?: string | null
}

export interface CreatePersonInput extends PersonPayload {
  x: number
  y: number
}

export interface UpdatePersonInput extends PersonPayload {
  target: Person
}

export interface MovePersonInput {
  target: Person
  x: number
  y: number
}
