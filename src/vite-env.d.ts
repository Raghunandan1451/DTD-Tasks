/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** "desktop" in the Electron build, unset on the web. */
	readonly VITE_TARGET?: string;
}
