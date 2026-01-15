import { useEffect, useMemo, useRef, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import './App.css'

const SCREEN = {
  home: 'home',
  game: 'game',
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
  const [gameState, setGameState] = useState('idle')
  const [deck, setDeck] = useState([])
  const [playerHand, setPlayerHand] = useState([])
  const [dealerHand, setDealerHand] = useState([])
  const [result, setResult] = useState(null)
  const [balance, setBalance] = useState(1000)
  const [bet, setBet] = useState(0)
  const [customBet, setCustomBet] = useState('')
  const [statusNote, setStatusNote] = useState(null)
  const hitLockRef = useRef(false)
  const payoutAppliedRef = useRef(false)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  const user = useMemo(() => {
    return WebApp.initDataUnsafe?.user ?? placeholderUser
  }, [])

  const playerTotal = useMemo(
    () => calculateHandValue(playerHand),
    [playerHand],
  )
  const dealerTotal = useMemo(
    () => calculateHandValue(dealerHand),
    [dealerHand],
  )
  const dealerVisibleTotal = useMemo(() => {
    if (gameState !== 'playerTurn') return calculateHandValue(dealerHand)
    const visible = dealerHand[0] ? [dealerHand[0]] : []
    return calculateHandValue(visible)
  }, [dealerHand, gameState])
  const isDealerHidden = gameState === 'playerTurn'
  const dealerTotalDisplay =
    gameState === 'playerTurn' ? dealerVisibleTotal : dealerTotal

  const isBettingLocked = gameState !== 'idle'

  const handleSetBet = (amount) => {
    setBet(Math.max(0, Math.min(balance, amount)))
  }

  const handleCustomBet = () => {
  const nextBet = parseInt(customBet, 10)
  if (!nextBet || Number.isNaN(nextBet) || nextBet <= 0) {
    setStatusNote('Enter a valid bet.')
    return
  }
  handleSetBet(Math.min(balance, nextBet))
}

const resetRound = () => {
  setGameState('idle')
  setDeck([])
  setPlayerHand([])
  setDealerHand([])
  setResult(null)
  setStatusNote(null)
  setCustomBet('')
  payoutAppliedRef.current = false
  hitLockRef.current = false
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
    setCustomBet('')
    payoutAppliedRef.current = false
    setStatusNote(null)
    const freshDeck = shuffleDeck(createDeck())
    const playerCards = [freshDeck.pop(), freshDeck.pop()].filter(Boolean)
    const dealerCards = [freshDeck.pop(), freshDeck.pop()].filter(Boolean)

    setDeck(freshDeck)
    setPlayerHand(playerCards)
    setDealerHand(dealerCards)

    const playerHasBlackjack = isBlackjack(playerCards)
    const dealerHasBlackjack = isBlackjack(dealerCards)

    if (playerHasBlackjack || dealerHasBlackjack) {
      if (playerHasBlackjack && dealerHasBlackjack) {
        setResult('push')
      } else if (playerHasBlackjack) {
        setResult('blackjack')
      } else {
        setResult('dealerBlackjack')
      }
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
    if (card) {
      setPlayerHand((prevHand) => [...prevHand, card])
    }
    if (import.meta.env.DEV) {
      console.debug('HIT', { cardsAdded: card ? 1 : 0 })
    }
  }

  const handleStand = () => {
    if (gameState !== 'playerTurn') return
    setGameState('dealerTurn')
    setTimeout(() => {
      const playerNowTotal = calculateHandValue(playerHand)
      const { deck: nextDeck, dealerHand: nextDealer } = playDealerTurn(
        deck,
        dealerHand,
      )
      const nextResult = determineWinner(
        playerNowTotal,
        calculateHandValue(nextDealer),
      )

      setDeck(nextDeck)
      setDealerHand(nextDealer)
      setResult(nextResult)
      setGameState('roundEnd')
    }, 250)
  }

  useEffect(() => {
    if (gameState === 'playerTurn' && playerTotal > 21) {
      setResult('lose')
      setGameState('roundEnd')
    }
  }, [gameState, playerTotal])

  useEffect(() => {
    hitLockRef.current = false
  }, [playerHand, gameState])

  useEffect(() => {
    if (bet > 0) {
      setStatusNote(null)
    }
  }, [bet])

  useEffect(() => {
    if (gameState === 'roundEnd' && result && !payoutAppliedRef.current) {
      setBalance((prevBalance) => {
        if (result === 'win') return prevBalance + bet
        if (result === 'lose') return prevBalance - bet
        if (result === 'blackjack')
          return prevBalance + Math.floor(bet * 1.5)
        if (result === 'dealerBlackjack') return prevBalance - bet
        return prevBalance
      })
      payoutAppliedRef.current = true
      setGameState('idle')
    }
  }, [gameState, result, bet])

  const statusMessage = useMemo(() => {
    if (balance <= 0) return 'Out of chips. Buy more in the Shop.'
    if (statusNote) return statusNote
    if (gameState === 'idle' && result)
      return RESULT_LABEL[result] ?? 'Round over.'
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


  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Telegram Mini App</p>
          <h1 className="app__title">Blackjack</h1>
        </div>
        <nav className="app__nav">
          <button
            className={screen === SCREEN.home ? 'active' : ''}
            onClick={() => {
              resetRound()
              setScreen(SCREEN.home)
            }}
            type="button"
          >
            Home
          </button>
          <button
            className={screen === SCREEN.game ? 'active' : ''}
            onClick={() => {
              resetRound()
              setScreen(SCREEN.game)
            }}
            type="button"
          >
            Game
          </button>
        </nav>
      </header>

      {screen === SCREEN.home ? (
        <main className="home">
          <section className="card">
            <h2>Welcome back</h2>
            <p className="muted">Signed in with Telegram</p>
            <div className="user">
              <div className="user__avatar">{user.first_name?.[0] ?? 'G'}</div>
              <div>
                <p className="user__name">
                  {user.first_name} {user.last_name}
                </p>
                <p className="user__handle">@{user.username}</p>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Quick actions</h2>
            <p className="muted">
              Start a new Blackjack round or explore the upcoming features.
            </p>
            <div className="actions">
              <button
                className="primary"
                onClick={() => {
                  resetRound()
                  setScreen(SCREEN.game)
                }}
                type="button"
              >
                Start game
              </button>
              <button className="secondary" type="button">
                View rules
              </button>
            </div>
          </section>
        </main>
      ) : (
        <main className="game">
          <section className="table">
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
            <div className="hand">
              <div className="hand__header">
                <p className="hand__label">You</p>
                <p className="hand__total">Total: {playerTotal}</p>
              </div>
              <div className="cards">
                {playerHand.map((card) => renderCard(card))}
              </div>
            </div>
          </section>

          <section className="card game__panel">
            <h2>Game controls</h2>
            <p className="muted">
              {statusMessage}
            </p>
            <div className="actions">
  <button className="secondary" onClick={() => handleSetBet(25)} type="button" disabled={isBettingLocked}>
    25
  </button>
  <button className="secondary" onClick={() => handleSetBet(50)} type="button" disabled={isBettingLocked}>
    50
  </button>
  <button className="secondary" onClick={() => handleSetBet(100)} type="button" disabled={isBettingLocked}>
    100
  </button>
  <button className="secondary" onClick={() => handleSetBet(250)} type="button" disabled={isBettingLocked}>
    250
  </button>
  <button className="secondary" onClick={() => handleSetBet(balance)} type="button" disabled={isBettingLocked}>
    Max
  </button>
  <button className="secondary" onClick={() => handleSetBet(0)} type="button" disabled={isBettingLocked}>
    Clear
  </button>
</div>

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
              <div className="actions">
                <label>
                  Custom bet
                  <input
                    min="0"
                    onChange={(event) => setCustomBet(event.target.value)}
                    step="1"
                    type="number"
                    value={customBet}
                    disabled={isBettingLocked}
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
            </div>
            <div className="actions">
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
                disabled={
                  gameState === 'playerTurn' ||
                  gameState === 'dealerTurn' ||
                  bet === 0 ||
                  balance <= 0
                }
              >
                Deal new round
              </button>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
