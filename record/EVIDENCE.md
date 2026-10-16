# ABC Prototype Scenario Evidence

All recordings are 1440 × 900, 30 fps, H.264 MP4, with no audio. The captions are rendered by the prototype's scenario runner. Each scenario also has six 1440 × 900 PNG captures named `<scenario>_<step>.png`.

| Video | Scenario | PNG steps | What it shows |
| --- | --- | ---: | --- |
| `01_orderguard.mp4` | OrderGuard: one event, four readers | `01_orderguard_01.png`–`01_orderguard_06.png` | Sales-order event, costed fulfilment alternatives, visible reasoning, approval, customer and CRM result. |
| `02_lineguard.mp4` | LineGuard: 400 readings, one order | `02_lineguard_01.png`–`02_lineguard_06.png` | AEM rate limiting, anomaly evidence, repair plan, human approval, PM order result. |
| `03_matchfix.mp4` | MatchFix: the question disappears | `03_matchfix_01.png`–`03_matchfix_06.png` | Escalated invoice exception, policy releases, requester feed, reject-and-correct decision. |
| `04_shipmentguard.mp4` | ShipmentGuard: the signal lives outside SAP | `04_shipmentguard_01.png`–`04_shipmentguard_06.png` | External ETA signal, affected customers, reroute choice, customer-service and logistics gates. |
| `05_payhold.mp4` | PayHold: a control you can replay | `05_payhold_01.png`–`05_payhold_06.png` | Held payment lines, evidence, two different treasury confirmations, replayable event log. |

Design mockup rendered from static HTML; data simulated.
