import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export const UNLOCKED_SESSION_KEY = 'unlocked'

/**
 * Lets the request through only once the board password was entered.
 */
export default class UnlockedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.session.get(UNLOCKED_SESSION_KEY) !== true) {
      return ctx.response.redirect().toRoute('unlock.show')
    }

    return next()
  }
}
