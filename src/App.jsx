import { useEffect, useMemo, useState } from 'react'
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
  draw: "It's a draw.",
}

const createDeck = () =>
  SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      suit: suit.name,
      symbol: suit.symbol,
      color: suit.color,
      rank: rank.rank,
      value: rank.value,
    })),
  )

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

const determineWinner = (playerTotal, dealerTotal) => {
  if (playerTotal > 21) return 'lose'
  if (dealerTotal > 21) return 'win'
  if (playerTotal > dealerTotal) return 'win'
  if (playerTotal < dealerTotal) return 'lose'
  return 'draw'
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

  const startRound = () => {
    const freshDeck = shuffleDeck(createDeck())
    const playerCards = [freshDeck.pop(), freshDeck.pop()].filter(Boolean)
    const dealerCards = [freshDeck.pop(), freshDeck.pop()].filter(Boolean)

    setDeck(freshDeck)
    setPlayerHand(playerCards)
    setDealerHand(dealerCards)
    setResult(null)
    setGameState('playerTurn')
  }

  const handleHit = () => {
    if (gameState !== 'playerTurn') return
    setDeck((prevDeck) => {
      const { card, deck: nextDeck } = drawFromDeck(prevDeck)
      if (card) {
        setPlayerHand((prevHand) => [...prevHand, card])
      }
      return nextDeck
    })
  }

  const handleStand = () => {
    if (gameState !== 'playerTurn') return
    setGameState('dealerTurn')
    const { deck: nextDeck, dealerHand: nextDealer } = playDealerTurn(
      deck,
      dealerHand,
    )
    const nextResult = determineWinner(playerTotal, calculateHandValue(nextDealer))

    setDeck(nextDeck)
    setDealerHand(nextDealer)
    setResult(nextResult)
    setGameState('roundEnd')
  }

  useEffect(() => {
    if (screen === SCREEN.game && gameState === 'idle') {
      startRound()
    }
  }, [screen, gameState])

  useEffect(() => {
    if (gameState === 'playerTurn' && playerTotal > 21) {
      setResult('lose')
      setGameState('roundEnd')
    }
  }, [gameState, playerTotal])

  const statusMessage = useMemo(() => {
    if (gameState === 'idle') return 'Ready to deal a new round.'
    if (gameState === 'playerTurn') return 'Your move: hit or stand.'
    if (gameState === 'dealerTurn') return 'Dealer is drawing...'
    if (gameState === 'roundEnd') return RESULT_LABEL[result] ?? 'Round over.'
    return ''
  }, [gameState, result])

  const renderCard = (card, index) => (
    <div
      className={`playing-card ${
        card.color === 'red' ? 'playing-card--red' : ''
      }`}
      key={`${card.rank}-${card.suit}-${index}`}
    >
      <span className="playing-card__rank">{card.rank}</span>
      <span className="playing-card__suit">{card.symbol}</span>
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
            onClick={() => setScreen(SCREEN.home)}
            type="button"
          >
            Home
          </button>
          <button
            className={screen === SCREEN.game ? 'active' : ''}
            onClick={() => setScreen(SCREEN.game)}
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
                onClick={() => setScreen(SCREEN.game)}
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
                <p className="hand__total">Total: {dealerTotal}</p>
              </div>
              <div className="cards">
                {dealerHand.map((card, index) => renderCard(card, index))}
              </div>
            </div>
            <div className="hand">
              <div className="hand__header">
                <p className="hand__label">You</p>
                <p className="hand__total">Total: {playerTotal}</p>
              </div>
              <div className="cards">
                {playerHand.map((card, index) => renderCard(card, index))}
              </div>
            </div>
          </section>

          <section className="card game__panel">
            <h2>Game controls</h2>
            <p className="muted">
              {statusMessage}
            </p>
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
                disabled={gameState === 'playerTurn'}
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
