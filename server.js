#!/usr/bin/env node

const path = require('path')
let parent_dir = path.resolve(__dirname, '..')
console.log(parent_dir)

const http = require("http");

const server = http.createServer(function (req, res) {
	console.log(`out normal...`);
	console.error(`out error...`);
	res.end("Hello pretty opeNode World! headers = " + JSON.stringify(req.headers, null, 4));
})

server.listen(80, (err) => {
	if ( ! err) {
		console.log(`server is listening on 80`)
	}
})

///////////////////


// my binance stuff
const Binance = require('binance-api-node').default
const request = require('request-promise-native')
let { BINANCE_KEY, BINANCE_SECRET, PUSHED_KEY, PUSHED_SECRET } = process.env

// import keys manually, if it's not production
if(!BINANCE_KEY) {
  console.log(`The keys are absent, trying to get them from a file...`)
  now_keys = require(`${parent_dir}/env.json`).env
  BINANCE_KEY = now_keys.binance_key
  BINANCE_SECRET = now_keys.binance_secret
  PUSHED_KEY = now_keys.pushed_key
  PUSHED_SECRET = now_keys.pushed_secret
}

console.log(BINANCE_KEY, BINANCE_SECRET)

// create a new client
const bclient = Binance({
  apiKey: BINANCE_KEY,
  apiSecret: BINANCE_SECRET
})

process.b = bclient

const onOrder = msg => {
  console.log('New message')
  console.log(msg)
  if(msg.orderStatus)
    console.log(msg.symbol, msg.orderStatus)
  
  // FILLED NEW CANCELED
  if(msg.eventType !== 'executionReport' || msg.orderStatus !== 'FILLED')
    return

  // console.log(msg)
  // if(msg.side == 'SELL') {
  //   bclient.order({ symbol: 'BTCUSDT', side: 'BUY', quantity: 0.073921, price: 9710 })
  // }
  // return

  const quantity = parseFloat(msg.quantity)
  let price = parseFloat(msg.price)
  let usdValue = quantity * price
  let symbol = msg.symbol
  let currency = '฿'
  let emoji = '⬇️⬇️⬇️'

  if(symbol.substring(symbol.length - 4) == 'USDT') {
    symbol = symbol.substring(0, symbol.length - 4)
    price = price.toFixed(2)
    currency = '$'
    usdValue = usdValue.toFixed(2)
  }
  else if(symbol.substring(symbol.length - 3) == 'BTC') {
    symbol = symbol.substring(0, symbol.length - 3)
    usdValue = usdValue.toFixed(8)
  }

  let content = `${quantity.toFixed(6)} ${symbol} (${currency}${usdValue})`

  if(msg.side == 'BUY')
    content += ` was BOUGHT`
  else {
    content += ` was SOLD`
    emoji = '✅✅✅'
  }
  
  content += ` at the price of ${price} ${emoji}`

  // send a push notification
  request.post({
    url: 'https://api.pushed.co/1/push',
    form: {
      app_key: PUSHED_KEY,
      app_secret: PUSHED_SECRET,
      target_type: 'app',
      content,
    }
  })
  .then(resp => {
    console.log(resp)
  })
  .catch(err => {
    console.log(err)
  })
}

let clean

const cleanSocket = () => {
  // clean session
  if(clean) {
    clean()
    console.log('The session is cleaned')
  }

  // start a new one
  bclient.ws.user(onOrder)
  .then(resp => {
    clean = resp
    console.log('New session has started!')
  })
  .catch(err => {
    console.log(err)
    // clean()
    cleanSocket()
    // process.exit(1)
  })
}

cleanSocket()