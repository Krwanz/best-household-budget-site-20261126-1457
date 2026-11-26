/* Marlowe Budget — household data.
   One job: the seed figures for November 2026, the category list, and
   loading/saving the household's edits in the browser (localStorage only).
   Every figure below is checked in the planner: income $5,815, planned
   spending + saving $5,415, planned leftover $400. */

'use strict';

const BUDGET_KEY = 'marlowe-budget-v1';
const EXPENSE_KEY = 'marlowe-expenses-v1';
const GOAL_KEY = 'marlowe-goals-v1';

/* Category order, colours (used by the donut) and which 50/30/20 bucket. */
const CATEGORIES = [
  { id: 'housing', name: 'Housing', color: '#145c3b', bucket: 'needs' },
  { id: 'groceries', name: 'Groceries', color: '#1d7a4f', bucket: 'needs' },
  { id: 'transport', name: 'Transport', color: '#2e9e6b', bucket: 'needs' },
  { id: 'utilities', name: 'Utilities', color: '#7fb069', bucket: 'needs' },
  { id: 'health', name: 'Health', color: '#4a7c59', bucket: 'needs' },
  { id: 'school', name: 'Kids & school', color: '#8ab17d', bucket: 'needs' },
  { id: 'dining', name: 'Dining out', color: '#c98a1b', bucket: 'wants' },
  { id: 'entertainment', name: 'Entertainment', color: '#e0a458', bucket: 'wants' },
  { id: 'clothing', name: 'Clothing', color: '#d9c27a', bucket: 'wants' },
  { id: 'personal', name: 'Personal', color: '#b08968', bucket: 'wants' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#a3b18a', bucket: 'wants' },
  { id: 'misc', name: 'Miscellaneous', color: '#6c757d', bucket: 'wants' },
  { id: 'savings', name: 'Savings', color: '#0b3d2e', bucket: 'savings' }
];

const BUCKET_LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' };

/* The Marlowe plan: monthly income and the planned amount per category. */
const DEFAULT_BUDGET = {
  income: [
    { id: 'alex', label: 'Alex — salary (teacher)', detail: 'Paid on the 1st', amount: 3200 },
    { id: 'sam', label: 'Sam — salary (nurse, part-time)', detail: 'Paid on the 15th', amount: 2100 },
    { id: 'freelance', label: 'Freelance design (Sam)', detail: 'Varies — budgeted low on purpose', amount: 480 },
    { id: 'interest', label: 'Savings interest', detail: 'High-yield account', amount: 35 }
  ],
  plan: {
    housing: 1650, groceries: 620, transport: 380, utilities: 240, health: 220,
    school: 260, dining: 180, entertainment: 150, clothing: 120, personal: 160,
    subscriptions: 85, misc: 150, savings: 1200
  }
};

/* What the family actually spent so far in November, as dated expenses. */
const DEFAULT_EXPENSES = [
  { id: 'e01', date: '2026-11-01', desc: 'November rent', cat: 'housing', amount: 1650 },
  { id: 'e02', date: '2026-11-02', desc: 'Weekly shop — GreenMart', cat: 'groceries', amount: 148.20 },
  { id: 'e03', date: '2026-11-03', desc: 'Bus passes (Alex + Sam)', cat: 'transport', amount: 96 },
  { id: 'e04', date: '2026-11-05', desc: 'Electricity bill', cat: 'utilities', amount: 132.40 },
  { id: 'e05', date: '2026-11-07', desc: 'Weekly shop — GreenMart', cat: 'groceries', amount: 131.75 },
  { id: 'e06', date: '2026-11-08', desc: 'Family dinner — noodle house', cat: 'dining', amount: 58.50 },
  { id: 'e07', date: '2026-11-09', desc: 'Kids school lunches (week)', cat: 'school', amount: 62 },
  { id: 'e08', date: '2026-11-10', desc: 'Fuel — family car', cat: 'transport', amount: 54.30 },
  { id: 'e09', date: '2026-11-12', desc: 'Pharmacy — allergy medicine', cat: 'health', amount: 41.90 },
  { id: 'e10', date: '2026-11-13', desc: 'Streaming + music subscriptions', cat: 'subscriptions', amount: 42.97 },
  { id: 'e11', date: '2026-11-14', desc: 'Weekly shop — GreenMart', cat: 'groceries', amount: 122.10 },
  { id: 'e12', date: '2026-11-15', desc: 'Payday transfer to savings', cat: 'savings', amount: 1200 },
  { id: 'e13', date: '2026-11-16', desc: 'School trip — Mia', cat: 'school', amount: 85 },
  { id: 'e14', date: '2026-11-17', desc: 'Internet bill', cat: 'utilities', amount: 79 },
  { id: 'e15', date: '2026-11-18', desc: 'Cinema — family film night', cat: 'entertainment', amount: 46 },
  { id: 'e16', date: '2026-11-19', desc: 'Dentist check-up — Leo', cat: 'health', amount: 95 },
  { id: 'e17', date: '2026-11-20', desc: 'Winter jackets (2, on sale)', cat: 'clothing', amount: 74 },
  { id: 'e18', date: '2026-11-21', desc: 'Weekly shop — GreenMart', cat: 'groceries', amount: 109.85 },
  { id: 'e19', date: '2026-11-22', desc: 'Takeaway — pizza night', cat: 'dining', amount: 34.75 },
  { id: 'e20', date: '2026-11-23', desc: 'Fuel — family car', cat: 'transport', amount: 48.60 },
  { id: 'e21', date: '2026-11-24', desc: 'School supplies — art class', cat: 'school', amount: 84 },
  { id: 'e22', date: '2026-11-25', desc: 'Birthday gift — Grandma', cat: 'misc', amount: 52 },
  { id: 'e23', date: '2026-11-25', desc: 'Haircuts (Sam + Mia)', cat: 'personal', amount: 68 },
  { id: 'e24', date: '2026-11-26', desc: 'Board game — family night', cat: 'entertainment', amount: 32.50 },
  { id: 'e25', date: '2026-11-26', desc: 'Pharmacy — vitamins', cat: 'health', amount: 47.10 },
  { id: 'e26', date: '2026-11-26', desc: 'Cloud storage + apps', cat: 'subscriptions', amount: 42.03 },
  { id: 'e27', date: '2026-11-26', desc: 'Snacks + stationery top-up', cat: 'misc', amount: 40 }
];

const DEFAULT_GOALS = [
  { id: 'emergency', name: 'Emergency fund', target: 9000, saved: 6250, note: 'One month of essential spending, then three. $700 a month on payday.', monthly: 700 },
  { id: 'holiday', name: 'Family holiday — coast trip', target: 2400, saved: 1480, note: 'July 2027: a week by the sea. $250 a month on payday.', monthly: 250 },
  { id: 'car', name: 'Next car — down payment', target: 6000, saved: 2150, note: 'The old car is 11 years old. $150 a month on payday.', monthly: 150 },
  { id: 'home', name: 'Home repairs', target: 1500, saved: 900, note: 'Roof patch and a new washing machine. $100 a month on payday.', monthly: 100 }
];

const UPCOMING_BILLS = [
  { label: 'Water bill', due: 'Nov 28', amount: 64.20 },
  { label: 'Phone plans (2)', due: 'Nov 29', amount: 88 },
  { label: 'Home insurance (monthly)', due: 'Nov 30', amount: 74.50 },
  { label: 'December rent', due: 'Dec 1', amount: 1650 },
  { label: 'Electricity (December estimate)', due: 'Dec 5', amount: 128 }
];

function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode: edits last for the visit */ }
}

function categoryById(id) {
  return CATEGORIES.find(function (c) { return c.id === id; }) || CATEGORIES[0];
}

function money(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function money0(n) {
  return '$' + Math.round(Number(n)).toLocaleString('en-US');
}
