import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'people'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('uuid').primary()
      table.string('first_name', 120).notNullable()
      table.string('last_name', 120).nullable()
      table.string('status', 32).notNullable()
      table.date('met_at').nullable()
      table.date('ended_at').nullable()
      table.text('notes').nullable()
      // Who I met them through; null means directly linked to me.
      table.uuid('parent_uuid').nullable().references('uuid').inTable('people').onDelete('SET NULL')
      // Position on the board, in board units.
      table.double('x').notNullable().defaultTo(0)
      table.double('y').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
