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
    body['calculateShippings'] = {}

    const shippingInfo = await Melonn.getShippingMethodById(body.shippingMethod.id)
    const offDays = await Melonn.getOffDays()
    const minWeight = shippingInfo.rules.availability.byWeight.min
    const maxWeight = shippingInfo.rules.availability.byWeight.max
    let weightOrder = body.lineItems.reduce(((sum, item) => sum + parseInt(item.productWeight)), 0)

    let isBusinessDay = offDays.filter(item => item === moment().format('YYYY-MM-DD'))
    let nextBusinessDays = await Utils.getNextBusinessDays(10, offDays)

    if (weightOrder >= minWeight && weightOrder <= maxWeight) {

      const dayType = shippingInfo.rules.availability.byRequestTime.dayType
      const fromTimeOfDay = shippingInfo.rules.availability.byRequestTime.fromTimeOfDay
      const toTimeOfDay = shippingInfo.rules.availability.byRequestTime.toTimeOfDay

      if (dayType === 'ANY' || (dayType === 'BUSINESS' && isBusinessDay.length <= 0)) {

        let hourNowDatetime = moment().format('HH')
        if (hourNowDatetime >= fromTimeOfDay && hourNowDatetime <= toTimeOfDay) {
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

          /* Pack Promise params */
          const minType = workingCase.packPromise.min.type
          const minDeltaHours = workingCase.packPromise.min.deltaHours
          const minDeltaBusinessDays = workingCase.packPromise.min.deltaBusinessDays
          const minTimeOfDay = workingCase.packPromise.min.timeOfDay
          const maxType = workingCase.packPromise.max.type
          const maxDeltaHours = workingCase.packPromise.max.deltaHours
          const maxDeltaBusinessDays = workingCase.packPromise.max.deltaBusinessDays
          const maxTimeOfDay = workingCase.packPromise.max.timeOfDay


          if (minType === 'NULL') {
            body['calculateShippings']['pack_promise_min'] = null
          } else if (minType === 'DELTA-HOURS') {
            body['calculateShippings']['pack_promise_min'] = moment().add(minDeltaHours, 'hour').toString()
          } else if (minType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['pack_promise_min'] = moment(`${nextBusinessDays[minDeltaBusinessDays - 1]} ${minTimeOfDay}`).toString()
          }

          if (maxType === 'NULL') {
            body['calculateShippings']['pack_promise_max'] = null
          } else if (maxType === 'DELTA-HOURS') {
            body['calculateShippings']['pack_promise_max'] = moment().add(maxDeltaHours, 'hour').toString()
          } else if (maxType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['pack_promise_max'] = moment(`${nextBusinessDays[maxDeltaBusinessDays - 1]} ${maxTimeOfDay}`).toString()
          }

          /* Ship Promise params */

          const shipMinType = workingCase.shipPromise.min.type
          const shipMinDeltaHours = workingCase.shipPromise.min.deltaHours
          const shipMinDeltaBusinessDays = workingCase.shipPromise.min.deltaBusinessDays
          const shipMinTimeOfDay = workingCase.shipPromise.min.timeOfDay
          const shipMaxType = workingCase.shipPromise.max.type
          const shipMaxDeltaHours = workingCase.shipPromise.max.deltaHours
          const shipMaxDeltaBusinessDays = workingCase.shipPromise.max.deltaBusinessDays
          const shipMaxTimeOfDay = workingCase.shipPromise.max.timeOfDay


          if (shipMinType === 'NULL') {
            body['calculateShippings']['ship_promise_min'] = null
          } else if (shipMinType === 'DELTA-HOURS') {
            body['calculateShippings']['ship_promise_min'] = moment().add(shipMinDeltaHours, 'hour').toString()
          } else if (shipMinType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['ship_promise_min'] = moment(`${nextBusinessDays[shipMinDeltaBusinessDays - 1]} ${shipMinTimeOfDay}`).toString()
          }

          if (shipMaxType === 'NULL') {
            body['calculateShippings']['ship_promise_max'] = null
          } else if (shipMaxType === 'DELTA-HOURS') {
            body['calculateShippings']['ship_promise_max'] = moment().add(shipMaxDeltaHours, 'hour').toString()
          } else if (shipMaxType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['ship_promise_max'] = moment(`${nextBusinessDays[shipMaxDeltaBusinessDays - 1]} ${shipMaxTimeOfDay}`).toString()
          }

          /* Delivery Promise params*/

          const deliveryMinType = workingCase.deliveryPromise.min.type
          const deliveryMinDeltaHours = workingCase.deliveryPromise.min.deltaHours
          const deliveryMinDeltaBusinessDays = workingCase.deliveryPromise.min.deltaBusinessDays
          const deliveryMinTimeOfDay = workingCase.deliveryPromise.min.timeOfDay
          const deliveryMaxType = workingCase.deliveryPromise.max.type
          const deliveryMaxDeltaHours = workingCase.deliveryPromise.max.deltaHours
          const deliveryMaxDeltaBusinessDays = workingCase.deliveryPromise.max.deltaBusinessDays
          const deliveryMaxTimeOfDay = workingCase.deliveryPromise.max.timeOfDay

          if (deliveryMinType === 'NULL') {
            body['calculateShippings']['delivery_promise_min'] = null
          } else if (deliveryMinType === 'DELTA-HOURS') {
            body['calculateShippings']['delivery_promise_min'] = moment().add(deliveryMinDeltaHours, 'hour').toString()
          } else if (deliveryMinType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['delivery_promise_min'] = moment(`${nextBusinessDays[deliveryMinDeltaBusinessDays - 1]} ${deliveryMinTimeOfDay}`).toString()
          }

          if (deliveryMaxType === 'NULL') {
            body['calculateShippings']['delivery_promise_max'] = null
          } else if (deliveryMaxType === 'DELTA-HOURS') {
            body['calculateShippings']['delivery_promise_max'] = moment().add(deliveryMaxDeltaHours, 'hour').toString()
          } else if (deliveryMaxType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['delivery_promise_max'] = moment(`${nextBusinessDays[deliveryMaxDeltaBusinessDays - 1]} ${deliveryMaxTimeOfDay}`).toString()
          }


          /* ReadyPickUpPromise Promise params*/

          const pickUpMinType = workingCase.readyPickUpPromise.min.type
          const pickUpMinDeltaHours = workingCase.readyPickUpPromise.min.deltaHours
          const pickUpMinDeltaBusinessDays = workingCase.readyPickUpPromise.min.deltaBusinessDays
          const pickUpMinTimeOfDay = workingCase.readyPickUpPromise.min.timeOfDay
          const pickUpMaxType = workingCase.readyPickUpPromise.max.type
          const pickUpMaxDeltaHours = workingCase.readyPickUpPromise.max.deltaHours
          const pickUpMaxDeltaBusinessDays = workingCase.readyPickUpPromise.max.deltaBusinessDays
          const pickUpMaxTimeOfDay = workingCase.readyPickUpPromise.max.timeOfDay

          if (pickUpMinType === 'NULL') {
            body['calculateShippings']['ready_pickup_promise_min'] = null
          } else if (pickUpMinType === 'DELTA-HOURS') {
            body['calculateShippings']['ready_pickup_promise_min'] = moment().add(pickUpMinDeltaHours, 'hour').toString()
          } else if (pickUpMinType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['ready_pickup_promise_min'] = moment(`${nextBusinessDays[pickUpMinDeltaBusinessDays - 1]} ${pickUpMinTimeOfDay}`).toString()
          }

          if (pickUpMaxType === 'NULL') {
            body['calculateShippings']['ready_pickup_promise_max'] = null
          } else if (pickUpMaxType === 'DELTA-HOURS') {
            body['calculateShippings']['ready_pickup_promise_max'] = moment().add(pickUpMaxDeltaHours, 'hour').toString()
          } else if (pickUpMaxType === 'DELTA-BUSINESSDAYS') {
            body['calculateShippings']['ready_pickup_promise_max'] = moment(`${nextBusinessDays[pickUpMaxDeltaBusinessDays - 1]} ${pickUpMaxTimeOfDay}`).toString()
          }

        } else {
          body['calculateShippings'] = Utils.setShippingNull()
        }
      } else {
        body['calculateShippings'] = Utils.setShippingNull()
      }
    } else {
      body['calculateShippings'] = Utils.setShippingNull()
    }

    const newOrder = new sellOrder(body)
    let order = await newOrder.save()
    
    response = {
      data: { order },
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
