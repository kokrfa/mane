import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/stars/create-invoice', (req, res) => {
  const { userId, packId, amountChips, priceStars } = req.body || {}
  console.log('Create invoice request', { userId, packId, amountChips, priceStars })

  const enabled = String(process.env.STARS_PAYMENTS_ENABLED).toLowerCase() === 'true'
  if (!enabled) {
    res.json({ enabled: false, reason: 'coming_soon' })
    return
  }

  res.json({
    enabled: true,
    invoiceUrl: 'https://example.com/invoice_stub',
    invoiceId: 'stub_123',
  })
})

app.post('/api/stars/webhook', (req, res) => {
  console.log('Stars webhook received', req.body)
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`Stars payments stub listening on ${port}`)
})
