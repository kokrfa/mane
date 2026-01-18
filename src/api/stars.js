const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

export const createStarsInvoice = async ({ userId, packId, amountChips, priceStars }) => {
  const response = await fetch(`${API_BASE_URL}/api/stars/create-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      packId,
      amountChips,
      priceStars,
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to create invoice.')
  }

  return response.json()
}

export const fetchBalance = async ({ userId }) => {
  const response = await fetch(
    `${API_BASE_URL}/api/me/balance?userId=${encodeURIComponent(String(userId))}`,
  )

  if (!response.ok) {
    throw new Error('Unable to fetch balance.')
  }

  return response.json()
}
