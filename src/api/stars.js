export const createStarsInvoice = async ({ userId, packId, amountChips, priceStars }) => {
  const response = await fetch('/api/stars/create-invoice', {
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
