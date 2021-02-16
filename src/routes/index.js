import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import Boom from 'boom'
import Db from '../lib/connection/db'
import sellOrder from '../lib/models/sellOrder'
import moment from 'moment-timezone'
import Melonn from '../lib/melonn'
import Utils from '../lib/utils'

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

    body.creationDate = moment().format('YYYY-MM-DD, h:mm:ss a')
    body.internalOrderNumber = `MSE${moment().unix()}${Math.floor(Math.random() * 100)}`

    const shippingInfo = await Melonn.getShippingMethodById(body.shippingMethod.id)
    const offDays = await Melonn.getOffDays()
    const minWeight = shippingInfo.rules.availability.byWeight.min
    const maxWeight = shippingInfo.rules.availability.byWeight.max
    let weightOrder = body.lineItems.reduce(((sum, item) => sum + parseInt(item.productWeight)), 0)

    let isBusinessDay = offDays.filter(item => item === moment().format('YYYY-MM-DD'))
    let nextBusinessDays = await Utils.getNextBusinessDays(10, offDays)

    if (weightOrder >= minWeight && weightOrder <= maxWeight) {
      // console.log(weightOrder)
      // console.log('array dias')
      // console.log(nextBusinessDays)
      // console.log(isBusinessDay)
      // console.log(offDays)
      // console.log(shippingInfo)

      const dayType = shippingInfo.rules.availability.byRequestTime.dayType
      const fromTimeOfDay = shippingInfo.rules.availability.byRequestTime.fromTimeOfDay
      const toTimeOfDay = shippingInfo.rules.availability.byRequestTime.toTimeOfDay

      if (dayType === 'ANY' || (dayType === 'BUSINESS' && isBusinessDay.length <= 0)) {
        let hourNowDatetime = moment().format('HH')
        if (hourNowDatetime >= fromTimeOfDay && hourNowDatetime <= toTimeOfDay) {
          console.log('yes HORA')
          const casesPromise = shippingInfo.rules.promisesParameters.cases
          let priority = 1
          let controller = true
          let workingCase = {}
          while (controller) {
            let caseData = casesPromise.filter(item => item.priority === priority)
   
            if(caseData.length > 0) {
              const caseDayType = caseData[0].condition.byRequestTime.dayType
              const caseFromTimeOfDay = caseData[0].condition.byRequestTime.fromTimeOfDay
              const caseToTimeOfDay = caseData[0].condition.byRequestTime.toTimeOfDay
   
              if (caseDayType === 'ANY' || (caseDayType === 'BUSINESS' && isBusinessDay.length <= 0)) {

                if (hourNowDatetime >= caseFromTimeOfDay && hourNowDatetime <= caseToTimeOfDay) {
                  controller = false
                  workingCase = caseData[0]
                } else {
                  priority++
                }

              } else {
                priority++
              }

            } else {
              body['calculateShippings'] = Utils.setShippingNull()
              controller = false
            }
          }

          console.log(workingCase)
        } else {
          body['calculateShippings'] = Utils.setShippingNull()
        }
      } else {
        body['calculateShippings'] = Utils.setShippingNull()
      }
    } else {
      body['calculateShippings'] = Utils.setShippingNull()
    }
   
    console.log(body)

    // const newOrder = new sellOrder(body)
    // let order = await newOrder.save()
    
    response = {
      data: '{ order }',
      statusCode: 201
    }
  } catch (e) {
    console.log(e)
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
