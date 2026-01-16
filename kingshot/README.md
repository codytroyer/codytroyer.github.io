# Kingshot Labs

Kingshot Labs is a community-built collection of **strategy tools** for **Kingshot** players. The goal is to make the game’s decision-making more transparent and optimizable by providing calculators, planners, and utilities that are easy to understand and easy to share.

This is a static site hosted on GitHub Pages as part of `codytroyer.github.io`.

## Site URL

- Kingshot hub: `/kingshot/`
- Example: `https://codytroyer.github.io/kingshot/`

## What’s here

### Kingshot hub (`/kingshot/`)
A landing page that describes the project, lists tools, and provides basic navigation.

### Heroes Roster (`/kingshot/heroes/`)
A local-first roster editor so players can enter heroes once and reuse them across tools. It ships with a
default roster of 28 heroes, keeps rarity and hero type hardcoded per hero, and lets players quickly update
their levels, stars, and skill values.

- Data is stored locally in the browser using `localStorage`
- Export/Import JSON is supported for backup and transfer between devices
- No accounts, no server, and no credential collection
- A developer-only debug panel can be enabled by setting `localStorage.setItem("kingshot:heroes:debug", "1")`
