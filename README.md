# DTDTasks

DTDTasks is a productivity-focused web app that bundles multiple everyday tools like a **QR code generator**, **tabular to-do list**, and **markdown editor**—with more tools planned for future updates. Built using **React + TypeScript** and powered by **Redux**, it ensures smooth state management with features like **24-hour auto data deletion** and easy **data downloads**.

> 🔗 [Live Site](https://aio-lists.vercel.app/)  
> 🎥 [Demo Part 1](https://www.linkedin.com/posts/raghunandan-sharma_react-webdevelopment-aiolists-activity-7307307609303175169-0ree)  
> 🎥 [Demo Part 2](https://www.linkedin.com/posts/raghunandan-sharma_react-webdevelopment-productivity-activity-7307308321944809472-Pbfm)

---

## ✨ Features

-   📱 **QR Code Generator** – Create scannable QR codes for any text or URL.
-   ✅ **To-Do List** – Manage tasks in a user-friendly tabular format.
-   📝 **Markdown Editor** – Write and preview markdown content.
-   🔒 **Redux-based State** – Local data with **24-hour auto-deletion**.
-   💾 **Download Content** – Export your work with a click.
-   ⚙️ **Modular Design** – More tools coming soon.

---

## 🚀 Tech Stack

-   **React** + **TypeScript**
-   **Vite** for lightning-fast builds
-   **Redux** for state management
-   **Vitest** for unit testing
-   **Vercel** for deployment

---

## 🛠️ Getting Started

```bash
git clone https://github.com/Raghunandan1451/DTD-Tasks
cd DTD-Tasks
yarn install
yarn dev
```

## 🖥️ Desktop app (Windows)

The same app can run as an Electron desktop app that keeps your data in a folder you choose. The web version is unchanged.

```bash
yarn desktop:dev        # Vite dev server + Electron window
yarn desktop:start      # build, then run the built app
yarn desktop:dist       # build the installer into release/
yarn desktop:typecheck  # type-check the Electron code
```

- Needs Node 22.12 or newer (Electron 45). Docker and the web build do not download the Electron binary (`ELECTRON_SKIP_BINARY_DOWNLOAD=1`); set the same variable on Vercel.
- On first start the app asks for a data folder and will not run without one. If the folder later goes missing or can't be written, you get a recovery screen; it never silently creates a new one.
- The installer is **unsigned** for now, so Windows SmartScreen shows a warning ("More info" → "Run anyway"). Updates are manual: download the new installer from the GitHub Releases page and run it over the old one.

### Where the desktop app keeps your data

Pick (or create) one folder on first start. Each page has its own sub-folder, and everything is a normal file you can open, copy or back up:

| Folder | What is in it |
| --- | --- |
| `Notes/` | Your notes as real `.md` files, with the same folders as in the app. Edit them in any editor; the app picks up changes when you return to its window. |
| `Boards/` | One `<name>.board.json` per board. "Save" on the Boards page also writes `<name>.png` here. |
| `Journal/` | One JSON file per day (`Journal/2026/2026-11-19.json`). |
| `Finance/` | `settings.json` and one file per month in `expenses/`. "Save" on the Expenses page writes the report PDFs here. |
| `QR/` | QR code images you save. |
| `Exports/` | Other exports (for example the Home timeline). |
| `.dtdtasks/` | The app's own hidden data (folder marker, notes index, activity log). Don't edit. |

- **Back up** by copying the whole folder. **Move to another computer** by copying it and choosing it on first start.
- **Bring in browser data:** in the web app use Home → Download (everything, as a ZIP), then in the desktop app press **Import** on the Home page and choose the file(s). Existing items are never overwritten; a result list shows what was added, renamed or skipped.
- Notes are saved 2 seconds after you stop typing (at most 10 seconds while you keep typing) and when you leave the note or the window. A "Saved / Saving… / Could not save (Retry)" label on the Notes page shows the state.
- Known limitation: changes made outside the app to `Boards/` or `Journal/` files show up after the app is restarted (notes refresh when the window regains focus).
