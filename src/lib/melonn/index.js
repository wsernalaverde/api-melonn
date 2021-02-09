import request from 'axios'
import config from '../../config'

class Melonn {
  static async getShippingMethods () {
    try {
      const res = await request({
        url: `${config.melonn.baseUrl}/sandbox/shipping-methods`,
        method: 'GET',
        headers: {
          'x-api-key': `${config.melonn.key}`
        },
      })

      return Promise.resolve(res.data)
    } catch (e) {
      return Promise.reject(e)
    }
  }

  static async getShippingMethodById (id) {
    try {
      const res = await request({
        url: `${config.melonn.baseUrl}/sandbox/shipping-methods/${id}`,
        method: 'GET',
        headers: {
          'x-api-key': `${config.melonn.key}`
        },
      })

      return Promise.resolve(res.data)
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

module.exports = Melonn
