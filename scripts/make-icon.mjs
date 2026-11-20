// Draws the app icon (a rounded tile with a checklist) and writes build/icon.png and build/icon.ico.
// No dependencies: PNG is encoded with zlib, and the ICO holds PNG images. Run: node scripts/make-icon.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc32 = (buf) => {
	let c = 0xffffffff;
	for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const out = Buffer.alloc(12 + data.length);
	out.writeUInt32BE(data.length, 0);
	out.write(type, 4, "ascii");
	data.copy(out, 8);
	out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
	return out;
};
const png = (size, rgba) => {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(size, 0);
	header.writeUInt32BE(size, 4);
	header[8] = 8;
	header[9] = 6; // 8-bit RGBA
	const raw = Buffer.alloc((size * 4 + 1) * size);
	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0;
		rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
	}
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(raw, { level: 9 })),
		chunk("IEND", Buffer.alloc(0)),
	]);
};

// Shapes in a 0..1 square: returns an [r,g,b,a] colour for a point, or null for transparent.
const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
	const cx = Math.min(Math.max(x, x0 + r), x1 - r);
	const cy = Math.min(Math.max(y, y0 + r), y1 - r);
	return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const distToSegment = (px, py, ax, ay, bx, by) => {
	const dx = bx - ax, dy = by - ay;
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const sample = (x, y) => {
	if (!inRoundRect(x, y, 0.04, 0.04, 0.96, 0.96, 0.22)) return null;
	const t = (x + y) / 2;
	let color = [14 + 30 * t, 165 - 60 * t, 233 - 20 * t, 255]; // cyan to blue
	const rows = [0.3, 0.5, 0.7];
	for (const cy of rows) {
		// check mark
		const w = 0.045;
		if (
			distToSegment(x, y, 0.2, cy, 0.25, cy + 0.05) < w * 0.7 ||
			distToSegment(x, y, 0.25, cy + 0.05, 0.33, cy - 0.05) < w * 0.7
		) color = [255, 255, 255, 255];
		// task line
		if (inRoundRect(x, y, 0.42, cy - 0.028, 0.8, cy + 0.028, 0.028)) color = [255, 255, 255, 235];
	}
	return color;
};
const render = (size) => {
	const ss = 4; // 4x4 samples per pixel
	const out = Buffer.alloc(size * size * 4);
	for (let py = 0; py < size; py++) {
		for (let px = 0; px < size; px++) {
			let r = 0, g = 0, b = 0, a = 0;
			for (let sy = 0; sy < ss; sy++) {
				for (let sx = 0; sx < ss; sx++) {
					const c = sample((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
					if (!c) continue;
					const al = c[3] / 255;
					r += c[0] * al; g += c[1] * al; b += c[2] * al; a += al;
				}
			}
			const n = ss * ss;
			const o = (py * size + px) * 4;
			out[o] = a ? Math.round(r / a) : 0;
			out[o + 1] = a ? Math.round(g / a) : 0;
			out[o + 2] = a ? Math.round(b / a) : 0;
			out[o + 3] = Math.round((a / n) * 255);
		}
	}
	return out;
};

const sizes = [256, 128, 64, 48, 32, 16];
const images = sizes.map((s) => png(s, render(s)));
mkdirSync("build", { recursive: true });
writeFileSync("build/icon.png", png(512, render(512)));

const head = Buffer.alloc(6);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
const dir = Buffer.alloc(16 * sizes.length);
let offset = 6 + dir.length;
sizes.forEach((s, i) => {
	const o = i * 16;
	dir[o] = s === 256 ? 0 : s;
	dir[o + 1] = s === 256 ? 0 : s;
	dir.writeUInt16LE(1, o + 4);
	dir.writeUInt16LE(32, o + 6);
	dir.writeUInt32LE(images[i].length, o + 8);
	dir.writeUInt32LE(offset, o + 12);
	offset += images[i].length;
});
writeFileSync("build/icon.ico", Buffer.concat([head, dir, ...images]));
console.log("wrote build/icon.png and build/icon.ico");
