import { describe, expect, it } from "vitest";
import { pickInstaller } from "@src/lib/desktop/links";

const asset = (name: string) => ({ name, browser_download_url: `https://x/${name}` });
const assets = [
	asset("DTDTasks-Setup-2.1.0.exe"),
	asset("DTDTasks-2.1.0-arm64.dmg"),
	asset("DTDTasks-2.1.0-x64.dmg"),
	asset("DTDTasks-2.1.0-x64.AppImage"),
	asset("DTDTasks-2.1.0-x64.deb"),
];

describe("pickInstaller", () => {
	it("picks the exe on Windows and the AppImage on Linux", async () => {
		expect((await pickInstaller(assets, { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64)" }))?.name).toBe("DTDTasks-Setup-2.1.0.exe");
		expect((await pickInstaller(assets, { userAgent: "Mozilla/5.0 (X11; Linux x86_64)" }))?.name).toBe("DTDTasks-2.1.0-x64.AppImage");
	});

	it("picks the Mac build by chip, and gives up when the chip is unknown", async () => {
		const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
		const withArch = (architecture: string) => ({
			userAgent: mac,
			userAgentData: { getHighEntropyValues: async () => ({ architecture }) },
		});
		expect((await pickInstaller(assets, withArch("arm")))?.name).toBe("DTDTasks-2.1.0-arm64.dmg");
		expect((await pickInstaller(assets, withArch("x86")))?.name).toBe("DTDTasks-2.1.0-x64.dmg");
		expect(await pickInstaller(assets, { userAgent: mac })).toBeNull();
	});

	it("gives up on phones", async () => {
		expect(await pickInstaller(assets, { userAgent: "Mozilla/5.0 (Linux; Android 14)" })).toBeNull();
	});
});
