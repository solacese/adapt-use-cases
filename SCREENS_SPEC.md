# Agent screens: what they show and why

Six screens for a fictional customer "ABC": the ABC home page (`00_abc_home.html`, SAP Fiori launchpad "My Home" pattern with the five agent proposals as To Do cards, insight tiles and pages) and one approval page per use case (`01` to `05`). They are static HTML with one piece of behaviour: Approve or Reject updates the process flow, the footer and shows a toast, so a screen recording can show before, click and after. No backend is needed to produce the ADAPT screenshots and videos. If a live gate is built later (UI5 Web Components, fed by AEM events), these files are its target: same layout, same words, same data.

Shell: Horizon launchpad header. ABC wordmark top left, app name with a chevron, search and notification icons, avatar; second row with the navigation tabs (My Home, Sales, Approvals, Insights). No SAP logo, no Joule.

## Visual rules (SAP Fiori, Horizon theme)

Use the Horizon theme tokens from SAP's theming-base-content, not approximations. The HTML files declare them as CSS variables with the official names. The ones that matter:

- Text #131E29, labels #556B82, page background #F5F6F7, content white, borders #D9D9D9 (groups) and #E5E5E5 (lists).
- Semantic text: positive #256F3A, critical #B44F00, negative #AA0808, informative #0064D9. Semantic element colours (borders, bars): #30914C, #E76500, #F53232, #0070F2. Inverted status backgrounds: #256F3A, #E76500, #AA0808, #0070F2 with white text.
- Buttons: default white with #BCC3CA border and #0064D9 text; emphasized #0070F2 with white text; reject #FFD6E9 background, #FFC2DE border, #AA0808 text. Corner radius 0.5rem, height 2.25rem. Emphasized is the primary action; reject style only for an actual reject.
- Corner radii: buttons 0.5rem, content blocks 0.75rem, tiles 1rem. Never a radius or a colour on one side only; state is shown by a full border, a status text or an object status, as Fiori does.
- Font 72 with Arial fallback, body 0.875rem, line height 1.5, object page title 1.5rem bold, section titles 1rem bold.
- Shell bar: white, 2.75rem, header shadow (0 0.125rem 0.125rem rgba(34,53,72,.05) plus a 1px #D9D9D9 bottom line), product name bold, app name regular, avatar on the right.
- Object page header: white, flush with the shell (no rounded corners, no card), title and subtitle, one object status on the right in semantic text colour, header facets in a row separated by 1px #D9D9D9 lines with label above value.
- Process flow for the event trail: nodes with a full 1px border in the state colour (informative for events, positive for agents done, critical and 2px for the step waiting for the user, neutral for what happens after), grey connectors with arrowheads, a status text line inside each node.
- Forms: label left in #556B82, value right of it in regular weight, no bold values, no right alignment.
- Selection lists for options: rows with 1px #E5E5E5 separators, selected row #EBF8FF, radio in the brand colour, "Recommended" as informative object status text next to the name.
- Tables: responsive table, header text #131E29 bold, 1px #E5E5E5 row separators, numbers right-aligned, object status text for states.
- Message strip for the lab note: #E1F4FF background, #0070F2 border, 0.75rem radius, information icon.
- Footer bar: white, 2.75rem, 1px #D9D9D9 top border, note left, buttons right.

## Shared layout, every screen

1. Launchpad header as above, with the agent name as the app name and "Approvals" as the active tab.
2. Object page header: one-line title that states the situation, one-line subtitle that says what the agents did and what is expected from the person, one object status on the right, and four or five header facets (one of them always "event to proposal" in seconds, positive colour).
3. Section "How it got here": a process flow. Node border informative = an event on AEM, positive = an agent that has run, critical (2px) = the human gate waiting, neutral = what happens after approval. Each node shows time, name, one line of detail, and a status text. This row is the proof that the agent was woken by an event and that nothing runs after the gate without a person.
4. Section "Proposal", left block: what the agent proposes. Options as a selection list with name, one-line rationale, cost on the right, "Recommended" object status on the agent's pick, pre-selected.
5. Right block: "Why this is proposed" in two to four plain sentences from the agent's reasoning, then "Data the agent read" (system, value), then "Event trail" (trigger event type, topics published, topic published on approval).
6. Footer bar: one sentence on what approval does, an accept-style (light green) button whose label says exactly what happens ("Approve split delivery", not "Submit"), and a second button for the other path (reject style, pink, only when it is a reject; default otherwise). Same button styles as the To Do cards on the home page.
7. Information message strip at the end of the page: "Lab build. S/4HANA data simulated with standard event payloads; agents run on SAP AI Core through the SAP Cloud SDK for AI; events on SAP Advanced Event Mesh." Keep it on every screen.

Data binding: every field on the screen comes from the proposal event (`*/proposal/v1`) and the trigger event. If a value is not in an event, it does not go on the screen. `reasoning`, `dataRead` and `options` are top-level fields of every proposal event for this reason.

## 1. OrderGuard (three agents)

Function. When a sales order is saved and available-to-promise cannot cover it, Order Watch decides whether the order is at risk (ATP gap, customer tier, penalty terms). Fulfilment Options reads ATP, stock at other sites and transport lead times and produces two or three costed ways to keep the promised date. After the rep approves, Customer Promise writes the customer note and updates the CRM. All three communicate only through AEM topics.

Benefits. The risk is known while the order is being confirmed, not after the overnight run. Options are costed with real lead time and penalty exposure before the rep sees them. Sales, warehouse, CRM and finance all read the same event, so there is one version of the order. OTIF deductions, 1 to 5% of order value, are avoided at order time instead of disputed six weeks later.

Screen. Title "Sales order <id> is at risk". Facts: ATP x of y (red), promised date, customer tier, penalty exposure (orange), event to proposal. Trail: Sales Order Created, Order Watch, Fulfilment Options, Your approval, Customer Promise. Options: split delivery (recommended), substitute SKU, move the date (shows the penalty). Below the options: the customer note the agents will send, so the rep approves the message too. Footer: "Approve split delivery" / "Reject".

Events. In: `sap.s4.beh.salesorder.v1.SalesOrder.Created.v1`. Agent to agent: `order/at-risk/v1`, `order/proposal/v1`. Out on approval: `order/approved/v1`, then `customer/promise-updated/v1`.

## 2. LineGuard (one agent)

Function. Subscribes to a rate-limited telemetry anomaly topic (one event per machine per window; the mesh does the throttling, not the agent). Scores severity and time to failure against the equipment master and maintenance history, finds the spare part across sites in EWM, finds a technician slot in FSM, drafts the maintenance order. The shift lead approves; the agent then creates the PM order with parts reservation and booking.

Benefits. 400 readings become one decision with reasoning. The repair is planned before the failure, with the part already located and the technician already free. Unplanned downtime drops 30 to 50% (benchmark), and one avoided stop at about €110k per line hour pays for the year. Nothing is created in S/4HANA without a person, day or night.

Screen. Title "<Machine>, <line>: repair plan before the failure". Badge "Severity high". Facts: time to failure, readings received (400), events to the agent (1, green), line hour at stake, proposed window. Trail: Telemetry anomaly, AEM queue (throttled), LineGuard, Shift lead approval, PM order created. Left card: the plan as a key-value list (diagnosis, part and location, transfer, technician, production impact, order status) and a small bar chart of the last readings with the threshold crossing marked. Footer: "Approve repair plan" / "Watch only".

Events. In: `sap/dm/telemetry/anomaly/v1/<plant>/<line>/<machine>` through a queue with an egress limit per machine. Out: `maintenance/proposal/v1`, on approval `maintenance/order-created/v1`.

## 3. MatchFix (three agents)

Function. When a supplier invoice fails the three-way match, Match Classifier names the mismatch (price, quantity, missing receipt, duplicate). Resolution reads the PO, goods receipt, price conditions and tolerance and decides: release inside tolerance under AP policy, post a correction when a price condition explains it, or escalate with the reasoning. Status Push (the Paytrack agent reused) subscribes to every status change and tells the requester and the supplier portal without being asked.

Benefits. Decision in seconds instead of 17 days in a blocked list. Cost per invoice from $12.88 to under $3, exception rate from 22% to 9% (benchmarks). The "where is my invoice" question disappears because status is pushed. Nothing outside tolerance is ever posted silently; auto-releases are listed for a daily human review.

Screen. This one is a work list, not a single case. Title "Invoice exceptions, today". Facts: match failures today, released in tolerance (green), escalated (orange), median event to decision, requesters notified. Trail for the escalated case. Left card: the one invoice needing a decision as a key-value block, three options (reject and request a corrected invoice, recommended; post at PO price and dispute; release in full), then a table of the auto-released invoices with difference and reason. Right card: why this one is escalated, the requester feed (two pushed messages), event trail including the dead-letter queue. Footer: "Reject invoice, request correction" / "Release in full".

Events. In: `sap.s4.beh.supplierinvoice.v1.SupplierInvoice.Created.v1` flagged match failed. Agent to agent: `invoice/mismatch/v1`, `invoice/decision/v1`. Status: `invoice/status/v1`. Failures: dead-letter queue, visible in the gate.

## 4. ShipmentGuard (three agents)

Function. ETA Watch subscribes with a wildcard to shipment events from every logistics provider (SAP Business Network or an iPaaS), validates them against a schema, and publishes a deviation when an ETA slips outside the delivery window. Impact maps the shipment to deliveries, customer orders and service levels, and ranks the customers by exposure. Customer Promise (same agent as OrderGuard) drafts the customer message and costs the alternatives: reroute from another DC, split, carrier swap. Two gates: customer service approves the message, logistics approves any spend.

Benefits. The signal from outside the company becomes a first-class event next to the S/4HANA delivery, so the link from truck to customer is made in seconds instead of by hand. The customer is told before they call, with an alternative already costed. Expedite spend stays inside a cap; anything above goes to a person with the options and the cost.

Screen. Title "Shipment <id> is <n> hours late". Badge "<n> customers at risk". Facts: new ETA, slip, deliveries on board, penalty exposure, event to impact. Trail: Shipment ETA changed, ETA Watch, Impact, Customer Promise, Two approvals. Left card: table of affected customers with service level, impact badge (breach / on time) and exposure; options (reroute recommended, split, carrier swap marked above cap); a two-box row showing the two gates and who owns each; the customer message. Footer: "Approve reroute and message" / "Hold".

Events. In: `sap/bn/shipment/eta-changed/v1/<lsp>/<shipment>` (subscribed as `.../*/>`), `OutboundDelivery.Created`. Agent to agent: `shipment/deviation/v1`, `shipment/impact/v1`, `shipment/proposal/v1`. Out on approval: `customer/eta-updated/v1`, `shipment/reroute/v1`.

## 5. PayHold (one agent)

Function. Keeps a 30-day watch list from Business Partner bank-detail changes. When Payment Run Scheduled fires, scores every line of the proposal against Business Integrity Screening rules, payment history (duplicates) and the watch list, holds the suspect lines with a standard S/4HANA payment block, opens the BIS case with the evidence, and lets the rest run. Treasury confirms holds; releasing one needs two different users. The agent never pays.

Benefits. The hold lands before the run every time because delivery on the mesh is ordered and guaranteed; the auditor can replay the sequence. Up to 95% of duplicates and redirected payments are stopped before the money leaves, with no clawback. Vendor bank changes are finally correlated with the lines about to be paid.

Screen. Title "Payment run <id>: <n> lines held". Badge with the countdown to the run (red). Facts: lines in the run, screened x of x (green), held (red), amount held (red), event to hold. Trail: Business Partner changed (earlier), Payment Run Scheduled, PayHold, Treasury confirms, Run executes. Left card: table of held lines (vendor, invoice, amount, why held, BIS case), a "what happens at 18:00" list that makes clear nothing is lost by waiting, and the two-person confirmation row (one done, one pending). Right card: why these are held, data read, event trail with the replay log line. Footer: "Confirm holds" / "Release V-100" (release opens the second-user step, it never releases on one click).

Events. In: `sap.s4.beh.paymentrun.v1.PaymentRun.Scheduled.v1`, `sap.s4.beh.businesspartner.v1.BusinessPartner.Changed.v1`. Out: `payment/hold/v1` per held line, `payment/screened/v1` for the rest; on confirmation `payment/hold-confirmed/v1`; replay from the AEM replay log for the audit view.

## What to record on each screen

Before approval (proposal visible, button enabled), the click, and after approval (trail step turns from orange to green, outbound topic appears in the event trail). For LineGuard also the broker queue statistics beside the screen (400 in, 1 out). For PayHold the two-user release with two browser sessions. For MatchFix the dead-letter queue entry and the requester feed updating.
