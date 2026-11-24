import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import Person from '#tree/models/person'
import PersonService from '#tree/services/person_service'
import {
  createPersonValidator,
  movePersonValidator,
  updatePersonValidator,
} from '#tree/validators/people'

@inject()
export default class PeopleController {
  constructor(protected personService: PersonService) {}

  public async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createPersonValidator)
    await this.personService.create(payload)

    return response.redirect().back()
  }

  public async update({ params, request, response }: HttpContext) {
    const target = await Person.findOrFail(params.id)
    const payload = await request.validateUsing(updatePersonValidator)
    await this.personService.update({ target, ...payload })

    return response.redirect().back()
  }

  public async move({ params, request, response }: HttpContext) {
    const target = await Person.findOrFail(params.id)
    const { x, y } = await request.validateUsing(movePersonValidator)
    await this.personService.move({ target, x, y })

    return response.redirect().back()
  }

  public async destroy({ params, response }: HttpContext) {
    const target = await Person.findOrFail(params.id)
    await this.personService.delete(target)

    return response.redirect().back()
  }
}
