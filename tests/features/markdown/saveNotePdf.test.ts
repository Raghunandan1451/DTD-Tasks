import { describe, expect, it, vi } from "vitest";
import { pdfExists, pdfPathFor, saveNotePdf } from "@src/features/markdown/lib/saveNotePdf";

describe("saving a note as PDF", () => {
	it("puts the PDF in Notes/pdf, mirroring the note's folders", () => {
		expect(pdfPathFor("docs/ideas.md")).toBe("Notes/pdf/docs/ideas.pdf");
		expect(pdfPathFor("a:b.md")).toBe("Notes/pdf/a_b.pdf");
	});

	it("writes real PDF bytes", async () => {
		const writeBinary = vi.fn(async () => {});
		const target = await saveNotePdf(
			{ fs: { writeBinary } } as never,
			{ path: "a.md", content: "# Hello\n\ntext" },
			"a.md",
		);
		expect(target).toBe("Notes/pdf/a.pdf");
		const [, base64] = writeBinary.mock.calls[0] as unknown as [string, string];
		expect(atob(base64).startsWith("%PDF-")).toBe(true);
	});

	it("knows when the PDF already exists, ignoring letter case", async () => {
		const list = vi.fn(async () => [{ name: "A.PDF", kind: "file", size: 1, modifiedMs: 0 }]);
		expect(await pdfExists({ fs: { list } } as never, "a.md")).toBe(true);
		expect(list).toHaveBeenCalledWith("Notes/pdf");
		const none = vi.fn(async () => []);
		expect(await pdfExists({ fs: { list: none } } as never, "a.md")).toBe(false);
	});
});
