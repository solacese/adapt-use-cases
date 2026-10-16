# Stitch the ABC screens into one clickable prototype with five scripted scenarios

You are turning six static Fiori-style HTML pages into one coherent, clickable prototype for a fictional customer "ABC", then adding a scenario runner so each of the five use cases can be walked through, recorded and screenshotted without a backend. The prototype is evidence for SAP's ADAPT library (frontend screenshots or video). It is a design prototype with simulated data and must say so; it must never look like it is talking to a real S/4HANA or Joule.

## Inputs, read them first

- `screens/00_abc_home.html`: ABC home (launchpad My Home pattern) with five agent proposals as To Do cards, insight tiles, page tiles.
- `screens/01_orderguard.html` to `05_payhold.html`: one approval page per use case. Approve and Reject already change the process flow, the footer and show a toast.
- `screens/SCREENS_SPEC.md`: the visual rules (Horizon tokens by name), the shared layout, and per use case the agents, benefits, screen contents and topics. Everything you build must stay inside these rules.
- `m-architectures/arch_<UseCase>.png`: architecture per use case, to be linked from each page.

## Target

One folder `prototype/` that opens from `prototype/index.html` with no server, no build step, no framework. Vanilla HTML, CSS and JavaScript. Keep the existing CSS (the Horizon tokens) and move it into `prototype/styles.css`; move the shared behaviour into `prototype/app.js`. The six pages become six views inside `index.html`, switched by URL hash (`#home`, `#orderguard`, `#lineguard`, `#matchfix`, `#shipmentguard`, `#payhold`). Browser back and forward must work. Keep each view's markup identical in words and layout to the source page; you are wiring it, not redesigning it.

State lives in one JavaScript object (`state`) with one entry per use case: `status` (`waiting`, `approved`, `rejected`, `held`, `released`), `selectedOption`, `gates` (per gate: `pending`, `approved`), `confirmations` (PayHold: list of user names), `feed` (MatchFix: list of pushed status lines), `log` (every event name the prototype "published", with a timestamp). Persist `state` in `localStorage` so a refresh keeps it; provide a reset.

## What must work, by view

Home (`#home`)
- Clicking a To Do card title opens that use case's view.
- Approve on a card does exactly what Approve does on the detail page for that use case, then the card shows a green "Approved" status line and its buttons disappear. Reject, Release, Watch, Hold behave as on the detail page.
- "Agent proposals (5)" count follows the state: only waiting proposals are counted and shown; approved or rejected ones move to a collapsed "Done today (n)" list under the cards, each with one line and the time.
- Insight tiles are computed from state: proposals waiting; event to proposal median (fixed, from the five page values); auto-released invoices (6, plus 1 if MatchFix was released in full); deductions avoided (adds €38,400 when OrderGuard is approved); payments held (2 while PayHold is `held`, 0 after a two-person release); unplanned stops (0, becomes 1 if LineGuard is rejected with "Watch only" and the scenario runner advances past the failure time).
- Tabs "Tasks (12)" and "Situations (3)" open a short list of placeholder rows with realistic names; "Show More" and "Add Tiles" show a Horizon message toast "Not part of this prototype".
- Search opens a field; typing an order, invoice, shipment or run number from the pages jumps to that view.

All detail views
- Navigation row: "My Home" goes home, "Approvals" lists the five proposals with status, "Sales" and "Insights" show the toast.
- Selecting a different option updates the accept button label (for example "Approve substitute SKU") and the footer sentence; the recommended option stays marked.
- Approve: process flow waiting node turns positive with "Approved by you" and the current time; the following node becomes "Event published on AEM"; the footer is replaced by the result sentence; a toast "Approved"; `state.log` gets the topic from the page's "On approval" line; home card updates.
- Reject: same with negative wording; the agents' "next" node shows "Rejected, nothing posted".
- A small "Architecture" link next to the page title opens the matching PNG in a Horizon dialog (white, 0.75rem radius, close button). The dialog also offers "Event log" which lists `state.log` for that use case with timestamps.
- An "Undo" link appears in the footer after a decision and restores `waiting` for that use case.

OrderGuard (`#orderguard`)
- After approval, the customer note block gets a status line "Sent to Retail chain North, CRM updated" with the time.

LineGuard (`#lineguard`)
- Approve creates a result box under the plan: "PM order 40002217 created, part reserved at Plant 1200, M. Novak booked 04:00 to 05:30".
- "Watch only" marks the waiting node "Watching" (critical colour), keeps the footer with a single button "Approve repair plan", and starts a visible countdown "Predicted failure in 2 h 58 min" that decreases in real time (minutes). The scenario runner can fast-forward it.

MatchFix (`#matchfix`)
- The three options drive the footer label: "Reject invoice, request correction" (default), "Post at PO price and open dispute", "Release in full".
- Each decision appends a line to the requester feed with the time ("10:14 Invoice 5100098772: rejected, corrected invoice requested from Verpack GmbH") and the feed on the page updates immediately.
- The auto-released table rows have a row action "Review" that opens a dialog with the same key-value block as the escalated invoice but with the in-tolerance reasoning; "Confirm review" marks the row reviewed.

ShipmentGuard (`#shipmentguard`)
- Two gates, two buttons in the footer: "Approve message" (customer service) and "Approve reroute, €900" (logistics). Each gate box flips to "Approved by <role> at <time>" independently; the process flow waiting node only turns positive when both are approved. If the carrier-swap option (above cap) is selected, the logistics button reads "Request director approval" and approving it sets the gate to "Escalated to director" without turning the node positive.
- After both approvals the message block gets "Sent to Retail chain North, portal updated".

PayHold (`#payhold`)
- "Confirm holds" needs two different users. First click records the current user (RC) in confirmation 1; the second box turns into a small form "Second treasury user" with a name field and a "Confirm as this user" button; the same name twice is refused with a Horizon error message strip "A second, different treasury user is required". When both are recorded, the node turns positive, the footer sentence becomes "Holds confirmed. The run executes at 18:00 without these two lines."
- "Release V-100" opens a dialog that requires a reason and the same two-user rule; on completion the held table row shows "Released by A and B at <time>" and the home tile "Payments held" goes to 1.
- The header badge countdown to 18:00 decreases in real time.

Reset
- A small gear icon in the shell opens a panel with "Reset prototype" (clears `localStorage`, returns to home) and "Scenario runner" (below).

## Scenario runner

A hidden panel toggled with the keyboard shortcut Shift+S or from the gear menu. It lists the five scenarios; each has "Play" (auto-advances through the steps with 2.5 s pauses, scrolling to the relevant element and highlighting it with the focus outline), "Step" (one step at a time), and "Reset this scenario". While playing, a caption bar (bottom left, Arial 20px white on 60% black, same style for all five) shows the step caption, so a screen recording needs no editing. The runner never changes the words on the screens.

Scenario 1, OrderGuard: one event, four readers
1. Home. Caption: "09:14, a sales order is saved in S/4HANA. Four systems and the agents read the same event."
2. Open OrderGuard. Caption: "Order Watch flagged it at risk; Fulfilment Options costed three ways to keep the date."
3. Highlight the recommended option. Caption: "Split delivery keeps 16 October for 1,200 euros of freight."
4. Highlight "Why this is proposed". Caption: "The reasoning and the data read are on the screen."
5. Click Approve. Caption: "Approval publishes one event. Warehouse, CRM and finance update in the same second."
6. Highlight the customer note status. Caption: "Customer Promise sent the note and updated the CRM. Lab build, S/4HANA simulated."

Scenario 2, LineGuard: 400 readings, one order
1. Home, highlight the LineGuard card. Caption: "22:40, spindle 17 drifts past its vibration threshold."
2. Open LineGuard, highlight the facts "Readings received 400" and "Events to the agent 1". Caption: "AEM throttles 400 readings to one event per machine."
3. Highlight the chart. Caption: "The agent saw one scored anomaly, not a flood."
4. Highlight the plan. Caption: "Part located at the sister plant, technician booked for 04:00."
5. Click Approve. Caption: "One maintenance order, parts reserved, before the failure."
6. Show the result box. Caption: "Nothing was created in S/4HANA until a person approved. Lab build."

Scenario 3, MatchFix: the question disappears
1. Home, highlight the MatchFix card. Caption: "Seven three-way match failures today. Six released inside tolerance in seconds."
2. Open MatchFix, highlight the facts. Caption: "One is 15 percent above the purchase order and escalated with the reasoning."
3. Highlight the auto-released table. Caption: "Inside tolerance the agents release under AP policy and list it for review."
4. Highlight the requester feed. Caption: "Status is pushed by the same event. Nobody has to ask where the invoice is."
5. Click "Reject invoice, request correction". Caption: "The decision posts to AP and the requester feed updates."
6. Highlight the new feed line. Caption: "Paytrack's agent, reused, now event-driven. Lab build."

Scenario 4, ShipmentGuard: the signal lives outside SAP
1. Home, highlight the ShipmentGuard card. Caption: "14:05, the carrier revises an ETA through SAP Business Network."
2. Open ShipmentGuard, highlight the affected-customers table. Caption: "Impact ranked three deliveries by service level and penalty exposure in 41 seconds."
3. Highlight the alternatives. Caption: "Reroute from Lyon keeps the window for 900 euros, inside the expedite cap."
4. Click "Approve message". Caption: "Customer service approves the message to the customer."
5. Click "Approve reroute, €900". Caption: "Logistics approves the spend. Two gates, two owners."
6. Highlight the message status. Caption: "The customer is told before they call. Lab build."

Scenario 5, PayHold: a control you can replay
1. Home, highlight the PayHold card and the "Payments held" tile. Caption: "16:00, a payment run is scheduled for 18:00. Two lines are held within a minute."
2. Open PayHold, highlight the held lines. Caption: "A vendor whose IBAN changed on Monday, and a duplicate of a March invoice."
3. Highlight the "Why these are held" block. Caption: "Business Integrity Screening rules, the change log and payment history, correlated."
4. Click "Confirm holds". Caption: "First treasury user confirms."
5. Enter a second name and confirm. Caption: "Second user confirms. The agent never pays; two people release."
6. Open the Event log dialog. Caption: "Ordered, replayable: the hold landed before the run. Lab build."

## Rules

1. Words on the screens stay as they are. New text you add (status lines, dialogs, captions) is listed above; if you need more, keep it to the same plain style and put it in `prototype/COPY.md` so it can be reviewed.
2. Horizon tokens only, from `styles.css`. No new colours. No icons from SAP's icon font; the three CSS-drawn icons already there are the limit, add none.
3. No SAP logo, no Joule, anywhere. The ABC wordmark is the only brand.
4. The lab-build message strip stays on every view, always visible, never collapsed.
5. No network calls of any kind. The architecture PNGs are loaded from the local folder.
6. Keyboard: every button reachable with Tab, visible focus, Escape closes dialogs. `prefers-reduced-motion` turns off scrolling animation in the runner.
7. Everything works from `file://` and from any static host.

## Deliverables

- `prototype/index.html`, `prototype/styles.css`, `prototype/app.js`, `prototype/arch/` (the five PNGs copied in), `prototype/COPY.md`.
- `prototype/README.md`: how to open it, the shortcut for the runner, how to reset, and the sentence "Design prototype rendered from static HTML. S/4HANA data simulated with standard event payloads. No SAP system is connected."
- `record/`: for each scenario, the six step screenshots at 1440 x 900 (device scale 2) and one MP4 of the runner playing it (1440 x 900, 30 fps, no audio, captions as rendered by the runner).
- `record/EVIDENCE.md`: table of file, scenario, step, caption.

## Checks before you finish

- Play all five scenarios from a fresh state, then refresh: the home page shows "Agent proposals (0)" and "Done today (5)", the tiles read 0 waiting, 7 auto-released, €212K plus €38,400, 2 payments held (confirmed, not released), 0 unplanned stops.
- Reset returns everything to the original numbers.
- Enter the same user name twice in PayHold: refused with the error strip.
- Select the carrier swap in ShipmentGuard: logistics button reads "Request director approval" and the node does not turn positive.
- Search for "SHP-77812" from the home page: lands on ShipmentGuard.
- No console errors in Chromium and Firefox.
- grep the folder for "Joule", "Fiori-style", "UI5 Web Components target" and "SAP logo": no hits in visible text.

Do not build agents, a broker connection or an AI Core call. If something in the source pages blocks a behaviour above, stop and report it with the file and line rather than redesigning the page.
