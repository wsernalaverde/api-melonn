import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import router from './routes'

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors({
  optionsSuccessStatus: 200
}))

app.use('/', router)

const portDefault = process.env.PORT || 3001

module.exports = {
  async start (portCustom, host = 'localhost') {
    const port = (portCustom === 'test') ? null : portCustom || portDefault
    const server = app.listen(port, () => console.log(`Servidor iniciado en el puerto ${port}`))
    return server
  }
}
