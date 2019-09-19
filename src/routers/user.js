const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const router = new express.Router()
const User = require('../models/user')
const auth = require('../middleware/auth')
const { sendWelcomeEmail, sendCacelationEmail } = require('../emails/account')

const prefix = '/users'
const upload = multer({
  limits: {
    fileSize: 1000000
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Please upload an image.'))
    }
    cb(undefined, true)
  }
})

router.post(`${prefix}`, async (req, res) => {
  try {
    const user = new User(req.body)
    await user.save()
    sendWelcomeEmail(user.email, user.name)
    const token = await user.generateAuthToken()
    res.send({user, token})
  } catch (e) {
    res.status(400).send(e)
  }
})

router.post(`${prefix}/login`, async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findByCredentials(email, password)
    const token = await user.generateAuthToken()
    res.send({user, token})
  } catch (e) {
    res.status(400).send(e)
  }
})

router.post(`${prefix}/logout`, auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(token => token.token !== req.token)
    await req.user.save()
    res.send()
  } catch (e) {
    res.status(500).send()
  }
})

router.post(`${prefix}/logoutAll`, auth, async (req, res) => {
  try {
    req.user.tokens = []
    await req.user.save()
    res.send()
  } catch (e) {
    res.status(500).send()
  }
})

router.get(`${prefix}/me`, auth, async (req, res) => {
  res.send(req.user)
  // try {
  //   const users = await User.find({})
  //   res.send(users)
  // } catch (e) {
  //   res.status(500).send(e)
  // }
})

router.post(`${prefix}/me/avatar`,
  auth,
  upload.single('avatar'),
  async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
  },
  (error, req, res, next) => {
    res.status(400).send({error: error.message})
  })

router.get(`${prefix}/:id`, (req, res) => {
  const _id = req.params.id
  User.findById(_id).then((user) => {
    if (!user) {
      return res.status(404).send('User not found')
    }
    res.send(user)
  }).catch((e) => {
    res.status(500).send(e)
  })
})

router.get(`${prefix}/:id/avatar`, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user || !user.avatar) {
      throw new Error()
    }
    res.set('Content-Type', 'image/png')
    res.send(user.avatar)
  } catch (e) {
    res.status(400).send()
  }
})

router.patch(`${prefix}/me`, auth, async (req, res) => {

  const updates = Object.keys(req.body)
  const allowUpdates = ['name', 'email', 'password', 'age']
  const isValidOperation = updates.every((update) => allowUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ 'error': 'Invalid updates' })
  }

  try {
    updates.forEach((update) => req.user[update] = req.body[update])
    await req.user.save()
    // const user = await User.findByIdAndUpdate(_id, req.body, {
    //   new: true,
    //   runValidators: true
    // })

    res.send(req.user)
  } catch (e) {
    res.status(500).send(e)
  }
})

router.delete(`${prefix}/me`, auth, async (req, res) => {
  try {
    // const _id = req.params.id
    // const user = await User.findByIdAndDelete(_id)
    // if (!user) {
    //   return res.status(404).send('User not found!')
    // }
    // return res.send(user)
    await req.user.remove()
    sendCacelationEmail(req.user.email, req.user.name)
    res.send(req.user)
  } catch (e) {
    res.status(500).send(e)
  }
})

router.delete(`${prefix}/me/avatar`, auth, async (req, res) => {
  req.user.avatar = undefined;
  await req.user.save()
  res.send(req.user)
})

module.exports = router
