import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

import Person from '#tree/models/person'

test.group('Board access', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('redirects to the password page while locked', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/unlock')
  })

  test('rejects a wrong password', async ({ client }) => {
    const response = await client.post('/unlock').form({ password: '0000' }).withCsrfToken().redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Mot de passe incorrect')
  })

  test('unlocks with the right password', async ({ client }) => {
    const response = await client.post('/unlock').form({ password: '1234' }).withCsrfToken().redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertSession('unlocked', true)
  })
})

test.group('People', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('adds a person with only a first name', async ({ client, assert }) => {
    const response = await client
      .post('/people')
      .withSession({ unlocked: true })
      .withCsrfToken()
      .json({ firstName: 'Léa', status: 'friend', x: 120, y: -40 })
      .redirects(0)

    response.assertStatus(302)
    const person = await Person.findByOrFail('first_name', 'Léa')
    assert.isNull(person.lastName)
    assert.equal(person.status, 'friend')
  })

  test('refuses an end date before the start date', async ({ client, assert }) => {
    const response = await client
      .post('/people')
      .withSession({ unlocked: true })
      .withCsrfToken()
      .header('referer', '/')
      .json({ firstName: 'Max', status: 'lover', metAt: '2024-05-01', endedAt: '2023-01-01', x: 0, y: 0 })
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await Person.findBy('first_name', 'Max'))
    response.assertFlashMessage('inputErrorsBag', {
      endedAt: ['The endedAt field must be a date after or same as metAt'],
    })
  })

  test('cannot be met through someone they introduced', async ({ client, assert }) => {
    const a = await Person.create({ firstName: 'A', status: 'friend', x: 0, y: 0 })
    const b = await Person.create({ firstName: 'B', status: 'friend', parentUuid: a.uuid, x: 0, y: 0 })

    await client
      .put(`/people/${a.uuid}`)
      .withSession({ unlocked: true })
      .withCsrfToken()
      .json({ firstName: 'A', status: 'friend', parentUuid: b.uuid })
      .redirects(0)

    await a.refresh()
    assert.isNull(a.parentUuid)
  })
})
