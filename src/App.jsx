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

function App() {
  const [screen, setScreen] = useState(SCREEN.home)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  const user = useMemo(() => {
    return WebApp.initDataUnsafe?.user ?? placeholderUser
  }, [])

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
              <p className="hand__label">Dealer</p>
              <div className="cards">
                <div className="card__placeholder" />
                <div className="card__placeholder" />
              </div>
            </div>
            <div className="hand">
              <p className="hand__label">You</p>
              <div className="cards">
                <div className="card__placeholder" />
                <div className="card__placeholder" />
              </div>
            </div>
          </section>

          <section className="card game__panel">
            <h2>Game controls</h2>
            <p className="muted">
              The Blackjack table is warming up. Soon you will be able to hit,
              stand, and place bets.
            </p>
            <div className="actions">
              <button className="secondary" type="button">
                Hit
              </button>
              <button className="secondary" type="button">
                Stand
              </button>
              <button className="primary" type="button">
                Place bet
              </button>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
