# Produce the ADAPT evidence pack from the ABC screens

You are preparing the screenshots and short videos that SAP's ADAPT reviewer asked for ("screenshots or a video of the frontend, plus the solution architecture") for five AEM + Joule event-driven agent use cases. Nothing needs to be built. The frontend exists as static HTML in `screens/`; the architectures exist as PNG and SVG in `m-architectures/`. Your job is to turn them into a clean, consistent, honestly captioned evidence pack and drop it into the deck.

## Inputs

- `screens/00_abc_home.html`: ABC home page (Fiori launchpad My Home pattern) with the five agent proposals as To Do cards.
- `screens/01_orderguard.html` to `05_payhold.html`: one approval page per use case. Approve / Reject buttons are live: clicking updates the process flow, replaces the footer text and shows a toast.
- `screens/SCREENS_SPEC.md`: what each screen shows and why; read it first.
- `m-architectures/arch_<UseCase>.png`: marketing architecture per use case.
- `ADAPT_UseCases_AEM-Joule_Event-Driven-Agents_Complete_Solace.pptx`: the deck. Each use case section has an empty screenshot slot on the 1-slide (right of Customer Value) and an Architecture slide already filled.

## Rules

1. Do not edit the words on the screens. If something looks wrong, report it, do not fix it silently.
2. Do not add SAP or Joule logos, icons or names to the screens. "ABC" is the customer. The lab-build message strip stays visible in every screenshot and video; never crop it out.
3. Render at 1440 x 900 CSS pixels, device scale factor 2, Chromium or Playwright, light mode. Font "72" is not installed; Arial fallback is expected and acceptable.
4. File names: `record/<nn>_<usecase>_<state>.png` with states `waiting`, `approved`, `rejected` (rejected only for OrderGuard and MatchFix). Home page: `record/00_abc_home.png`.
5. Videos: one per use case, 20 to 40 seconds, 1440 x 900, 30 fps, MP4 (H.264), no audio, captions burned in as a plain bottom-left text overlay in Arial 20px white on a 60% black bar. Script per video: 2 s on the ABC home page, click the use case's To Do card title (navigate to the page), 6 s still on the waiting state, slow scroll to the bottom and back over 8 s, click Approve, 4 s on the approved state. Captions, in this order: "ABC home: proposals raised by agents from SAP events", "<Use case>: what the agent proposes and why", "Approval publishes the decision on SAP Advanced Event Mesh", "Lab build: S/4HANA simulated, agents on SAP AI Core".
6. Screenshots go into the deck's 1-slide slot (fit to width, keep aspect, align top-right under the Customer Value title). Use `python-pptx`; do not change any other shape. Save as a new file with `_evidence` appended to the name; leave the original untouched.
7. Write `record/EVIDENCE.md`: a table of file, use case, state, what it shows, and one line per screen stating "design mockup rendered from static HTML; data simulated". That sentence must also appear in the deck's speaker notes on every 1-slide you touch.

## Checks before you finish

- Every screenshot shows the ABC wordmark, the active navigation tab, the full process flow and the message strip.
- The approved screenshots show the waiting node turned green with "Approved by you" and the next node as "Event published on AEM".
- No screenshot contains the text "Fiori-style", "UI5 Web Components target", "Joule" or an SAP logo.
- The six PNGs, five MP4s, EVIDENCE.md and the `_evidence` deck exist and open.

## Out of scope, do not start

Building the agents, the AEM broker setup, SAP AI Core calls, a UI5 app. Those are a separate step if SAP asks for a live demo; the earlier build prompt covers them.
