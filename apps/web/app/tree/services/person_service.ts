import { DateTime } from 'luxon'

import Person from '#tree/models/person'
import type {
  CreatePersonInput,
  MovePersonInput,
  UpdatePersonInput,
} from '#tree/types/person_service'

export default class PersonService {
  list() {
    return Person.query().orderBy('created_at', 'asc')
  }

  create(input: CreatePersonInput) {
    return Person.create({
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      status: input.status,
      metAt: toDate(input.metAt),
      endedAt: toDate(input.endedAt),
      notes: input.notes ?? null,
      parentUuid: input.parentUuid ?? null,
      x: input.x,
      y: input.y,
    })
  }

  async update({ target, ...input }: UpdatePersonInput) {
    // A person can't be met through themself or through someone they introduced.
    const parentUuid =
      input.parentUuid && !(await this.isDescendantOrSelf(input.parentUuid, target.uuid))
        ? input.parentUuid
        : null

    target.merge({
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      status: input.status,
      metAt: toDate(input.metAt),
      endedAt: toDate(input.endedAt),
      notes: input.notes ?? null,
      parentUuid,
    })
    return target.save()
  }

  move({ target, x, y }: MovePersonInput) {
    target.merge({ x, y })
    return target.save()
  }

  delete(target: Person) {
    return target.delete()
  }

  private async isDescendantOrSelf(candidateUuid: string, ancestorUuid: string) {
    let current: string | null = candidateUuid
    const seen = new Set<string>()

    while (current && !seen.has(current)) {
      if (current === ancestorUuid) return true
      seen.add(current)
      const row: Person | null = await Person.find(current)
      current = row?.parentUuid ?? null
    }

    return false
  }
}

function toDate(value: Date | null | undefined) {
  return value ? DateTime.fromJSDate(value) : null
}
