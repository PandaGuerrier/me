import { BaseModel as AdonisBaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class BaseModel extends AdonisBaseModel {
  @column({ isPrimary: true })
  declare uuid: string

  /**
   * Timestamps.
   */
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeCreate()
  static async generateUuid(model: BaseModel) {
    model.uuid = crypto.randomUUID()
  }
}
