# AIOLists

AIOLists is a productivity-focused web app that bundles multiple everyday tools like a **QR code generator**, **tabular to-do list**, and **markdown editor**—with more tools planned for future updates. Built using **React + TypeScript** and powered by **Redux**, it ensures smooth state management with features like **24-hour auto data deletion** and easy **data downloads**.

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
git clone https://github.com/Raghunandan1451/AIOLists
cd AIOLists
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
