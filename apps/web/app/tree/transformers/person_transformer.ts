import { BaseTransformer } from '@adonisjs/core/transformers'

import type Person from '#tree/models/person'

export default class PersonTransformer extends BaseTransformer<Person> {
  toObject() {
    return {
      id: this.resource.uuid,
      firstName: this.resource.firstName,
      lastName: this.resource.lastName,
      status: this.resource.status,
      metAt: this.resource.metAt?.toISODate() ?? null,
      endedAt: this.resource.endedAt?.toISODate() ?? null,
      notes: this.resource.notes,
      parentId: this.resource.parentUuid,
      x: this.resource.x,
      y: this.resource.y,
    }
  }

  forBoard() {
    return this.toObject()
  }
}
