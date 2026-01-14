# Telegram Mini App Blackjack (Frontend)

A lightweight React + Vite starter for a Telegram Mini App that will host a Blackjack game.
This repo focuses on the initial UI structure and Telegram WebApp integration.

## Features

- React + Vite front-end scaffolding
- Telegram Mini App SDK integration via `@twa-dev/sdk`
- Home screen with Telegram user info
- Game screen with placeholder Blackjack table and controls

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Telegram Mini App Notes

- The app expects to be loaded inside Telegram to access real user data.
- When run locally in a browser, a placeholder user will be shown.
- Connect the app to your bot and register it as a Mini App to test within Telegram.

## Next Steps

- Wire up Blackjack game state and rules
- Add betting flow and animations
- Connect to a backend for multiplayer tables
