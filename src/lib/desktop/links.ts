/** Where the Windows installer of the desktop app is published (the newest release). */
export const DESKTOP_APP_DOWNLOAD_URL =
	"https://github.com/Raghunandan1451/DTD-Tasks/releases/latest";

const LATEST_RELEASE_API =
	"https://api.github.com/repos/Raghunandan1451/DTD-Tasks/releases/latest";

interface ReleaseAsset {
	name: string;
	browser_download_url: string;
}

/** Which installer file suits this computer, or null when we can't be sure. */
export async function pickInstaller(
	assets: ReleaseAsset[],
	nav: Pick<Navigator, "userAgent"> & { userAgentData?: unknown } = navigator,
): Promise<ReleaseAsset | null> {
	const ua = nav.userAgent;
	if (/android|iphone|ipad|ipod/i.test(ua)) return null;
	const find = (test: (name: string) => boolean) =>
		assets.find((a) => test(a.name.toLowerCase())) ?? null;

	if (/windows/i.test(ua)) return find((n) => n.endsWith(".exe"));
	if (/linux|x11/i.test(ua)) return find((n) => n.endsWith(".appimage"));
	if (/mac/i.test(ua)) {
		// Only Chromium can tell Apple chips from Intel; otherwise let the person choose.
		const data = nav.userAgentData as
			| { getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }> }
			| undefined;
		let arch: string | undefined;
		try {
			arch = (await data?.getHighEntropyValues?.(["architecture"]))?.architecture;
		} catch {
			arch = undefined;
		}
		if (!arch) return null;
		const want = arch === "arm" ? "arm64" : "x64";
		return find((n) => n.endsWith(".dmg") && n.includes(want));
	}
	return null;
}

/**
 * Where the "Get desktop app" button should go: the installer for this computer
 * when the newest release has one, otherwise the release page to choose from.
 */
export async function resolveDesktopDownload(): Promise<string> {
	try {
		const response = await fetch(LATEST_RELEASE_API, {
			headers: { Accept: "application/vnd.github+json" },
		});
		if (!response.ok) return DESKTOP_APP_DOWNLOAD_URL;
		const release = (await response.json()) as { assets?: ReleaseAsset[] };
		const asset = await pickInstaller(release.assets ?? []);
		return asset?.browser_download_url ?? DESKTOP_APP_DOWNLOAD_URL;
	} catch {
		return DESKTOP_APP_DOWNLOAD_URL;
	}
}
