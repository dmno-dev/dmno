import('dmno/auto-inject-globals');
const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.json({
    status: 'ok!',
    config: {
      public: DMNO_CONFIG.PUBLIC_EXAMPLE,
      private: DMNO_CONFIG.SECRET_EXAMPLE,
    }
  })
})

app.listen(DMNO_CONFIG.PORT, () => {
  console.log(`Example app listening on port ${port}`)
})
