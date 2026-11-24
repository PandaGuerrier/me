import router from '@adonisjs/core/services/router'

import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'

const tree = controllers.tree

router
  .group(() => {
    router.get('/unlock', [tree.Unlock, 'show']).as('unlock.show')
    router.post('/unlock', [tree.Unlock, 'store']).as('unlock.store')
  })
  .use(middleware.locked())

router
  .group(() => {
    router.get('/', [tree.Board, 'show']).as('board.show')
    router.post('/lock', [tree.Unlock, 'destroy']).as('unlock.destroy')

    router
      .resource('/people', tree.People)
      .only(['store', 'update', 'destroy'])
      .where('id', router.matchers.uuid())
      .as('people')
    router
      .patch('/people/:id/position', [tree.People, 'move'])
      .where('id', router.matchers.uuid())
      .as('people.move')
  })
  .use(middleware.unlocked())
