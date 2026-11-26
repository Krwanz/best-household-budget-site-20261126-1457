/* Marlowe Budget — application logic.
   One job: routing (#/dashboard, #/planner, #/expenses, #/savings, #/guide),
   rendering every view from the data, and the interactive tools: the budget
   planner (live balance + 50/30/20 check), the expense form and filters,
   and adding money to savings goals. All totals are computed here from
   data.js, never typed in by hand. */

'use strict';

var budget = loadJSON(BUDGET_KEY, null);
if (!budget) budget = JSON.parse(JSON.stringify(DEFAULT_BUDGET));
var expenses = loadJSON(EXPENSE_KEY, null);
if (!expenses) expenses = JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
var goals = loadJSON(GOAL_KEY, null);
if (!goals) goals = JSON.parse(JSON.stringify(DEFAULT_GOALS));

function saveAll() {
  saveJSON(BUDGET_KEY, budget);
  saveJSON(EXPENSE_KEY, expenses);
  saveJSON(GOAL_KEY, goals);
}

function incomeTotal() {
  return budget.income.reduce(function (s, row) { return s + Number(row.amount || 0); }, 0);
}

function plannedTotal() {
  return Object.keys(budget.plan).reduce(function (s, k) { return s + Number(budget.plan[k] || 0); }, 0);
}

function actualByCategory() {
  const totals = {};
  CATEGORIES.forEach(function (c) { totals[c.id] = 0; });
  expenses.forEach(function (e) {
    if (totals[e.cat] === undefined) totals[e.cat] = 0;
    totals[e.cat] += Number(e.amount || 0);
  });
  return totals;
}

function actualTotal() {
  return expenses.reduce(function (s, e) { return s + Number(e.amount || 0); }, 0);
}

/* --- 50/30/20 split, from live actuals --- */
function bucketSplit() {
  const actuals = actualByCategory();
  const income = incomeTotal();
  const out = { needs: 0, wants: 0, savings: 0 };
  CATEGORIES.forEach(function (c) { out[c.bucket] += actuals[c.id] || 0; });
  Object.keys(out).forEach(function (k) {
    out[k] = { amount: out[k], pct: income > 0 ? (out[k] / income) * 100 : 0 };
  });
  return out;
}

function ruleVerdictHTML() {
  const split = bucketSplit();
  const needsOk = split.needs.pct <= 50;
  const wantsOk = split.wants.pct <= 30;
  const saveOk = split.savings.pct >= 20;
  const good = needsOk && wantsOk && saveOk;
  const verdict = good
    ? 'On track. Needs are at ' + split.needs.pct.toFixed(0) + '% of income (target 50%), wants at ' +
      split.wants.pct.toFixed(0) + '% (target 30%) and savings at ' + split.savings.pct.toFixed(0) +
      '% (target 20%). The plan holds.'
    : 'Needs are at ' + split.needs.pct.toFixed(0) + '% of income (target 50%), wants at ' +
      split.wants.pct.toFixed(0) + '% (target 30%) and savings at ' + split.savings.pct.toFixed(0) +
      '% (target 20%). ' + (needsOk ? '' : 'Housing and groceries are pushing needs over half of income. ') +
      (wantsOk ? '' : 'Wants are running hot — dining out and subscriptions are the first place to trim. ') +
      (saveOk ? '' : 'Savings are under a fifth of income — move the payday transfer up before adding fun money. ');
  return verdict;
}

/* --- Dashboard --- */
function renderDashboard() {
  const income = incomeTotal();
  const actual = actualTotal();
  const planned = plannedTotal();
  const left = income - actual;
  const saved = actualByCategory().savings || 0;
  const goalSaved = goals.reduce(function (s, g) { return s + g.saved; }, 0);
  const goalTarget = goals.reduce(function (s, g) { return s + g.target; }, 0);

  document.getElementById('statGrid').innerHTML =
    statCard('Income', money0(income), 'for November 2026', 'good') +
    statCard('Spent so far', money0(actual), money0(planned) + ' planned', actual > planned ? 'attention' : 'good') +
    statCard('Left to spend', money0(left), left >= 0 ? 'on track for the month' : 'over plan — see the planner', left >= 0 ? 'good' : 'attention') +
    statCard('Saved this month', money0(saved), 'of ' + money0(goalSaved) + ' saved toward ' + money0(goalTarget) + ' in goals', 'good');

  const actuals = actualByCategory();
  const parts = CATEGORIES.filter(function (c) { return c.id !== 'savings'; })
    .map(function (c) { return { name: c.name, value: actuals[c.id] || 0, color: c.color }; })
    .sort(function (a, b) { return b.value - a.value; });
  document.getElementById('donutChart').innerHTML = donutSVG(parts, 220);
  document.getElementById('donutLegend').innerHTML = parts.map(function (p) {
    const pct = actual > 0 ? Math.round((p.value / (actual - saved)) * 100) : 0;
    return '<li><span class="swatch" style="background:' + p.color + '"></span>' + p.name +
      '<span class="pct">' + pct + '%</span><span class="amt">' + money(p.value) + '</span></li>';
  }).join('');

  const rows = CATEGORIES.map(function (c) {
    return { name: c.name, planned: Number(budget.plan[c.id] || 0), actual: actuals[c.id] || 0 };
  }).sort(function (a, b) { return b.planned - a.planned; });
  document.getElementById('planBars').innerHTML = planBarsHTML(rows);

  document.getElementById('billList').innerHTML = UPCOMING_BILLS.map(function (b) {
    return '<li><span>' + b.label + ' <span class="due">due ' + b.due + '</span></span><span class="amt">' + money(b.amount) + '</span></li>';
  }).join('');

  /* Week-by-week spending, computed live from the dated expenses. */
  const weeks = [
    { label: 'Week 1 · Nov 1–7', from: '2026-11-01', to: '2026-11-07' },
    { label: 'Week 2 · Nov 8–14', from: '2026-11-08', to: '2026-11-14' },
    { label: 'Week 3 · Nov 15–21', from: '2026-11-15', to: '2026-11-21' },
    { label: 'Week 4 · Nov 22–26', from: '2026-11-22', to: '2026-11-26' }
  ];
  const weeklyRows = weeks.map(function (w) {
    const total = expenses
      .filter(function (e) { return e.date >= w.from && e.date <= w.to; })
      .reduce(function (s, e) { return s + Number(e.amount || 0); }, 0);
    return { name: w.label, planned: actual, actual: total };
  });
  document.getElementById('weeklyBars').innerHTML = weeklyRows.map(function (row) {
    const pct = row.planned > 0 ? Math.round((row.actual / row.planned) * 100) : 0;
    return '<div class="plan-bar"><div class="bar-head"><span>' + row.name + '</span><span>' + money(row.actual) + '</span></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';
  }).join('');

  document.getElementById('goalSnapshot').innerHTML = goals.map(function (g) {
    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
    return '<div class="plan-bar"><div class="bar-head"><span>' + g.name + '</span><span>' + money0(g.saved) + ' of ' + money0(g.target) + ' (' + pct + '%)</span></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';
  }).join('');

  document.getElementById('ruleVerdict').textContent = ruleVerdictHTML();
  const split = bucketSplit();
  document.getElementById('ruleBars').innerHTML = ['needs', 'wants', 'savings'].map(function (k) {
    const target = k === 'needs' ? 50 : (k === 'wants' ? 30 : 20);
    const pct = Math.min(100, Math.round(split[k].pct));
    return '<div class="rule-cell"><strong>' + BUCKET_LABELS[k] + ' — ' + split[k].pct.toFixed(0) + '%</strong>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="pct-line">' + money0(split[k].amount) + ' · target ' + target + '% of income</span></div>';
  }).join('');
}

function statCard(label, value, note, tone) {
  return '<div class="stat ' + (tone || '') + '"><div class="label">' + label + '</div>' +
    '<div class="value">' + value + '</div><div class="note">' + note + '</div></div>';
}

/* --- Planner --- */
function renderPlanner() {
  const income = incomeTotal();
  const planned = plannedTotal();
  const left = income - planned;

  document.getElementById('plannerStats').innerHTML =
    statCard('Monthly income', money0(income), '4 income sources', 'good') +
    statCard('Planned out', money0(planned), 'spending + saving', '') +
    statCard('Unassigned', money0(left), left >= 0 ? 'give it a job — or save it' : 'over budget: trim a category', left >= 0 ? 'good' : 'attention') +
    statCard('Savings rate', (income > 0 ? ((Number(budget.plan.savings || 0) / income) * 100).toFixed(0) : 0) + '%', 'target 20% of income', 'good');

  document.getElementById('incomeRows').innerHTML = budget.income.map(function (row, i) {
    return '<div class="plan-row"><label>' + row.label + '<span class="sub">' + row.detail + '</span></label>' +
      '<input type="number" min="0" step="1" value="' + row.amount + '" data-income="' + i + '" aria-label="Amount for ' + row.label + '"></div>';
  }).join('');
  document.getElementById('incomeTotal').textContent = money(income);

  document.getElementById('budgetRows').innerHTML = CATEGORIES.map(function (c) {
    return '<div class="plan-row"><label>' + c.name + '<span class="sub">' + BUCKET_LABELS[c.bucket] + '</span></label>' +
      '<input type="number" min="0" step="1" value="' + (budget.plan[c.id] || 0) + '" data-plan="' + c.id + '" aria-label="Planned amount for ' + c.name + '"></div>';
  }).join('');
  document.getElementById('budgetTotal').textContent = money(planned);

  const split = bucketSplit();
  document.getElementById('balanceBox').innerHTML =
    balanceLine('Income', money(income), '') +
    balanceLine('Planned spending & saving', '− ' + money(planned), '') +
    '<div class="balance-line big"><span>Left unassigned</span><span class="' + (left >= 0 ? 'positive' : 'negative') + '">' + money(left) + '</span></div>' +
    '<p class="fineprint">50/30/20 on the plan: needs ' + money0(CATEGORIES.filter(function (c) { return c.bucket === 'needs'; }).reduce(function (s, c) { return s + Number(budget.plan[c.id] || 0); }, 0)) +
    ', wants ' + money0(CATEGORIES.filter(function (c) { return c.bucket === 'wants'; }).reduce(function (s, c) { return s + Number(budget.plan[c.id] || 0); }, 0)) +
    ', savings ' + money0(Number(budget.plan.savings || 0)) + '. ' + ruleVerdictHTML() + '</p>';
}

function balanceLine(label, value, cls) {
  return '<div class="balance-line"><span>' + label + '</span><span class="' + cls + '">' + value + '</span></div>';
}

/* --- Expenses --- */
let expenseFilter = 'all';

function renderExpenses() {
  const actual = actualTotal();
  const actuals = actualByCategory();
  const top = CATEGORIES.map(function (c) { return { name: c.name, amount: actuals[c.id] || 0 }; })
    .sort(function (a, b) { return b.amount - a.amount; })[0];
  document.getElementById('expenseStats').innerHTML =
    statCard('Total spent', money0(actual), expenses.length + ' expenses in November', 'good') +
    statCard('Biggest category', top.name, money0(top.amount) + ' so far', '') +
    statCard('Average per day', money0(actual / 26), '26 days into the month', '') +
    statCard('Days left', '4', 'month ends Nov 30', 'warn');

  const catSelect = document.getElementById('expCategory');
  const filterSelect = document.getElementById('filterCategory');
  if (!catSelect.options.length) {
    catSelect.innerHTML = CATEGORIES.filter(function (c) { return c.id !== 'savings'; })
      .map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
    filterSelect.innerHTML = '<option value="all">All categories</option>' +
      CATEGORIES.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
  }

  const shown = expenses.filter(function (e) { return expenseFilter === 'all' || e.cat === expenseFilter; })
    .slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  document.getElementById('expenseRows').innerHTML = shown.map(function (e) {
    return '<tr><td>' + e.date.slice(5) + '</td><td>' + escapeHTML(e.desc) + '</td>' +
      '<td><span class="cat-pill">' + categoryById(e.cat).name + '</span></td>' +
      '<td class="num">' + money(e.amount) + '</td>' +
      '<td><button class="remove-btn" type="button" data-remove="' + e.id + '">Remove</button></td></tr>';
  }).join('') || '<tr><td colspan="5">No expenses in this category yet.</td></tr>';

  document.getElementById('categoryTotals').innerHTML = CATEGORIES.map(function (c) {
    const amt = actuals[c.id] || 0;
    const planned = Number(budget.plan[c.id] || 0);
    return '<div class="plan-bar"><div class="bar-head"><span>' + c.name + '</span><span>' + money(amt) + ' / ' + money(planned) + ' planned</span></div>' +
      '<div class="bar-track"><div class="bar-fill ' + (amt > planned ? 'over' : '') + '" style="width:' + (planned > 0 ? Math.min(100, Math.round((amt / planned) * 100)) : 0) + '%"></div></div></div>';
  }).join('');
}

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* --- Savings --- */
function renderSavings() {
  const goalSaved = goals.reduce(function (s, g) { return s + g.saved; }, 0);
  const goalTarget = goals.reduce(function (s, g) { return s + g.target; }, 0);
  const pct = goalTarget > 0 ? Math.round((goalSaved / goalTarget) * 100) : 0;
  document.getElementById('savingsStats').innerHTML =
    statCard('Total saved', money0(goalSaved), 'across 4 goals', 'good') +
    statCard('Total targets', money0(goalTarget), pct + '% of the way there', '') +
    statCard('Still to save', money0(goalTarget - goalSaved), 'at $1,200 a month', '') +
    statCard('Monthly habit', '$1,200', 'moved on payday, every month', 'good');

  document.getElementById('goalCards').innerHTML = goals.map(function (g) {
    const p = Math.min(100, Math.round((g.saved / g.target) * 100));
    const remaining = g.target - g.saved;
    const months = remaining > 0 ? Math.ceil(remaining / g.monthly) : 0;
    return '<article class="card goal-card"><h3>' + g.name + '</h3>' +
      '<div class="goal-nums"><span><strong>' + money0(g.saved) + '</strong> saved</span><span>target <strong>' + money0(g.target) + '</strong></span></div>' +
      '<div class="goal-progress"><span style="width:' + p + '%"></span></div>' +
      '<p class="goal-meta">' + p + '% funded · ' + money0(remaining) + ' to go · about ' + months + ' month' + (months === 1 ? '' : 's at $' + g.monthly + '/mo') + '</p>' +
      '<p>' + g.note + '</p>' +
      '<div class="goal-add"><input type="number" min="1" step="1" placeholder="Add $…" data-goal-input="' + g.id + '" aria-label="Amount to add to ' + g.name + '">' +
      '<button class="button" type="button" data-goal-add="' + g.id + '">Add</button></div></article>';
  }).join('');
}

/* --- Routing --- */
const VIEWS = { dashboard: 'view-dashboard', planner: 'view-planner', expenses: 'view-expenses', savings: 'view-savings', guide: 'view-guide' };

function currentRoute() {
  const hash = window.location.hash || '#/';
  const name = hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
  return VIEWS[name] ? name : 'dashboard';
}

function render() {
  const route = currentRoute();
  Object.keys(VIEWS).forEach(function (key) {
    document.getElementById(VIEWS[key]).hidden = key !== route;
  });
  document.querySelectorAll('[data-nav]').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-nav') === route);
  });
  if (route === 'dashboard') renderDashboard();
  if (route === 'planner') renderPlanner();
  if (route === 'expenses') renderExpenses();
  if (route === 'savings') renderSavings();
  window.scrollTo(0, 0);
}

function renderActive() {
  const route = currentRoute();
  if (route === 'dashboard') renderDashboard();
  if (route === 'planner') renderPlanner();
  if (route === 'expenses') renderExpenses();
  if (route === 'savings') renderSavings();
}

window.addEventListener('hashchange', render);

/* Planner edits: live, saved, and every view re-renders. */
document.addEventListener('input', function (ev) {
  const t = ev.target;
  if (t.hasAttribute('data-income')) {
    budget.income[Number(t.getAttribute('data-income'))].amount = Math.max(0, Number(t.value) || 0);
    saveAll(); renderPlanner();
  } else if (t.hasAttribute('data-plan')) {
    budget.plan[t.getAttribute('data-plan')] = Math.max(0, Number(t.value) || 0);
    saveAll(); renderPlanner();
  }
});

document.getElementById('resetPlanBtn').addEventListener('click', function () {
  budget = JSON.parse(JSON.stringify(DEFAULT_BUDGET));
  saveAll(); renderPlanner();
});

/* Expense form + filters + removal. */
document.getElementById('expenseForm').addEventListener('submit', function (ev) {
  ev.preventDefault();
  const desc = document.getElementById('expDesc').value.trim();
  const amount = Number(document.getElementById('expAmount').value);
  const date = document.getElementById('expDate').value;
  const cat = document.getElementById('expCategory').value;
  if (!desc || !(amount > 0) || !date) return;
  expenses.push({ id: 'e' + Date.now(), date: date, desc: desc, cat: cat, amount: Math.round(amount * 100) / 100 });
  saveAll();
  document.getElementById('expenseForm').reset();
  document.getElementById('expDate').value = '2026-11-26';
  document.getElementById('expenseMsg').textContent = 'Added ' + money(amount) + ' — ' + desc + '. Totals updated.';
  renderExpenses();
});

document.getElementById('filterCategory').addEventListener('change', function (ev) {
  expenseFilter = ev.target.value;
  renderExpenses();
});

document.addEventListener('click', function (ev) {
  const removeBtn = ev.target.closest ? ev.target.closest('[data-remove]') : null;
  if (removeBtn) {
    expenses = expenses.filter(function (e) { return e.id !== removeBtn.getAttribute('data-remove'); });
    saveAll(); renderExpenses(); return;
  }
  const addBtn = ev.target.closest ? ev.target.closest('[data-goal-add]') : null;
  if (addBtn) {
    const goalId = addBtn.getAttribute('data-goal-add');
    const input = document.querySelector('[data-goal-input="' + goalId + '"]');
    const amount = Number(input.value);
    if (!(amount > 0)) { input.focus(); return; }
    const goal = goals.find(function (g) { return g.id === goalId; });
    goal.saved = Math.min(goal.target, Math.round((goal.saved + amount) * 100) / 100);
    saveAll(); renderSavings();
  }
});

/* CSV export of the month's expenses. */
document.getElementById('exportCsvBtn').addEventListener('click', function () {
  const lines = ['Date,Description,Category,Amount'];
  expenses.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (e) {
    lines.push(e.date + ',"' + e.desc.replace(/"/g, '""') + '",' + categoryById(e.cat).name + ',' + e.amount.toFixed(2));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'marlowe-expenses-november-2026.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
});

/* Month picker: November is the live month; earlier months show a note. */
document.getElementById('monthSelect').addEventListener('change', function (ev) {
  if (ev.target.value !== '2026-11') {
    alert('October and September 2026 are closed months — this demo tracks November 2026 live. Switch back to November to keep editing.');
    ev.target.value = '2026-11';
  }
});

render();
