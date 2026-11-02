import { nanoid } from "@reduxjs/toolkit";

/** UUID where the platform has one, otherwise a random id of similar strength. */
export const newId = (): string =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: nanoid();
