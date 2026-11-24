import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import PersonService from '#tree/services/person_service'
import PersonTransformer from '#tree/transformers/person_transformer'

@inject()
export default class BoardController {
  constructor(protected personService: PersonService) {}

  public async show({ inertia }: HttpContext) {
    const people = await this.personService.list()

    return inertia.render('tree/board', {
      people: PersonTransformer.transform(people).useVariant('forBoard'),
    })
  }
}
