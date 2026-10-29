/** An upload failure whose message is safe and useful to show to the user as-is. */
export class UploadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UploadError";
	}
}
