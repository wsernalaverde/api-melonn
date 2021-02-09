import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import Boom from 'boom'
import Db from '../lib/connection/db'
import sellOrder from '../lib/models/sellOrder'
import moment from 'moment-timezone'
import Melonn from '../lib/melonn'

Db.connect()

const router = express.Router()

router.use(bodyParser.json())

router.use(cors({
  optionsSuccessStatus: 200
}))

router.get('/', (req, res) => res.status(200).json({ ok: 1, app: 'Users', date: moment().format('YYYY-MM-DD, h:mm:ss a') }))

router.post('/addSellOrder', async (req, res) => {
  let response = {}
  const body = req.body

  try {
    if (!body.store) {
      throw Boom.notFound('seller store not found or invalid')
    }

    if (!body.shippingMethod) {
      throw Boom.notFound('Shipping Method not found or invalid')
    }

    // if (await sellOrder.findOne({ body.store })) {
    //   throw Boom.conflict('Store already exists')
    // }

    body.creationDate = moment().format('YYYY-MM-DD, h:mm:ss a')

    body.internalOrderNumber = `MSE${moment().unix()}${Math.floor(Math.random() * 100)}`

    console.log(body)

    const newOrder = new sellOrder(body)
    let order = await newOrder.save()
    
    response = {
      data: { order },
      statusCode: 201
    }
  } catch (e) {
    response = e.output ? e.output.payload : { error: e, statusCode: 500 }
  }

  res.status(response.statusCode).json(response)
})

router.get('/getOrders', async (req, res) => {
  let response = {}

  try {
    let allOrders = await sellOrder.find()

    response = {
      data: allOrders,
      statusCode: 200
    }
  } catch (e) {
    response = e.output ? e.output.payload : { error: e, statusCode: 500 }
  }
  res.status(response.statusCode).json(response)
})

router.get('/getOrderDetails/:orderId', async (req, res) => {
  let response = {}
  const id = req.params.orderId

  console.log('oe')

  try {
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw Boom.notFound('ID not found or invalid')
    }

    const order = await sellOrder.find({ _id: id })
    
    if (!order) {
      throw Boom.notFound('Order not found')
    }

    response = {
      data: order,
      statusCode: 201
    }
  } catch (e) {
    console.log(e)
    response = e.output ? e.output.payload : { error: e, statusCode: 500 }
  }

  res.status(response.statusCode).json(response)
})

router.get('/getShippingMethods', async (req, res) => {
  let response = {}

  try {
    let shippingMethods = await Melonn.getShippingMethods()

    response = {
      data: shippingMethods,
      statusCode: 200
    }
  } catch (e) {
    response = e.output ? e.output.payload : { error: e, statusCode: 500 }
  }
  res.status(response.statusCode).json(response)
})

module.exports = router
