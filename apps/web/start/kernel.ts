/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.errorHandler(() => import('#core/exceptions/handler'))

server.use([
  () => import('#core/middleware/container_bindings_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('#core/middleware/inertia_middleware'),
])

router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('#core/middleware/detect_user_locale_middleware'),
])

export const middleware = router.named({
  unlocked: () => import('#tree/middleware/unlocked_middleware'),
  locked: () => import('#tree/middleware/locked_middleware'),
  switchLocale: () => import('#common/middleware/switch_locale_middleware'),
})
