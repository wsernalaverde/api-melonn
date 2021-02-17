import moment from 'moment-timezone'

class Utils {

  static async getNextBusinessDays (numberDays, offDays) {
    try {
      let nextBusinessDays = []
      let cont = 1

      for (let i = 1; i <= numberDays; i++) {
        let day = moment().add(cont,'days').format('YYYY-MM-DD')
        if (offDays.filter(item => item === day).length <= 0) {
          nextBusinessDays.push(day)
        } else {
          cont++
          day = moment().add(cont,'days').format('YYYY-MM-DD')
          nextBusinessDays.push(day)
        }
        cont++
      }

      return nextBusinessDays

      return Promise.resolve(res.data)
    } catch (e) {
      return Promise.reject(e)
    }
  }

  static setShippingNull () {
    return {
      pack_promise_min: null,
      pack_promise_max: null,
      ship_promise_min: null,
      ship_promise_max: null,
      delivery_promise_min: null,
      delivery_promise_max: null,
      ready_pickup_promise_min: null,
      ready_pickup_promise_max: null
    }
  }

  static async validateCase (priority, casesPromise) {
    let caseData = casesPromise.filter(item => item.priority === priority)
  }

}

module.exports = Utils
