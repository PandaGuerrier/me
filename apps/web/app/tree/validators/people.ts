import vine from '@vinejs/vine'

import { RELATION_STATUSES } from '#tree/enums/relation_status'

const personFields = {
  firstName: vine.string().trim().minLength(1).maxLength(120),
  lastName: vine.string().trim().maxLength(120).optional().nullable(),
  status: vine.enum(RELATION_STATUSES),
  metAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional().nullable(),
  endedAt: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .afterOrSameAs('metAt')
    .optional()
    .nullable(),
  notes: vine.string().trim().maxLength(5000).optional().nullable(),
  parentUuid: vine.string().uuid().exists({ table: 'people', column: 'uuid' }).optional().nullable(),
}

const coordinate = () => vine.number().min(-1_000_000).max(1_000_000)

export const createPersonValidator = vine.create({
  ...personFields,
  x: coordinate(),
  y: coordinate(),
})

export const updatePersonValidator = vine.create(personFields)

export const movePersonValidator = vine.create({
  x: coordinate(),
  y: coordinate(),
})

export const unlockValidator = vine.create({
  password: vine.string().maxLength(200),
})
