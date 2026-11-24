import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { UNLOCKED_SESSION_KEY } from '#tree/middleware/unlocked_middleware'

/**
 * Skips the password page once the board is already unlocked.
 */
export default class LockedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.session.get(UNLOCKED_SESSION_KEY) === true) {
      return ctx.response.redirect().toRoute('board.show')
    }

    return next()
  }
}
