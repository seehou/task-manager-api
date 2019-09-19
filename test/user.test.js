const request = require('supertest')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const app = require('../src/app')
const User = require('../src/models/user')

const prefix = '/users'

const userOneId = new mongoose.Types.ObjectId()
const userOne = {
  _id: userOneId,
  name: 'Jasper',
  email: 'jasper@example.com',
  password: 'ABC1234',
  tokens: [{
    token: jwt.sign({_id: userOneId}, process.env.JWT_SECRET)
  }]
}

beforeEach(async () => {
  await User.deleteMany()
  await new User(userOne).save()
})

test('Should signup a new user', async () => {
  const response = await request(app).post(`${prefix}`).send({
    name: 'Steven',
    email: 'steven@example.com',
    password: 'ABC1234'

  }).expect(200)

  // Assert that the database is changed correctly
  const user = await User.findById(response.body.user._id)
  expect(user).not.toBeNull()

  // Assert that the response name is returned correctly
  expect(response.body.user.name).toBe('Steven')

  expect(response.body).toMatchObject({
    user: {
      name: 'Steven',
      email: 'steven@example.com'
    }
  })

  expect(user.password).not.toBe('ABC1234')

})

test('Should login existing user', async() => {
  const response = await request(app).post(`${prefix}/login`).send({
    email: userOne.email,
    password: userOne.password
  }).expect(200)

  const user = await User.findById(response.body.user._id)
  expect(user).toMatchObject({
    email: userOne.email,
  })
  expect(response.body.token).toBe(user.tokens[1].token)

})

test('Should not login nonexistent user', async () => {
  await request(app).post(`${prefix}/login`).send({
    email: 'someone@example.com',
    password: 'ABC1234'
  }).expect(400)
})

test('Should get profile for user', async () => {
  await request(app)
    .get(`${prefix}/me`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200)
})

test('Should not get profile for unauthenticated user', async () => {
  await request(app)
    .get(`${prefix}/me`)
    .send()
    .expect(401)

  await request(app)
    .get(`${prefix}/me`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}123`)
    .send()
    .expect(401)
})

test('Should delete account for user', async () => {
  await request(app)
    .delete(`${prefix}/me`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200)

  const user = await User.findById(userOneId)
  expect(user).toBeNull()

})

test('Should not delete account for unauthenticated user', async () => {
  await request(app)
    .delete(`${prefix}/me`)
    .send()
    .expect(401)

    await request(app)
    .delete(`${prefix}/me`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}123`)
    .send()
    .expect(401)
})

test('Should upload avatar image', async () => {
  await request(app)
    .post(`${prefix}/me/avatar`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .attach('avatar', 'test/fixtures/profile-pic.jpg')
    .expect(200)

  const user = await User.findById(userOneId)
  expect(user.avatar).toEqual(expect.any(Buffer))
})

test('Should update valid user fields', async () => {
  await request(app)
    .patch(`${prefix}/me`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({name: 'Casper'})
    .expect(200)

  const user =  await User.findById(userOneId)
  expect(user.name).toBe('Casper')
})

test('Should not update invalid user fields', async () => {
  await request(app)
    .patch(`${prefix}/me`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({ location: 'Montreal' })
    .expect(400)
})


