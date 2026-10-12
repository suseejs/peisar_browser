/**
 * GFM table parsing helpers.
 */

import type {
	AstOptions,
	Block,
	PeisarTableCellAlignment,
	Table,
	TableCell,
	TableRow,
} from "../type/index.js";
import type { ParseHooks } from "./hooks.js";
import { parseInlineWithHooks } from "./inline.js";
import { defaultSpan } from "./span.js";

/**
 * Returns `true` when `line` is a GFM table delimiter row — cells that
 * contain only `-` and `:` with at least one `-` per cell, optionally
 * surrounded by pipes: `| :--- | :---: | ---: |`.
 *
 * Leading/trailing whitespace and pipes are ignored; every cell must be
 * non-empty.
 */
export function isTableDelimiter(line: string): boolean {
	const stripped = line.trim();
	if (stripped === "") {
		return false;
	}
	// remove leading/trailing pipe
	let s = stripped.startsWith("|") ? stripped.slice(1) : stripped;
	if (s.endsWith("|")) {
		s = s.slice(0, -1);
	}

	const cells = s.split("|");
	if (cells.length === 0) {
		return false;
	}
	return cells.every((c) => {
		const t = c.trim();
		return t !== "" && /^[:-]+$/.test(t) && t.includes("-");
	});
}

/**
 * Check whether a line could be the start of a GFM table.
 * A table requires at least one pipe `|` on the current line and a
 * delimiter row (consisting of `-`, `:`, `|`, and whitespace) on the
 * next line.
 */
export function isTableStart(lines: readonly string[], pos: number): boolean {
	if (pos + 1 >= lines.length) {
		return false;
	}
	const header = lines[pos] as string;
	const delimiter = lines[pos + 1] as string;
	return header.includes("|") && isTableDelimiter(delimiter);
}

/**
 * Parse a delimiter row into column alignments.
 *
 * Each cell maps to one `PeisarTableCellAlignment`: `:---` → left, `:---:` →
 * center, `---:` → right, and `---` (no colons) → default.
 */
export function parseDelimiterAlignments(
	line: string,
): PeisarTableCellAlignment[] {
	const stripped = line.trim();
	let s = stripped.startsWith("|") ? stripped.slice(1) : stripped;
	if (s.endsWith("|")) {
		s = s.slice(0, -1);
	}

	return s.split("|").map((cell): PeisarTableCellAlignment => {
		const t = cell.trim();
		const left = t.startsWith(":");
		const right = t.endsWith(":");
		if (left && right) return "Center";
		if (left) return "Left";
		if (right) return "Right";
		return "Default";
	});
}

/**
 * Split a table row into raw cell strings (pipes removed, leading/trailing
 * whitespace trimmed).
 *
 * Leading and trailing pipes are optional.
 */
export function splitTableRow(line: string): string[] {
	const stripped = line.trim();
	let s = stripped.startsWith("|") ? stripped.slice(1) : stripped;
	if (s.endsWith("|")) {
		s = s.slice(0, -1);
	}
	return s.split("|").map((c) => c.trim());
}

/**
 * Build a `Table` block from lines `[headerLine, delimiterLine, ...bodyLines]`.
 *
 * Header and body cells are parsed as inline content with the given options
 * and hooks (so inline hooks apply inside table cells).
 */
export function buildTable(
	headerLine: string,
	_delimiterLine: string,
	alignments: PeisarTableCellAlignment[],
	bodyLines: readonly string[],
	options?: AstOptions,
	hooks?: ParseHooks,
): Block {
	const headerCells = splitTableRow(headerLine);
	const header: TableRow = {
		cells: headerCells.map(
			(c): TableCell => ({
				children: parseInlineWithHooks(c, options, undefined, hooks),
			}),
		),
	};

	const rows: TableRow[] = bodyLines.map((line) => {
		const cells = splitTableRow(line);
		return {
			cells: cells.map(
				(c): TableCell => ({
					children: parseInlineWithHooks(c, options, undefined, hooks),
				}),
			),
		};
	});

	const table: Table = { header, rows, alignments };
	return {
		type: "Table",
		table,
		attrs: undefined,
		pos: defaultSpan(),
	};
}
