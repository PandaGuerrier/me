import { column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'

import BaseModel from '#common/models/base_model'
import type { RelationStatus } from '#tree/enums/relation_status'

export default class Person extends BaseModel {
  static table = 'people'

  @column()
  declare firstName: string

  @column()
  declare lastName: string | null

  @column()
  declare status: RelationStatus

  @column.date()
  declare metAt: DateTime | null

  @column.date()
  declare endedAt: DateTime | null

  @column()
  declare notes: string | null

  @column()
  declare parentUuid: string | null

  @column()
  declare x: number

  @column()
  declare y: number
}
