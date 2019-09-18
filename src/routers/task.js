const express = require('express')
const router = new express.Router()
const Task = require('../models/task')
const auth = require('../middleware/auth')

const prefix = '/tasks'

// GET /tasks?completed=true
// GET /tasks?limit=10&skip=0
// GET /tasks?sortBy=createdAt:desc
router.get(`${prefix}`, auth, async (req, res) => {

  const match = {}
  const sort = {}
  const { completed, limit, skip, sortBy } = req.query;
  if (completed) {
    match.completed = completed === 'true'
  }
  if (sortBy) {
    const parts = sortBy.split(':');
    sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
  }

  try {
    // Find task by owner id
    // const task = await Task.find({owner: req.user._id})
    // res.send(task)

    // Find task by virtual ref owner object
    await req.user.populate({
      path: 'tasks',
      match,
      options: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        sort
      }
    }).execPopulate()
    res.send(req.user.tasks)
  } catch (e) {
    res.status(500).send()
  }

})

router.get(`${prefix}/:id`, auth, async (req, res) => {

  try {
    const _id = req.params.id
    const task = await Task.findOne({ _id, owner: req.user._id})
    if (!task) {
      res.status(404).send('Task not found')
    }
    res.send(task)
  } catch (e) {
    res.status(500).send()
  }

  // const _id = req.params.id
  // Task.findById(_id).then((task) => {
  //   if (!task) {
  //     res.status(404).send('Task not found')
  //   }
  //   res.send(task)
  // }).catch((e) => {
  //   res.status(500).send()
  // })
})


router.post(`${prefix}`, auth, async (req, res) => {
  // const task = new Task(req.body)
  // task.save().then(() => {
  //   res.status(201).send(task)
  // }).catch((e) => {
  //   res.status(400).send(e)
  // })
  try {
    // const task = new Task(req.body)
    const task = new Task({...req.body, owner:req.user._id})
    await task.save()
    res.status(201).send(task)
  } catch (e) {
    res.status(499).send(e)
  }
})

router.patch(`${prefix}/:id`, auth, async (req, res) => {

  const updates = Object.keys(req.body)
  const allowUpdates = ['completed', 'description']
  const isValidOperation = updates.every((update) => allowUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ 'error': 'Invalid updates' })
  }

  try {
    const _id = req.params.id
    const task = await Task.findOne({_id, owner: req.user._id})
    if (!task) {
      return res.status(404).send('Task not found!')
    }

    updates.forEach((update) => task[update] = req.body[update])
    await task.save()
    res.send(task)

  } catch (e) {
    res.status(500).send(e)
  }
})

router.delete(`${prefix}/:id`, auth, async (req, res) => {
  try {
    const _id = req.params.id
    const task = await Task.findOneAndDelete({_id, owner: req.user._id})
    if (!task) {
      return res.status(404).send('Task not found!')
    }
    return res.send(task)
  } catch (e) {
    res.status(500).send(e)
  }
})

module.exports = router
