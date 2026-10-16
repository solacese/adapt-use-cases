# ABC Operations Prototype

A static, clickable operations prototype based on the six supplied ABC screens.

## Open

Open `index.html` directly in a browser, or serve this folder with any static file server. The app uses URL hashes, so browser back and forward work on both `file://` and static hosting.

## Demo controls

- Select a proposal title on **My Home** to open it.
- Search for `4500012345`, `5100098772`, `SHP-77812`, or `PR-2026-41`.
- Use the gear in the shell to reset the prototype or run a scenario.
- Press **Shift+S** to open the scenario runner.
- Decisions are stored locally in the browser. **Reset prototype** clears them.

The architecture link is present on every approval page. The architecture image inputs named by the build brief were not included in this repository, so the prototype displays an honest placeholder and the local simulated event log rather than inventing a diagram.

Design prototype rendered from static HTML. S/4HANA data simulated with standard event payloads. No SAP system is connected.
