const app = require('./dist/app.js')

const init = async () => {
  try {
    await app.start()
  } catch (e) {
    console.log(e)
  }
}

init()
