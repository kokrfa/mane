const userBalances = new Map()
const DEFAULT_BALANCE = 1000

export const getBalance = (userId) => {
  const key = String(userId)
  return userBalances.get(key) ?? DEFAULT_BALANCE
}

export const addChips = (userId, amount) => {
  const key = String(userId)
  const nextBalance = getBalance(key) + amount
  userBalances.set(key, nextBalance)
  return nextBalance
}

export default {
  userBalances,
  getBalance,
  addChips,
}
