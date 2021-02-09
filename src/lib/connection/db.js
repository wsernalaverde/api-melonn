'use strict'
const mongoose = require('mongoose')
import config from '../../config'

module.exports = {
  async connect () {
    try {
      let info = {
        url: config.db.url,
        status: 1
      }

      mongoose.connection.on('error', console.error)

      const db = await mongoose.connect(info.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
      }, () => console.log('Conexión éxitosa con base de datos'))

      return Promise.resolve(db)
    } catch (error) {
      return Promise.reject(error)
    }
  }
}
