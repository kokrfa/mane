import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'fs'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000

const PACKS = {
  chips_1000: { chips: 1000, stars: 50, title: '1 000 chips' },
  chips_5000: { chips: 5000, stars: 200, title: '5 000 chips' },
  chips_10000: { chips: 10000, stars: 350, title: '10 000 chips' },
}

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set(['http://localhost:5173', ...corsOrigins])

const balancesPath = process.env.BALANCES_PATH || '/tmp/balances.json'

const loadBalances = () => {
  try {
    if (fs.existsSync(balancesPath)) {
      const raw = fs.readFileSync(balancesPath, 'utf8')
      return raw ? JSON.parse(raw) : {}
    }
  } catch (error) {
    console.warn('Unable to read balances file', error)
  }
  return {}
}

let balances = loadBalances()

const saveBalances = () => {
  try {
    fs.writeFileSync(balancesPath, JSON.stringify(balances, null, 2))
  } catch (error) {
    console.error('Unable to save balances file', error)
  }
}

const getBalance = (userId) => balances[String(userId)]?.chips ?? 0

const creditBalance = (userId, amount) => {
  const key = String(userId)
  const nextBalance = getBalance(key) + amount
  balances = {
    ...balances,
    [key]: { chips: nextBalance },
  }
  saveBalances()
  return nextBalance
}

const callTelegram = async (method, body) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN')
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) {
    console.error('Telegram API error', { method, status: response.status, data })
    throw new Error(data?.description || 'Telegram API request failed')
  }

  return data.result
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/me/balance', (req, res) => {
  const { userId } = req.query
  if (!userId) {
    res.status(400).json({ error: 'userId_required' })
    return
  }

  res.json({ chips: getBalance(userId) })
})

const validateAmount = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null
  }
  return numeric
}

app.post('/api/stars/create-invoice', async (req, res) => {
  const { userId, packId, amountChips, priceStars } = req.body || {}
  console.log('Create invoice request', { userId, packId, amountChips, priceStars })

  if (!userId) {
    res.status(400).json({ enabled: false, reason: 'no_user' })
    return
  }

  if (!packId) {
    res.status(400).json({ enabled: false, reason: 'invalid_request' })
    return
  }

  const amountChipsValue = validateAmount(amountChips)
  const priceStarsValue = validateAmount(priceStars)
  if (!amountChipsValue || !priceStarsValue) {
    res.status(400).json({ enabled: false, reason: 'invalid_request' })
    return
  }

  const pack = PACKS[packId]
  if (!pack || pack.chips !== amountChipsValue || pack.stars !== priceStarsValue) {
    res.status(400).json({ enabled: false, reason: 'invalid_pack' })
    return
  }

  const enabled = String(process.env.STARS_PAYMENTS_ENABLED).toLowerCase() === 'true'
  if (!enabled) {
    res.json({ enabled: false, reason: 'coming_soon' })
    return
  }

  try {
    const payload = JSON.stringify({
      userId,
      packId,
      amountChips: amountChipsValue,
      priceStars: priceStarsValue,
    })
    const invoiceLink = await callTelegram('createInvoiceLink', {
      title: 'Chips pack',
      description: `Buy +${amountChipsValue} chips`,
      payload,
      currency: 'XTR',
      prices: [{ label: `+${amountChipsValue} chips`, amount: priceStarsValue }],
    })

    res.json({
      enabled: true,
      invoiceLink,
    })
  } catch (error) {
    console.error('Unable to create invoice', error)
    res.status(500).json({
      enabled: false,
      reason: 'telegram_error',
      message: error?.message || 'Unable to create Telegram invoice.',
    })
  }
})

const handleTelegramWebhook = async (req, res) => {
  const update = req.body

  try {
    if (update?.pre_checkout_query) {
      await callTelegram('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      })
    }

    const successfulPayment = update?.message?.successful_payment
    if (successfulPayment) {
      const userId = update?.message?.from?.id
      const payload = successfulPayment.invoice_payload
      let packId = null

      if (payload) {
        try {
          const parsed = JSON.parse(payload)
          packId = parsed?.packId
        } catch (error) {
          console.warn('Unable to parse invoice payload', error)
        }
      }

      const pack = packId ? PACKS[packId] : null
      if (!userId || !pack) {
        console.warn('Missing user or pack for payment', { userId, packId })
      } else if (successfulPayment.currency === 'XTR' && successfulPayment.total_amount !== pack.stars) {
        console.warn('Payment amount mismatch', {
          expected: pack.stars,
          received: successfulPayment.total_amount,
        })
      } else {
        const newBalance = creditBalance(userId, pack.chips)
        console.log('Credited chips', { userId, packId, newBalance })
      }
    }
  } catch (error) {
    console.error('Stars webhook error', error)
  }

  res.json({ ok: true })
}

app.post('/api/telegram/webhook', handleTelegramWebhook)
app.post('/api/stars/webhook', handleTelegramWebhook)

app.listen(port, () => {
  console.log(`Stars payments listening on ${port}`)
})
