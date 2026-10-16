(() => {
  'use strict';

  const STORAGE_KEY = 'abc-operations-prototype-v1';
  const useCases = ['orderguard', 'lineguard', 'matchfix', 'shipmentguard', 'payhold'];
  const labels = {
    orderguard: 'OrderGuard', lineguard: 'LineGuard', matchfix: 'MatchFix',
    shipmentguard: 'ShipmentGuard', payhold: 'PayHold'
  };
  const topics = {
    orderguard: ['order/approved/v1', 'customer/promise-updated/v1'],
    lineguard: ['maintenance/order-created/v1'],
    matchfix: ['invoice/decision/v1', 'invoice/status/v1'],
    shipmentguard: ['customer/eta-updated/v1', 'shipment/reroute/v1'],
    payhold: ['payment/hold-confirmed/v1']
  };
  const defaultFeed = [
    '10:02  Invoice 5100098772 from Verpack GmbH is on hold: price 15% above PO 4500081233. AP is reviewing. You will be told when it is resolved.',
    '09:48  Invoice 5100098765 from Packaging Supplier A released, payment on 24 Oct.'
  ];
  const makeEntry = (status = 'waiting') => ({
    status, selectedOption: 0, gates: {}, confirmations: [], feed: [], log: [], decidedAt: '', watching: false
  });
  const defaultState = () => ({
    orderguard: makeEntry(),
    lineguard: { ...makeEntry(), countdownStarted: Date.now() },
    matchfix: { ...makeEntry(), feed: [...defaultFeed], reviewed: [] },
    shipmentguard: { ...makeEntry(), gates: { customer: 'pending', logistics: 'pending' } },
    payhold: { ...makeEntry('held'), confirmations: [], countdownStarted: Date.now() }
  });

  let state = loadState();
  let toastTimer;
  let currentScenario = null;
  let scenarioTimer = null;
  const app = document.getElementById('app');
  const views = Object.fromEntries([...document.querySelectorAll('.app-view')].map(view => [view.dataset.view, view]));
  const pristine = Object.fromEntries(Object.entries(views).map(([key, view]) => [key, view.innerHTML]));

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return defaultState();
      const base = defaultState();
      useCases.forEach(key => {
        base[key] = { ...base[key], ...saved[key] };
        base[key].gates = { ...base[key].gates, ...(saved[key]?.gates || {}) };
        base[key].log = Array.isArray(saved[key]?.log) ? saved[key].log : [];
      });
      return base;
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function time() {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
  }

  function addLog(key, eventName) {
    state[key].log.push({ event: eventName, time: time() });
  }

  function toast(message, kind = '') {
    const el = document.getElementById('app-toast');
    clearTimeout(toastTimer);
    el.textContent = message;
    el.className = `toast show ${kind}`;
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
  }

  function pending(key) {
    if (key === 'payhold') return state[key].status === 'held';
    return ['waiting', 'held'].includes(state[key].status);
  }

  function route() {
    const requested = (location.hash || '#home').slice(1).toLowerCase();
    const key = views[requested] ? requested : 'home';
    Object.entries(views).forEach(([name, view]) => { view.hidden = name !== key; });
    if (key === 'home') renderHome(); else renderDetail(key);
    document.title = key === 'home' ? 'ABC Operations' : `${labels[key]} | ABC Operations`;
    window.scrollTo(0, 0);
  }

  function restoreView(key) {
    views[key].innerHTML = pristine[key];
    views[key].querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
  }

  function enhanceShell(view, key) {
    const right = view.querySelector('.shell .right');
    const searchIcon = view.querySelector('.i-search')?.parentElement;
    const bellIcon = view.querySelector('.i-bell')?.parentElement;
    const homeName = view.querySelector('.home');
    if (homeName) {
      homeName.setAttribute('role', 'button');
      homeName.tabIndex = 0;
      homeName.dataset.action = key === 'home' ? 'home-menu' : 'go-home';
      homeName.setAttribute('aria-label', key === 'home' ? 'Home menu' : 'Go to My Home');
    }
    if (searchIcon) {
      searchIcon.setAttribute('role', 'button'); searchIcon.tabIndex = 0;
      searchIcon.dataset.action = 'open-search'; searchIcon.setAttribute('aria-label', 'Search');
    }
    if (bellIcon) {
      bellIcon.setAttribute('role', 'button'); bellIcon.tabIndex = 0;
      bellIcon.dataset.action = 'notifications'; bellIcon.setAttribute('aria-label', 'Notifications');
    }
    if (right && !right.querySelector('.gear-btn')) {
      const gear = document.createElement('button');
      gear.className = 'gear-btn'; gear.dataset.action = 'controls';
      gear.setAttribute('aria-label', 'Prototype controls'); gear.textContent = '⚙';
      right.insertBefore(gear, right.querySelector('.avatar'));
    }
    view.querySelectorAll('.nav .tab').forEach(tab => {
      tab.setAttribute('role', 'button'); tab.tabIndex = 0;
      const label = tab.textContent.trim();
      tab.dataset.action = label === 'My Home' ? 'go-home' : label === 'Approvals' ? 'approvals' : 'not-in-prototype';
    });
    const main = view.querySelector('main');
    if (main) main.id = 'main-content';
  }

  function renderHome() {
    restoreView('home');
    const view = views.home;
    enhanceShell(view, 'home');
    const cards = [...view.querySelectorAll('.todo')];
    const cardKeys = ['orderguard', 'payhold', 'lineguard', 'matchfix', 'shipmentguard'];
    cards.forEach((card, index) => {
      const key = cardKeys[index];
      card.dataset.case = key;
      const title = card.querySelector('.title');
      title.setAttribute('role', 'link'); title.tabIndex = 0; title.dataset.route = key;
      const buttons = [...card.querySelectorAll('.sbtn')];
      buttons.forEach((button, i) => { button.dataset.quick = `${key}:${i}`; });
      if (!pending(key)) card.hidden = true;
    });

    const waiting = useCases.filter(pending).length;
    const proposalTab = view.querySelector('.tabs span');
    proposalTab.textContent = `Agent proposals (${waiting})`;
    [...view.querySelectorAll('.tabs span')].forEach((tab, i) => {
      tab.setAttribute('role', 'button'); tab.tabIndex = 0;
      tab.dataset.homeTab = ['proposals', 'tasks', 'situations'][i];
    });
    const cardsContainer = view.querySelector('.cards');
    if (!waiting) cardsContainer.innerHTML = '<div class="empty-state"><b>No proposals are waiting.</b><span>Agent decisions completed today are listed below.</span></div>';

    const done = useCases.filter(key => !pending(key));
    if (done.length) {
      const doneSection = document.createElement('div');
      doneSection.className = 'done-today';
      doneSection.innerHTML = `<button class="done-toggle" data-action="toggle-done" aria-expanded="false">Done today (${done.length}) <span>⌄</span></button><div class="done-list" hidden>${done.map(key => `<button data-route="${key}"><b>${labels[key]}</b><span>${statusText(key)} · ${state[key].decidedAt || 'today'}</span></button>`).join('')}</div>`;
      cardsContainer.after(doneSection);
    }

    const tiles = [...view.querySelectorAll('.tile .tv')];
    tiles[0].textContent = String(waiting);
    tiles[2].textContent = String(6 + (state.matchfix.status === 'released' ? 1 : 0));
    tiles[3].innerHTML = state.orderguard.status === 'approved' ? '€250.4<small>K</small>' : '€212<small>K</small>';
    tiles[4].textContent = state.payhold.status === 'released' ? '1' : '2';
    tiles[5].textContent = state.lineguard.failed ? '1' : '0';

    const homeTabs = view.querySelector('.tabs');
    homeTabs.insertAdjacentHTML('afterend', '<div class="home-list" id="home-list" hidden></div>');
    view.querySelectorAll('.hsec .r span').forEach(el => {
      el.setAttribute('role', 'button'); el.tabIndex = 0; el.dataset.action = 'not-in-prototype';
    });
    view.querySelectorAll('.pg').forEach(el => {
      el.setAttribute('role', 'button'); el.tabIndex = 0; el.dataset.action = 'not-in-prototype';
    });
    addSearch(view);
  }

  function statusText(key) {
    const value = state[key].status;
    const map = { approved: 'Approved', rejected: 'Rejected', released: 'Released', held: 'Held', waiting: 'Waiting' };
    if (state[key].watching) return 'Watching';
    return map[value] || value;
  }

  function addSearch(view) {
    const shell = view.querySelector('.shell');
    if (shell.querySelector('.shell-search')) return;
    shell.insertAdjacentHTML('beforeend', '<form class="shell-search" role="search" hidden><label for="global-search">Search business objects</label><input id="global-search" type="search" placeholder="Order, invoice, shipment or run number"><button type="submit">Go</button><button type="button" data-action="close-search" aria-label="Close search">×</button></form>');
  }

  function renderDetail(key) {
    restoreView(key);
    const view = views[key];
    enhanceShell(view, key);
    addSearch(view);
    addTitleActions(view, key);
    bindOptions(view, key);
    renderProcess(view, key);
    renderUseCaseContent(view, key);
    renderFooter(view, key);
  }

  function addTitleActions(view, key) {
    const titleBlock = view.querySelector('.hdr .top > div');
    if (!titleBlock) return;
    const actions = document.createElement('div');
    actions.className = 'title-actions';
    actions.innerHTML = `<button data-dialog="architecture" data-case="${key}">Architecture</button><button data-dialog="eventlog" data-case="${key}">Event log <span class="log-count">${state[key].log.length}</span></button>`;
    titleBlock.appendChild(actions);
  }

  function bindOptions(view, key) {
    const options = [...view.querySelectorAll('.opt')];
    options.forEach((option, index) => {
      const input = option.querySelector('input');
      input.value = String(index);
      input.dataset.optionCase = key;
      input.checked = state[key].selectedOption === index;
      option.classList.toggle('sel', input.checked);
    });
  }

  function renderProcess(view, key) {
    const entry = state[key];
    const waitingNode = view.querySelector('.node.wait');
    if (!waitingNode) return;
    if (key === 'lineguard' && entry.watching) {
      waitingNode.querySelector('.st').textContent = 'Watching';
      waitingNode.querySelector('.t').textContent = entry.decidedAt || 'now';
      return;
    }
    const completed = !pending(key) || (key === 'shipmentguard' && Object.values(entry.gates).every(v => v === 'approved'));
    if (!completed) return;
    waitingNode.classList.remove('wait');
    waitingNode.classList.add(entry.status === 'rejected' ? 'rejected' : 'done');
    waitingNode.querySelector('.st').textContent = entry.status === 'rejected' ? 'Rejected by you' : 'Approved by you';
    waitingNode.querySelector('.t').textContent = entry.decidedAt || time();
    let next = view.querySelector('.node.next');
    if (!next && key !== 'payhold') {
      next = document.createElement('div');
      next.className = 'node ev generated-next';
      next.innerHTML = '<div class="t">after</div><div class="n">Decision event</div><div class="d">Subscribers receive the outcome</div><div class="st">Event published on AEM</div>';
      view.querySelector('.trail')?.appendChild(next);
    } else if (next) {
      next.classList.remove('next'); next.classList.add('ev');
      next.querySelector('.st').textContent = entry.status === 'rejected' ? 'Rejected, nothing posted' : 'Event published on AEM';
    }
  }

  function renderUseCaseContent(view, key) {
    const entry = state[key];
    if (key === 'orderguard' && entry.status === 'approved') {
      appendResult(view.querySelector('.msg'), `Sent to Retail chain North, CRM updated · ${entry.decidedAt}`);
    }
    if (key === 'lineguard') {
      if (entry.status === 'approved') appendResult(view.querySelector('.block'), 'PM order 40002217 created, part reserved at Plant 1200, M. Novak booked 04:00 to 05:30');
      if (entry.watching) view.querySelector('.hdr .status').dataset.countdown = 'lineguard';
    }
    if (key === 'matchfix') {
      const feed = view.querySelector('.why .msg');
      if (feed) feed.textContent = entry.feed.join('\n');
      enhanceReviewTable(view, entry);
    }
    if (key === 'shipmentguard') renderShipmentGates(view, entry);
    if (key === 'payhold') {
      renderPayHoldConfirmations(view, entry);
      const badge = view.querySelector('.hdr .status');
      if (badge) badge.dataset.countdown = 'payhold';
    }
    updateCountdowns();
  }

  function appendResult(target, text) {
    if (!target) return;
    const result = document.createElement('div');
    result.className = 'result-line os pos'; result.textContent = text;
    target.insertAdjacentElement('afterend', result);
  }

  function updateCountdowns() {
    document.querySelectorAll('[data-countdown="lineguard"]').forEach(el => {
      const elapsed = Math.floor((Date.now() - state.lineguard.countdownStarted) / 60000);
      const remaining = Math.max(0, 178 - elapsed);
      el.textContent = `Predicted failure in ${Math.floor(remaining / 60)} h ${String(remaining % 60).padStart(2, '0')} min`;
      if (!remaining) state.lineguard.failed = true;
    });
    document.querySelectorAll('[data-countdown="payhold"]').forEach(el => {
      const now = new Date();
      const run = new Date(now); run.setHours(18, 0, 0, 0);
      if (run <= now) run.setDate(run.getDate() + 1);
      const remaining = Math.max(0, Math.floor((run - now) / 60000));
      el.textContent = `Run in ${Math.floor(remaining / 60)} h ${String(remaining % 60).padStart(2, '0')} min`;
    });
    saveState();
  }

  function enhanceReviewTable(view, entry) {
    const table = view.querySelector('table');
    if (!table) return;
    table.querySelector('tr').insertAdjacentHTML('beforeend', '<th>Review</th>');
    [...table.querySelectorAll('tr')].slice(1).forEach((row, i) => {
      const reviewed = entry.reviewed?.includes(i);
      row.insertAdjacentHTML('beforeend', `<td>${reviewed ? '<span class="os pos">Reviewed</span>' : `<button class="link-button" data-review="${i}">Review</button>`}</td>`);
    });
  }

  function renderShipmentGates(view, entry) {
    const gates = [...view.querySelectorAll('.gate2 .g')];
    const names = ['customer', 'logistics'];
    gates.forEach((gate, i) => {
      const value = entry.gates[names[i]];
      if (value === 'approved') gate.innerHTML = `<b>${i ? 'Logistics' : 'Customer service'}</b><span class="os pos">Approved by ${i ? 'logistics' : 'customer service'} at ${entry.decidedAt}</span>`;
      if (value === 'escalated') gate.innerHTML = '<b>Logistics</b><span class="os crit">Escalated to director</span>';
    });
    if (Object.values(entry.gates).every(v => v === 'approved')) appendResult(view.querySelector('.block .msg'), 'Sent to Retail chain North, portal updated');
  }

  function renderPayHoldConfirmations(view, entry) {
    const gates = [...view.querySelectorAll('.gate2 .g')];
    if (!gates.length) return;
    gates[0].innerHTML = entry.confirmations[0]
      ? `<b>Confirmation 1 of 2</b><span class="os pos">${escapeHtml(entry.confirmations[0])}, Treasury, confirmed hold at ${entry.decidedAt || time()}</span>`
      : '<b>Confirmation 1 of 2</b>Waiting for the current treasury user';
    gates[1].innerHTML = entry.confirmations[1]
      ? `<b>Confirmation 2 of 2</b><span class="os pos">${escapeHtml(entry.confirmations[1])}, Treasury, confirmed hold at ${entry.decidedAt || time()}</span>`
      : entry.confirmations[0]
        ? '<b>Confirmation 2 of 2</b><form class="second-user-form"><label for="second-user">Second treasury user</label><div><input id="second-user" name="second-user" required><button class="btn accept" type="submit">Confirm as this user</button></div><div class="inline-error" hidden></div></form>'
        : '<b>Confirmation 2 of 2</b>Waiting for a second treasury user';
  }

  function renderFooter(view, key) {
    const footer = view.querySelector('.footer');
    if (!footer) return;
    const entry = state[key];
    if (key === 'lineguard' && entry.watching) {
      footer.innerHTML = '<span class="note">Watching only. No PM order has been created.</span><button class="btn accept" data-case-action="approve">Approve repair plan</button><button class="undo" data-undo="lineguard">Undo</button>';
      return;
    }
    if (!pending(key)) {
      const copy = entry.status === 'rejected' ? 'Rejected. The agents have been told; nothing was posted.' : entry.status === 'released' ? 'Released with two-user confirmation. The audit event is on the mesh.' : 'Approved. The decision event is on SAP Advanced Event Mesh; subscribers are updating.';
      footer.innerHTML = `<span class="note">${copy}</span><button class="undo" data-undo="${key}">Undo</button>`;
      return;
    }
    const option = entry.selectedOption;
    const configs = {
      orderguard: { note: 'Approving publishes the selected fulfilment plan to S/4HANA, EWM, the CRM and finance from one event.', buttons: `<button class="btn reject" data-case-action="reject">Reject</button><button class="btn accept" data-case-action="approve">${['Approve split delivery', 'Approve substitute SKU', 'Approve new promised date'][option]}</button>` },
      lineguard: { note: 'Approving creates the PM order with the parts reservation and the FSM booking.', buttons: '<button class="btn" data-case-action="watch">Watch only</button><button class="btn accept" data-case-action="approve">Approve repair plan</button>' },
      matchfix: { note: 'Your decision is posted in S/4HANA AP and pushed to the requester and the supplier.', buttons: `<button class="btn accept" data-case-action="decide">${['Reject invoice, request correction', 'Post at PO price and open dispute', 'Release in full'][option]}</button>` },
      shipmentguard: { note: 'Customer service approves the message. Logistics approves the selected spend. Both are logged on the mesh.', buttons: `<button class="btn" data-gate="customer">${entry.gates.customer === 'approved' ? 'Message approved' : 'Approve message'}</button><button class="btn accept" data-gate="logistics">${option === 2 ? 'Request director approval' : entry.gates.logistics === 'approved' ? 'Reroute approved' : option === 1 ? 'Approve split, €900' : 'Approve reroute, €900'}</button>` },
      payhold: { note: 'Releasing a hold needs two treasury users. The agent never pays.', buttons: '<button class="btn" data-case-action="release">Release V-100</button><button class="btn accept" data-case-action="confirm">Confirm holds</button>' }
    };
    footer.innerHTML = `<span class="note">${configs[key].note}</span>${configs[key].buttons}`;
  }

  function selectOption(key, index) {
    state[key].selectedOption = index;
    if (key === 'shipmentguard') state[key].gates.logistics = 'pending';
    saveState(); renderDetail(key);
  }

  function renderAfterDecision(key) {
    if (currentView() === key) renderDetail(key); else renderHome();
  }

  function decide(key, action) {
    const entry = state[key];
    const stamp = time();
    if (key === 'lineguard' && action === 'watch') {
      entry.watching = true; entry.decidedAt = stamp;
      saveState(); renderAfterDecision(key); toast('Watch only enabled'); return;
    }
    if (key === 'payhold') {
      if (action === 'confirm') {
        if (!entry.confirmations.length) {
          entry.confirmations.push('RC'); entry.decidedAt = stamp;
          addLog(key, 'payment/hold-confirmation-1/v1'); saveState(); renderAfterDecision(key); toast('First confirmation recorded');
        } else {
          document.getElementById('second-user')?.focus(); toast('A second treasury user is required');
        }
        return;
      }
      if (action === 'release') { openReleaseDialog(); return; }
    }
    if (key === 'matchfix' && action === 'decide') {
      const messages = [
        `Invoice 5100098772: rejected, corrected invoice requested from Verpack GmbH`,
        `Invoice 5100098772: posted at PO price, dispute opened for €7,110`,
        `Invoice 5100098772: released in full after AP confirmation`
      ];
      entry.status = entry.selectedOption === 0 ? 'rejected' : entry.selectedOption === 2 ? 'released' : 'approved';
      entry.feed.unshift(`${stamp.slice(0, 5)}  ${messages[entry.selectedOption]}`);
    } else {
      entry.status = action === 'reject' ? 'rejected' : 'approved';
    }
    entry.watching = false; entry.decidedAt = stamp;
    topics[key].forEach(topic => addLog(key, topic));
    saveState(); renderAfterDecision(key); toast(entry.status === 'rejected' ? 'Rejected' : entry.status === 'released' ? 'Released' : 'Approved');
  }

  function decideShipmentGate(gate) {
    const entry = state.shipmentguard;
    if (gate === 'logistics' && entry.selectedOption === 2) {
      entry.gates.logistics = 'escalated';
      addLog('shipmentguard', 'shipment/director-approval-requested/v1');
      toast('Director approval requested');
    } else {
      entry.gates[gate] = 'approved';
      addLog('shipmentguard', gate === 'customer' ? 'customer/message-approved/v1' : 'shipment/reroute-approved/v1');
      toast(gate === 'customer' ? 'Message approved' : 'Reroute approved');
    }
    if (Object.values(entry.gates).every(value => value === 'approved')) {
      entry.status = 'approved'; entry.decidedAt = time();
      topics.shipmentguard.forEach(topic => addLog('shipmentguard', topic));
    }
    saveState(); renderAfterDecision('shipmentguard');
  }

  function confirmSecondUser(form) {
    const input = form.elements['second-user'];
    const name = input.value.trim();
    const error = form.querySelector('.inline-error');
    if (!name || state.payhold.confirmations.some(existing => existing.toLowerCase() === name.toLowerCase())) {
      error.textContent = 'A second, different treasury user is required';
      error.hidden = false; input.setAttribute('aria-invalid', 'true'); return;
    }
    state.payhold.confirmations.push(name);
    state.payhold.status = 'approved'; state.payhold.decidedAt = time();
    addLog('payhold', 'payment/hold-confirmed/v1'); saveState(); renderDetail('payhold'); toast('Holds confirmed');
  }

  function openReleaseDialog() {
    openDialog('Release V-100', `<form class="release-form"><p>Release requires a reason and two different treasury users.</p><label>Reason<textarea name="reason" required></textarea></label><div class="dialog-grid"><label>First treasury user<input name="first" required value="RC"></label><label>Second treasury user<input name="second" required></label></div><div class="inline-error" hidden></div><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button class="btn accept" type="submit">Confirm release</button></div></form>`);
  }

  function confirmRelease(form) {
    const data = new FormData(form);
    const first = String(data.get('first')).trim(), second = String(data.get('second')).trim(), reason = String(data.get('reason')).trim();
    const error = form.querySelector('.inline-error');
    if (!reason || !first || !second || first.toLowerCase() === second.toLowerCase()) {
      error.textContent = 'A reason and a second, different treasury user are required'; error.hidden = false; return;
    }
    const entry = state.payhold;
    entry.confirmations = [first, second]; entry.status = 'released'; entry.decidedAt = time();
    addLog('payhold', 'payment/release-requested/v1'); addLog('payhold', 'payment/release-confirmed/v1');
    saveState(); closeDialog(); renderDetail('payhold'); toast('V-100 released with two-user confirmation');
  }

  function undo(key) {
    const fresh = defaultState()[key];
    const currentLog = state[key].log;
    state[key] = { ...fresh, log: currentLog };
    saveState(); renderDetail(key); toast('Decision undone');
  }

  function quickAction(spec) {
    const [key, indexText] = spec.split(':');
    const index = Number(indexText);
    if (key === 'shipmentguard') {
      if (index === 0) {
        state[key].gates = { customer: 'approved', logistics: 'approved' };
        state[key].status = 'approved'; state[key].decidedAt = time(); topics[key].forEach(t => addLog(key, t));
      } else { state[key].status = 'held'; state[key].decidedAt = time(); }
    } else if (key === 'payhold') {
      if (index === 0) { location.hash = '#payhold'; return; }
      openReleaseDialog(); return;
    } else if (key === 'lineguard') {
      if (index === 0) decide(key, 'approve'); else decide(key, 'watch');
      return;
    } else if (key === 'matchfix') {
      state[key].selectedOption = index === 0 ? 0 : 2; decide(key, 'decide'); return;
    } else decide(key, index === 0 ? 'approve' : 'reject');
    saveState(); renderHome(); toast(index === 0 ? 'Approved' : 'Held');
  }

  function showHomeTab(name) {
    const view = views.home;
    view.querySelectorAll('.tabs span').forEach(tab => tab.classList.toggle('on', tab.dataset.homeTab === name));
    const cards = view.querySelector('.cards');
    const done = view.querySelector('.done-today');
    const list = view.querySelector('#home-list');
    if (name === 'proposals') { cards.hidden = false; if (done) done.hidden = false; list.hidden = true; return; }
    cards.hidden = true; if (done) done.hidden = true; list.hidden = false;
    const rows = name === 'tasks'
      ? ['Review quarterly credit limits', 'Confirm inventory count variance', 'Approve purchase requisition 1003482', 'Complete supplier assessment']
      : ['Delivery performance below target', 'Working capital opportunity identified', 'Maintenance backlog increased'];
    list.innerHTML = rows.map((row, i) => `<div><span>${row}</span><span class="os ${i ? 'info' : 'crit'}">${i ? 'Normal' : 'Action required'}</span></div>`).join('');
  }

  function handleSearch(form) {
    const value = form.querySelector('input').value.trim().toLowerCase();
    const routes = [
      [['4500012345', 'order'], 'orderguard'], [['spindle', 'line 3', '40002217'], 'lineguard'],
      [['5100098772', 'invoice', '4500081233'], 'matchfix'], [['shp-77812', 'shipment', '80012341'], 'shipmentguard'],
      [['pr-2026-41', 'v-100', 'payment'], 'payhold']
    ];
    const match = routes.find(([needles]) => needles.some(needle => value.includes(needle)));
    if (match) location.hash = `#${match[1]}`; else toast('No matching business object in this prototype');
  }

  function openControls() {
    const panel = document.getElementById('side-panel');
    const overlay = document.getElementById('overlay');
    panel.innerHTML = `<div class="panel-head"><h2>Prototype controls</h2><button data-action="close-panel" aria-label="Close">×</button></div><button class="panel-action" data-action="reset-all"><b>Reset prototype</b><span>Clear every simulated decision and return home</span></button><h3>Scenario runner</h3><p class="panel-note">Play automatically or advance one step at a time. Shortcut: Shift+S.</p><div class="scenario-list">${scenarioDefinitions.map((scenario, i) => `<section><b>${i + 1}. ${scenario.name}</b><span>${scenario.summary}</span><div><button class="btn accept" data-scenario-play="${i}">Play</button><button class="btn" data-scenario-step="${i}">Step</button><button class="link-button" data-scenario-reset="${i}">Reset</button></div></section>`).join('')}</div>`;
    overlay.hidden = false; panel.hidden = false; panel.querySelector('button')?.focus();
  }

  function closePanel() {
    document.getElementById('side-panel').hidden = true;
    document.getElementById('overlay').hidden = true;
  }

  function resetAll() {
    state = defaultState(); saveState(); stopScenario(); closePanel(); location.hash = '#home'; route(); toast('Prototype reset');
  }

  function openDialog(title, body) {
    const layer = document.getElementById('dialog-layer');
    layer.innerHTML = `<div class="dialog-backdrop" data-action="close-dialog"></div><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><h2 id="dialog-title">${title}</h2><button data-action="close-dialog" aria-label="Close dialog">×</button></header><div class="dialog-body">${body}</div></section>`;
    layer.hidden = false; layer.querySelector('.dialog button, .dialog input, .dialog textarea')?.focus();
  }

  function openInfoDialog(type, key) {
    if (type === 'architecture') {
      openDialog(`${labels[key]} architecture`, `<div class="architecture-empty"><div class="architecture-symbol"><span>Event</span><i></i><span>Agent</span><i></i><span>Approval</span></div><p>The architecture image referenced by the build brief was not included in this repository. This prototype does not invent a system diagram or imply a live connection.</p><button class="btn" data-dialog="eventlog" data-case="${key}">Open event log</button></div>`);
    } else {
      const rows = state[key].log.length ? state[key].log.map(item => `<li><time>${escapeHtml(item.time)}</time><code>${escapeHtml(item.event)}</code></li>`).join('') : '<li>No decision events published in this simulation yet.</li>';
      openDialog(`${labels[key]} event log`, `<p class="dialog-note">Simulated local event log. No broker or SAP system is connected.</p><ol class="event-log">${rows}</ol>`);
    }
  }

  function closeDialog() { document.getElementById('dialog-layer').hidden = true; }

  function openReview(index) {
    openDialog('Auto-released invoice review', `<ul class="form"><li><span class="k">Invoice</span><span class="v">${['5100098765', '5100098758', '5100098751', 'Daily release batch'][index]}</span></li><li><span class="k">Policy result</span><span class="v">Inside tolerance, evidence logged for daily review</span></li><li><span class="k">Decision</span><span class="v">Released automatically under AP policy</span></li></ul><div class="dialog-actions"><button class="btn accept" data-confirm-review="${index}">Confirm review</button></div>`);
  }

  function confirmReview(index) {
    state.matchfix.reviewed = [...new Set([...(state.matchfix.reviewed || []), index])];
    saveState(); closeDialog(); renderDetail('matchfix'); toast('Review confirmed');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  const scenarioDefinitions = [
    { name: 'OrderGuard: one event, four readers', summary: 'Approve the recommended split delivery.', steps: [
      ['home', '.todo[data-case="orderguard"]', '09:14, a sales order is saved in S/4HANA. Four systems and the agents read the same event.'],
      ['orderguard', '.trail', 'Order Watch flagged it at risk; Fulfilment Options costed three ways to keep the date.'],
      ['orderguard', '.opt', 'Split delivery keeps 16 October for 1,200 euros of freight.'],
      ['orderguard', '.why', 'The reasoning and the data read are on the screen.'],
      ['orderguard', '[data-case-action="approve"]', 'Approval publishes one event. Warehouse, CRM and finance update in the same second.', () => decide('orderguard', 'approve')],
      ['orderguard', '.result-line', 'Customer Promise sent the note and updated the CRM. Lab build, S/4HANA simulated.']
    ]},
    { name: 'LineGuard: 400 readings, one order', summary: 'Show throttling and approve the repair.', steps: [
      ['home', '.todo[data-case="lineguard"]', '22:40, spindle 17 drifts past its vibration threshold.'],
      ['lineguard', '.facts', 'AEM throttles 400 readings to one event per machine.'],
      ['lineguard', '.bars', 'The agent saw one scored anomaly, not a flood.'],
      ['lineguard', '.block', 'Part located at the sister plant, technician booked for 04:00.'],
      ['lineguard', '[data-case-action="approve"]', 'One maintenance order, parts reserved, before the failure.', () => decide('lineguard', 'approve')],
      ['lineguard', '.result-line', 'Nothing was created in S/4HANA until a person approved. Lab build.']
    ]},
    { name: 'MatchFix: the question disappears', summary: 'Reject the exception and update the feed.', steps: [
      ['home', '.todo[data-case="matchfix"]', 'Seven three-way match failures today. Six released inside tolerance in seconds.'],
      ['matchfix', '.facts', 'One is 15 percent above the purchase order and escalated with the reasoning.'],
      ['matchfix', 'table', 'Inside tolerance the agents release under AP policy and list it for review.'],
      ['matchfix', '.why .msg', 'Status is pushed by the same event. Nobody has to ask where the invoice is.'],
      ['matchfix', '[data-case-action="decide"]', 'The decision posts to AP and the requester feed updates.', () => decide('matchfix', 'decide')],
      ['matchfix', '.why .msg', 'Paytrack’s agent, reused, now event-driven. Lab build.']
    ]},
    { name: 'ShipmentGuard: the signal lives outside SAP', summary: 'Complete the two independent approvals.', steps: [
      ['home', '.todo[data-case="shipmentguard"]', '14:05, the carrier revises an ETA through SAP Business Network.'],
      ['shipmentguard', 'table', 'Impact ranked three deliveries by service level and penalty exposure in 41 seconds.'],
      ['shipmentguard', '.list', 'Reroute from Lyon keeps the window for 900 euros, inside the expedite cap.'],
      ['shipmentguard', '[data-gate="customer"]', 'Customer service approves the message to the customer.', () => decideShipmentGate('customer')],
      ['shipmentguard', '[data-gate="logistics"]', 'Logistics approves the spend. Two gates, two owners.', () => decideShipmentGate('logistics')],
      ['shipmentguard', '.result-line', 'The customer is told before they call. Lab build.']
    ]},
    { name: 'PayHold: a control you can replay', summary: 'Confirm holds with two treasury users.', steps: [
      ['home', '.todo[data-case="payhold"]', '16:00, a payment run is scheduled for 18:00. Two lines are held within a minute.'],
      ['payhold', 'table', 'A vendor whose IBAN changed on Monday, and a duplicate of a March invoice.'],
      ['payhold', '.why', 'Business Integrity Screening rules, the change log and payment history, correlated.'],
      ['payhold', '[data-case-action="confirm"]', 'First treasury user confirms.', () => decide('payhold', 'confirm')],
      ['payhold', '.second-user-form', 'Second user confirms. The agent never pays; two people release.', () => { const form = document.querySelector('.second-user-form'); if (form) { form.elements['second-user'].value = 'A. Berg'; confirmSecondUser(form); } }],
      ['payhold', '[data-dialog="eventlog"]', 'Ordered, replayable: the hold landed before the run. Lab build.', () => openInfoDialog('eventlog', 'payhold')]
    ]}
  ];

  async function runScenario(index, auto = false) {
    if (!currentScenario || currentScenario.index !== index) currentScenario = { index, step: 0 };
    closePanel();
    const definition = scenarioDefinitions[index];
    const execute = async () => {
      if (!currentScenario || currentScenario.step >= definition.steps.length) { stopScenario(); return false; }
      const [view, selector, caption, action] = definition.steps[currentScenario.step];
      if (location.hash !== `#${view}`) { location.hash = `#${view}`; await delay(80); }
      document.querySelectorAll('.scenario-focus').forEach(el => el.classList.remove('scenario-focus'));
      let target = document.querySelector(`.app-view[data-view="${view}"] ${selector}`);
      target?.classList.add('scenario-focus');
      target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      showCaption(caption);
      if (action) { await delay(450); action(); await delay(100); target = document.querySelector(`.app-view[data-view="${view}"] ${selector}`); target?.classList.add('scenario-focus'); }
      currentScenario.step += 1;
      return true;
    };
    if (!auto) { await execute(); return; }
    while (currentScenario && await execute()) await delay(2500);
  }

  function resetScenario(index) {
    const key = useCases[index];
    state[key] = defaultState()[key]; saveState(); currentScenario = { index, step: 0 };
    location.hash = '#home'; route(); toast('Scenario reset');
  }

  function delay(ms) { return new Promise(resolve => { scenarioTimer = setTimeout(resolve, ms); }); }
  function showCaption(text) { const bar = document.getElementById('caption-bar'); bar.textContent = text; bar.hidden = false; }
  function stopScenario() { clearTimeout(scenarioTimer); scenarioTimer = null; currentScenario = null; document.getElementById('caption-bar').hidden = true; document.querySelectorAll('.scenario-focus').forEach(el => el.classList.remove('scenario-focus')); }

  app.addEventListener('click', event => {
    const target = event.target.closest('button, [role="button"], [role="link"]');
    if (!target) return;
    if (target.dataset.route) { location.hash = `#${target.dataset.route}`; return; }
    if (target.dataset.quick) { quickAction(target.dataset.quick); return; }
    if (target.dataset.homeTab) { showHomeTab(target.dataset.homeTab); return; }
    if (target.dataset.caseAction) { decide(currentView(), target.dataset.caseAction); return; }
    if (target.dataset.gate) { decideShipmentGate(target.dataset.gate); return; }
    if (target.dataset.undo) { undo(target.dataset.undo); return; }
    if (target.dataset.dialog) { openInfoDialog(target.dataset.dialog, target.dataset.case); return; }
    if (target.dataset.review) { openReview(Number(target.dataset.review)); return; }
    if (target.dataset.confirmReview) { confirmReview(Number(target.dataset.confirmReview)); return; }
    if (target.dataset.scenarioPlay) { runScenario(Number(target.dataset.scenarioPlay), true); return; }
    if (target.dataset.scenarioStep) { runScenario(Number(target.dataset.scenarioStep)); return; }
    if (target.dataset.scenarioReset) { resetScenario(Number(target.dataset.scenarioReset)); return; }
    const action = target.dataset.action;
    if (action === 'go-home') location.hash = '#home';
    else if (action === 'open-search') { const form = target.closest('.app-view').querySelector('.shell-search'); form.hidden = false; form.querySelector('input').focus(); }
    else if (action === 'close-search') target.closest('form').hidden = true;
    else if (action === 'notifications') toast('No new notifications');
    else if (action === 'not-in-prototype') toast('Not part of this prototype');
    else if (action === 'approvals') openApprovalsDialog();
    else if (action === 'controls') openControls();
    else if (action === 'close-panel') closePanel();
    else if (action === 'reset-all') resetAll();
    else if (action === 'close-dialog') closeDialog();
    else if (action === 'toggle-done') { const list = target.nextElementSibling; list.hidden = !list.hidden; target.setAttribute('aria-expanded', String(!list.hidden)); }
  });

  app.addEventListener('change', event => {
    if (event.target.dataset.optionCase) selectOption(event.target.dataset.optionCase, Number(event.target.value));
  });

  document.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.matches('.shell-search')) handleSearch(event.target);
    if (event.target.matches('.second-user-form')) confirmSecondUser(event.target);
    if (event.target.matches('.release-form')) confirmRelease(event.target);
  });

  document.addEventListener('click', event => {
    if (!app.contains(event.target)) {
      const control = event.target.closest('button, a');
      if (!control) return;
      if (control.dataset.action === 'close-panel') closePanel();
      else if (control.dataset.action === 'reset-all') resetAll();
      else if (control.dataset.action === 'close-dialog') closeDialog();
      else if (control.dataset.dialog) openInfoDialog(control.dataset.dialog, control.dataset.case);
      else if (control.dataset.scenarioPlay) runScenario(Number(control.dataset.scenarioPlay), true);
      else if (control.dataset.scenarioStep) runScenario(Number(control.dataset.scenarioStep));
      else if (control.dataset.scenarioReset) resetScenario(Number(control.dataset.scenarioReset));
      else if (control.dataset.confirmReview) confirmReview(Number(control.dataset.confirmReview));
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeDialog(); closePanel(); stopScenario(); }
    if (event.shiftKey && event.key.toLowerCase() === 's') { event.preventDefault(); openControls(); }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[role="button"], [role="link"]')) { event.preventDefault(); event.target.click(); }
  });

  function currentView() { return (location.hash || '#home').slice(1); }
  function openApprovalsDialog() {
    openDialog('Approvals', `<div class="approval-list">${useCases.map(key => `<a href="#${key}" data-action="close-dialog"><b>${labels[key]}</b><span class="os ${pending(key) ? 'crit' : 'pos'}">${statusText(key)}</span></a>`).join('')}</div>`);
  }

  window.addEventListener('hashchange', route);
  setInterval(updateCountdowns, 60000);
  route();
})();
