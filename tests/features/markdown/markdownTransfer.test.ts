import { describe, expect, it } from "vitest";
import { parseMarkdownJSON } from "@src/features/markdown/lib/markdownTransfer";

describe("Markdown JSON transfer", () => {
	it("accepts nested Markdown files and folders", () => {
		const files = [
			{
				path: "Notes",
				type: "folder",
				children: [
					{
						path: "idea.md",
						type: "file",
						content: "Draft",
					},
				],
			},
		];

		const [folder] = parseMarkdownJSON({ files });

		expect(folder).toMatchObject({ path: "Notes", type: "folder" });
		expect(folder.id).toEqual(expect.any(String));
		expect(folder.type === "folder" && folder.children[0].id).toEqual(
			expect.any(String),
		);
	});

	it("keeps ids that backups already contain", () => {
		const files = [{ id: "a1", path: "idea.md", type: "file", content: "" }];

		expect(parseMarkdownJSON({ files })).toEqual(files);
	});

	it("ignores a leftover events key from old backups", () => {
		const files = [{ path: "idea.md", type: "file", content: "Draft" }];

		expect(parseMarkdownJSON({ files, events: [{ id: 1 }] })).toEqual([
			{ ...files[0], id: expect.any(String) },
		]);
	});

	it("rejects malformed Markdown data", () => {
		expect(() => parseMarkdownJSON({ files: [{ path: "bad.md" }] })).toThrow(
			"Markdown JSON contains an invalid file tree.",
		);
		expect(() => parseMarkdownJSON({ events: [] })).toThrow(
			"Choose a valid Markdown JSON file.",
		);
	});
});
