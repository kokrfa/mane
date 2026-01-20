import { useEffect, useMemo, useRef, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { createStarsInvoice, fetchBalance } from './api/stars'
import './App.css'

const SCREEN = {
  home: 'home',
  game: 'game',
  shop: 'shop',
}

const placeholderUser = {
  first_name: 'Guest',
  last_name: 'Player',
  username: 'telegram_user',
}

const SUITS = [
  { name: 'Hearts', symbol: '♥', color: 'red' },
  { name: 'Diamonds', symbol: '♦', color: 'red' },
  { name: 'Clubs', symbol: '♣', color: 'black' },
  { name: 'Spades', symbol: '♠', color: 'black' },
]

const RANKS = [
  { rank: 'A', value: 11 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
]

const RESULT_LABEL = {
  win: 'You win!',
  lose: 'Dealer wins.',
  push: 'Push.',
  blackjack: 'Blackjack! You win!',
  dealerBlackjack: 'Blackjack! Dealer wins.',
}

const createDeck = () => {
  let counter = 0
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${rank.rank}${suit.name}-${counter++}`,
      suit: suit.name,
      symbol: suit.symbol,
      color: suit.color,
      rank: rank.rank,
      value: rank.value,
    })),
  )
}

const shuffleDeck = (deck) => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const drawFromDeck = (deck) => {
  const nextDeck = [...deck]
  const card = nextDeck.pop()
  return { card, deck: nextDeck }
}

const calculateHandValue = (hand) => {
  let total = hand.reduce((sum, card) => sum + card.value, 0)
  let aces = hand.filter((card) => card.rank === 'A').length
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

const isBlackjack = (hand) => hand.length === 2 && calculateHandValue(hand) === 21

const determineWinner = (playerTotal, dealerTotal) => {
  if (playerTotal > 21) return 'lose'
  if (dealerTotal > 21) return 'win'
  if (playerTotal > dealerTotal) return 'win'
  if (playerTotal < dealerTotal) return 'lose'
  return 'push'
}

const playDealerTurn = (deck, dealerHand) => {
  let currentDeck = [...deck]
  let currentDealer = [...dealerHand]
  let total = calculateHandValue(currentDealer)

  while (total < 17 && currentDeck.length > 0) {
    const { card, deck: nextDeck } = drawFromDeck(currentDeck)
    if (!card) break
    currentDealer = [...currentDealer, card]
    currentDeck = nextDeck
    total = calculateHandValue(currentDealer)
  }

  return { deck: currentDeck, dealerHand: currentDealer }
}

function App() {
  const [screen, setScreen] = useState(SCREEN.home)
  const [gameState, setGameState] = useState('idle') // idle | playerTurn | dealerTurn | roundEnd
  const [deck, setDeck] = useState([])
  const [playerHand, setPlayerHand] = useState([])
  const [dealerHand, setDealerHand] = useState([])
  const [result, setResult] = useState(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [theme, setTheme] = useState('dark')

  const [balance, setBalance] = useState(1000)
  const [bet, setBet] = useState(0)
  const [customBet, setCustomBet] = useState('')
  const [statusNote, setStatusNote] = useState(null)
  const [shopNote, setShopNote] = useState(null)
  const [loadingPackId, setLoadingPackId] = useState(null)

  const hitLockRef = useRef(false)
  const payoutAppliedRef = useRef(false)
  const resultShownRef = useRef(false)
  const lastBetRef = useRef(0)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  const user = useMemo(() => WebApp.initDataUnsafe?.user ?? placeholderUser, [])

  const syncBalance = async () => {
    const telegramId = WebApp.initDataUnsafe?.user?.id
    if (!telegramId) return

    try {
      const data = await fetchBalance({ userId: telegramId })
      if (typeof data?.chips === 'number') {
        setBalance(data.chips)
      }
    } catch (error) {
      console.error('Unable to sync balance', error)
    }
  }

  useEffect(() => {
    syncBalance()
  }, [])

  const playerTotal = useMemo(() => calculateHandValue(playerHand), [playerHand])
  const dealerTotal = useMemo(() => calculateHandValue(dealerHand), [dealerHand])

  const isDealerHidden = gameState === 'playerTurn'

  const dealerVisibleTotal = useMemo(() => {
    if (!isDealerHidden) return dealerTotal
    const visible = dealerHand[0] ? [dealerHand[0]] : []
    return calculateHandValue(visible)
  }, [dealerHand, dealerTotal, isDealerHidden])

  const dealerTotalDisplay = isDealerHidden ? dealerVisibleTotal : dealerTotal

  const isBettingLocked = gameState !== 'idle'

  const handleSetBet = (amount) => {
    const clamped = Math.max(0, Math.min(balance, amount))
    setBet(clamped)
    if (clamped > 0) setStatusNote(null)
  }

  const handleCustomBet = () => {
    const nextBet = parseInt(customBet, 10)
    if (!nextBet || Number.isNaN(nextBet) || nextBet <= 0) {
      setStatusNote('Enter a valid bet.')
      return
    }
    handleSetBet(nextBet)
  }

  const resetRound = () => {
    setGameState('idle')
    setDeck([])
    setPlayerHand([])
    setDealerHand([])
    setResult(null)
    setIsResultOpen(false)
    setStatusNote(null)
    setCustomBet('')
    payoutAppliedRef.current = false
    hitLockRef.current = false
    resultShownRef.current = false
    lastBetRef.current = 0
  }

  const goToHome = () => {
    resetRound()
    setScreen(SCREEN.home)
  }

  const goToGame = () => {
    resetRound()
    setScreen(SCREEN.game)
  }

  const goToShop = () => {
    resetRound()
    setShopNote(null)
    setScreen(SCREEN.shop)
  }

  const startStarsPurchase = async (pack) => {
    setShopNote(null)
    setLoadingPackId(pack.id)
    const stopLoading = () => setLoadingPackId(null)

    try {
      const data = await createStarsInvoice({
        userId: WebApp.initDataUnsafe?.user?.id ?? null,
        packId: pack.id,
        amountChips: pack.amount,
        priceStars: pack.priceStars,
      })

      if (!data?.enabled) {
        if (data?.reason === 'no_user') {
          setShopNote('Open this mini app inside Telegram to buy chips with Stars.')
        } else {
          setShopNote('Coming soon — Stars payments will be enabled after backend integration.')
        }
        stopLoading()
        return
      }

      if (!data?.invoiceLink) {
        setShopNote('Unable to start payment. Please try again.')
        stopLoading()
        return
      }

      if (!WebApp?.openInvoice) {
        setShopNote('Telegram Stars checkout is only available inside Telegram.')
        stopLoading()
        return
      }

      WebApp.openInvoice(data.invoiceLink, (status) => {
        if (status === 'paid') {
          setBalance((prev) => prev + pack.amount)
          setShopNote('Payment successful! Chips added to your balance.')
        } else if (status === 'cancelled') {
          setShopNote('Payment cancelled.')
        } else if (status === 'failed') {
          setShopNote('Payment failed. Please try again.')
        } else {
          setShopNote('Payment status updated.')
        }
        stopLoading()
      })
    } catch (error) {
      console.error(error)
      setShopNote('Unable to start purchase. Please try again later.')
      stopLoading()
    }
  }

  const startRound = () => {
    if (balance <= 0) {
      setStatusNote('Out of chips. Buy more in the Shop.')
      return
    }
    if (bet === 0) {
      setStatusNote('Place a bet to start.')
      return
    }

    payoutAppliedRef.current = false
    resultShownRef.current = false
    lastBetRef.current = bet
    setIsResultOpen(false)
    setStatusNote(null)
    setCustomBet('')

    const freshDeck = shuffleDeck(createDeck())
    const playerCards = [freshDeck.pop(), freshDeck.pop()].filter(Boolean)
    const dealerCards = [freshDeck.pop(), freshDeck.pop()].filter(Boolean)

    setDeck(freshDeck)
    setPlayerHand(playerCards)
    setDealerHand(dealerCards)

    const playerHasBlackjack = isBlackjack(playerCards)
    const dealerHasBlackjack = isBlackjack(dealerCards)

    if (playerHasBlackjack || dealerHasBlackjack) {
      if (playerHasBlackjack && dealerHasBlackjack) setResult('push')
      else if (playerHasBlackjack) setResult('blackjack')
      else setResult('dealerBlackjack')

      setGameState('roundEnd')
    } else {
      setResult(null)
      setGameState('playerTurn')
    }
  }

  const handleHit = () => {
    if (gameState !== 'playerTurn' || hitLockRef.current) return
    hitLockRef.current = true

    const { card, deck: nextDeck } = drawFromDeck(deck)
    setDeck(nextDeck)
    if (card) setPlayerHand((prev) => [...prev, card])

    if (import.meta.env.DEV) console.debug('HIT', { cardsAdded: card ? 1 : 0 })
  }

  const handleStand = () => {
    if (gameState !== 'playerTurn') return
    setGameState('dealerTurn')

    setTimeout(() => {
      const playerNowTotal = calculateHandValue(playerHand)
      const { deck: nextDeck, dealerHand: nextDealer } = playDealerTurn(deck, dealerHand)
      const nextResult = determineWinner(playerNowTotal, calculateHandValue(nextDealer))

      setDeck(nextDeck)
      setDealerHand(nextDealer)
      setResult(nextResult)
      setGameState('roundEnd')
    }, 250)
  }

  // Bust ends immediately
  useEffect(() => {
    if (gameState === 'playerTurn' && playerTotal > 21) {
      setResult('lose')
      setGameState('roundEnd')
    }
  }, [gameState, playerTotal])

  // Release hit lock after updates
  useEffect(() => {
    hitLockRef.current = false
  }, [playerHand, gameState])

  // Apply payout once per round, then return to idle
  useEffect(() => {
    if (gameState === 'roundEnd' && result && !payoutAppliedRef.current) {
      const wager = lastBetRef.current || bet

      setBalance((prevBalance) => {
        if (result === 'win') return prevBalance + wager
        if (result === 'lose') return prevBalance - wager
        if (result === 'blackjack') return prevBalance + Math.floor(wager * 1.5)
        if (result === 'dealerBlackjack') return prevBalance - wager
        return prevBalance
      })

      payoutAppliedRef.current = true
      setGameState('idle')
      // Bet is NOT forced to 0: player can quickly replay with same bet or change it.
    }
  }, [gameState, result, bet])

  useEffect(() => {
    if (gameState === 'idle' && result && payoutAppliedRef.current && !resultShownRef.current) {
      setIsResultOpen(true)
      resultShownRef.current = true
    }
  }, [gameState, result])

  const statusMessage = useMemo(() => {
    if (balance <= 0) return 'Out of chips. Buy more in the Shop.'
    if (statusNote) return statusNote

    if (gameState === 'idle' && result) return RESULT_LABEL[result] ?? 'Round over.'
    if (gameState === 'idle') return 'Ready to deal a new round.'
    if (gameState === 'playerTurn') return 'Your move: hit or stand.'
    if (gameState === 'dealerTurn') return 'Dealer is drawing...'
    if (gameState === 'roundEnd') return RESULT_LABEL[result] ?? 'Round over.'
    return ''
  }, [balance, gameState, result, statusNote])

  const renderCard = (card) => (
    <div
      className={`playing-card ${card.color === 'red' ? 'playing-card--red' : ''}`}
      key={card.id}
    >
      <span className="playing-card__rank">{card.rank}</span>
      <span className="playing-card__suit">{card.symbol}</span>
    </div>
  )

  const renderHiddenCard = (cardId) => (
    <div className="playing-card playing-card--hidden" key={cardId}>
      <span className="playing-card__hidden-label">Hidden</span>
    </div>
  )

  const chipPacks = [
    { id: 'chips_1000', amount: 1000, priceStars: 50 },
    { id: 'chips_5000', amount: 5000, priceStars: 200 },
    { id: 'chips_10000', amount: 10000, priceStars: 350 },
  ]

  return (
    <div className={`app theme-${theme}`}>
      <div className="app__content">
        <header className="app__header">
          <div className="app__brand">
            <p className="app__eyebrow">gobet mini app</p>
            <h1 className="app__title">gobet</h1>
          </div>

          <div className="app__actions">
            <nav className="app__nav">
              <button className={screen === SCREEN.home ? 'active' : ''} onClick={goToHome} type="button">
                Home
              </button>
              <button className={screen === SCREEN.game ? 'active' : ''} onClick={goToGame} type="button">
                Game
              </button>
            </nav>
            <button
              className="theme-toggle"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              type="button"
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </header>

        {screen === SCREEN.home ? (
          <main className="home">
            <section className="card home__hero">
              <div className="home__logo">gobet</div>
              <p className="home__subtitle">Blackjack Mini Game</p>
              <p className="home__tagline">Play smart. Win big.</p>
              <div className="actions home__actions">
                <button className="primary" onClick={goToGame} type="button">
                  Play Blackjack
                </button>
                <button className="secondary" onClick={goToShop} type="button">
                  Buy chips
                </button>
                <button className="secondary" type="button">
                  How to play
                </button>
              </div>
            </section>

            <section className="card home__user-card">
              <div>
                <h2>Welcome back</h2>
                <p className="muted">Signed in with Telegram</p>
              </div>
              <div className="user user--compact">
                <div className="user__avatar">{user.first_name?.[0] ?? 'G'}</div>
                <div>
                  <p className="user__name">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="user__handle">@{user.username}</p>
                </div>
              </div>
            </section>
          </main>
        ) : screen === SCREEN.game ? (
          <main className="game">
            <section className="table">
              <div className="table__row table__row--dealer">
                <div className="hand">
                  <div className="hand__header">
                    <p className="hand__label">Dealer</p>
                    <p className="hand__total">Total: {dealerTotalDisplay}</p>
                  </div>
                  <div className="cards">
                    {dealerHand.map((card, index) =>
                      isDealerHidden && index === 1
                        ? renderHiddenCard(`${card.id}-hidden`)
                        : renderCard(card),
                    )}
                  </div>
                </div>
              </div>

              <div className="table__divider">
                <span>Blackjack Table</span>
              </div>

              <div className="table__row table__row--player">
                <div className="hand">
                  <div className="hand__header">
                    <p className="hand__label">You</p>
                    <p className="hand__total">Total: {playerTotal}</p>
                  </div>
                  <div className="cards">{playerHand.map((card) => renderCard(card))}</div>
                </div>
              </div>
            </section>

            <section className="card game__panel">
              <div className="panel__header">
                <h2>Controls</h2>
                <p className="muted">{statusMessage}</p>
              </div>

              <div className="game__bets">
                <div className="bet__summary">
                  <p>Balance: {balance}</p>
                  <p>Bet: {bet}</p>
                </div>
                {balance <= 0 ? <p className="muted">Out of chips. Buy more in the Shop.</p> : null}

                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() => handleSetBet(25)}
                    type="button"
                    disabled={isBettingLocked}
                  >
                    25
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleSetBet(50)}
                    type="button"
                    disabled={isBettingLocked}
                  >
                    50
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleSetBet(100)}
                    type="button"
                    disabled={isBettingLocked}
                  >
                    100
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleSetBet(250)}
                    type="button"
                    disabled={isBettingLocked}
                  >
                    250
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleSetBet(balance)}
                    type="button"
                    disabled={isBettingLocked}
                  >
                    Max
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleSetBet(0)}
                    type="button"
                    disabled={isBettingLocked}
                  >
                    Clear
                  </button>
                </div>

                <div className="actions bet__custom">
                  <label className="field">
                    Custom bet
                    <input
                      min="0"
                      step="1"
                      type="number"
                      value={customBet}
                      disabled={isBettingLocked}
                      onChange={(event) => setCustomBet(event.target.value)}
                    />
                  </label>
                  <button
                    className="secondary"
                    onClick={handleCustomBet}
                    type="button"
                    disabled={isBettingLocked}
                  >
                    Set
                  </button>
                </div>

                <div className="actions">
                  <button
                    className={balance <= 0 ? 'primary' : 'secondary'}
                    onClick={goToShop}
                    type="button"
                  >
                    Buy chips
                  </button>
                </div>
              </div>

              <div className="actions game__actions">
                <button
                  className="secondary"
                  onClick={handleHit}
                  type="button"
                  disabled={gameState !== 'playerTurn'}
                >
                  Hit
                </button>
                <button
                  className="secondary"
                  onClick={handleStand}
                  type="button"
                  disabled={gameState !== 'playerTurn'}
                >
                  Stand
                </button>
                <button
                  className="primary"
                  onClick={startRound}
                  type="button"
                  disabled={gameState === 'playerTurn' || gameState === 'dealerTurn' || bet === 0 || balance <= 0}
                >
                  Deal
                </button>
              </div>
            </section>
          </main>
        ) : (
          <main className="shop">
            <section className="card">
              <h2>Shop</h2>
              <p className="muted">Payments via Telegram Stars.</p>
              {shopNote ? <p className="muted">{shopNote}</p> : null}
            </section>

            <section className="shop__packs">
              {chipPacks.map((pack) => (
                <div className="card" key={pack.id}>
                  <h3>+{pack.amount.toLocaleString()} chips</h3>
                  <p className="muted">Pack ID: {pack.id}</p>
                  <p className="muted">{pack.priceStars} Stars</p>
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => startStarsPurchase(pack)}
                      type="button"
                      disabled={loadingPackId === pack.id}
                    >
                      {loadingPackId === pack.id ? 'Loading…' : 'Buy'}
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <div className="actions">
              <button className="secondary" onClick={goToHome} type="button">
                Back to Home
              </button>
              <button className="primary" onClick={goToGame} type="button">
                Go to Game
              </button>
            </div>
          </main>
        )}
      </div>
      {isResultOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Round result">
            <h2>{RESULT_LABEL[result] ?? 'Round over.'}</h2>
            <p className="muted">Last bet: {lastBetRef.current}</p>
            <p className="muted">Balance: {balance}</p>
            <div className="actions">
              <button
                className="primary"
                onClick={() => {
                  setIsResultOpen(false)
                  setGameState('idle')
                }}
                type="button"
              >
                Play again
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setIsResultOpen(false)
                  resetRound()
                  setScreen(SCREEN.home)
                }}
                type="button"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
