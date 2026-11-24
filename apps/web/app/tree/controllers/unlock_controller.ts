import type { HttpContext } from '@adonisjs/core/http'
import { safeEqual } from '@adonisjs/core/helpers'

import env from '#start/env'
import { UNLOCKED_SESSION_KEY } from '#tree/middleware/unlocked_middleware'
import { unlockValidator } from '#tree/validators/people'

export default class UnlockController {
  public async show({ inertia }: HttpContext) {
    return inertia.render('tree/unlock', {})
  }

  public async store({ request, response, session }: HttpContext) {
    const { password } = await request.validateUsing(unlockValidator)

    if (!safeEqual(password, env.get('APP_PASSWORD').release())) {
      session.flash('error', 'Mot de passe incorrect')
      return response.redirect().back()
    }

    session.regenerate()
    session.put(UNLOCKED_SESSION_KEY, true)
    return response.redirect().toRoute('board.show')
  }

  public async destroy({ response, session }: HttpContext) {
    session.forget(UNLOCKED_SESSION_KEY)
    return response.redirect().toRoute('unlock.show')
  }
}
