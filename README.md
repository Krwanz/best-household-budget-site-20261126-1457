[![Competition](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![Rank](https://make.fun/badge/best-household-budget-site-20261126-1457/Krwanz/best-household-budget-site-20261126-1457/rank.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![Reward](https://make.fun/badge/best-household-budget-site-20261126-1457/Krwanz/best-household-budget-site-20261126-1457/reward.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)

# Marlowe Budget — Make the best household budget site

A working household budget site for the fictional Marlowe family (two incomes, two kids, November 2026), entered in the [make.fun bounty](https://make.fun/c/best-household-budget-site-20261126-1457). Static files only — no build step, no network requests, no framework. Open `app/index.html` in a browser or serve `app/` with `node serve.ts` (http://localhost:8080).

## What it does

- **Dashboard** — income, spent, left to spend and savings at a glance; a donut chart of spending by category; planned-vs-actual bars; upcoming bills; savings snapshot; a live 50/30/20 check.
- **Budget Planner** — edit income and every planned category; the monthly balance, savings rate and 50/30/20 split update as you type and save automatically in the browser.
- **Expense Tracker** — 27 dated November expenses, add your own, filter by category, remove entries, and download the month as CSV.
- **Savings Goals** — four goals (emergency fund, family holiday, next car, home repairs) with progress bars, months-to-finish and add-money controls.
- **Budget Guide** — five habits and a FAQ, written for a real family keeping a real budget.

## The numbers (all computed live, verified)

- Income: $5,815/mo — Alex $3,200 + Sam $2,100 + freelance $480 + interest $35
- Planned: $5,415/mo, leaving $400 unassigned
- Spent so far: $4,677.95 across 27 expenses; savings rate 20.6%

## Layout

- `app/index.html` — the five pages (hash routes: `#/`, `#/planner`, `#/expenses`, `#/savings`, `#/guide`)
- `app/data.js` — seed figures, categories, bills, goals, browser storage
- `app/charts.js` — donut and plan-bar SVG charts
- `app/app.js` — routing, rendering and every interactive tool
- `app/style.css` — the whole design, responsive down to a phone
- `main.ts` — copies `app/` + `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 3 real renders of the site running (desktop dashboard, desktop planner, phone expenses)
