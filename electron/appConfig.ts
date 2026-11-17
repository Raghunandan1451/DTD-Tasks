import { promises as fs } from "node:fs";
import path from "node:path";

/** Small settings file in the app's own data directory, outside the user's folder. */
export interface AppConfig {
	dataFolder?: string;
}

export async function readConfig(configDir: string): Promise<AppConfig> {
	try {
		const raw = await fs.readFile(path.join(configDir, "config.json"), "utf8");
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === "object") {
			const folder = (parsed as AppConfig).dataFolder;
			return typeof folder === "string" && folder ? { dataFolder: folder } : {};
		}
	} catch {
		/* missing or unreadable: start fresh */
	}
	return {};
}

export async function writeConfig(configDir: string, config: AppConfig): Promise<void> {
	await fs.mkdir(configDir, { recursive: true });
	const target = path.join(configDir, "config.json");
	const tmp = `${target}.tmp`;
	await fs.writeFile(tmp, JSON.stringify(config, null, 2), "utf8");
	await fs.rename(tmp, target);
}
