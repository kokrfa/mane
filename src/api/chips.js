const API_BASE_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') || ''

export const getChipsBalance = async (userId) => {
  const response = await fetch(
    `${API_BASE_URL}/api/chips/balance?userId=${encodeURIComponent(String(userId))}`,
  )

  if (!response.ok) {
    throw new Error('Unable to fetch balance.')
  }

  return response.json()
}
