import type {
	AstOptions,
	Block,
	Document,
	LinkReferenceDefinition,
} from "../type/index.js";
import {
	computeLineStarts,
	isLinkRefDef,
	ParserState,
	parseLinkRefDefLine,
} from "./block.js";
import type { ParseHooks } from "./hooks.js";
import type { LinkRefMap } from "./inline.js";
export function parseMd(
	input: string,
	opts: AstOptions,
	fileName: string | undefined,
	hooks: ParseHooks | undefined,
): Document {
	const content = input;
	const file_name = fileName ?? undefined;

	const lineStarts = computeLineStarts(content);
	const lines = content
		.split("\n")
		.map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));

	// Pre-pass: collect all link reference definitions into a map so that
	// reference-style links can be resolved during inline parsing.
	const refMap: LinkRefMap = new Map();
	const refDefs: LinkReferenceDefinition[] = [];
	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const line = lines[lineIdx];
		if (line && isLinkRefDef(line)) {
			const def = parseLinkRefDefLine(line, lineIdx, lineStarts, content);
			if (def !== undefined) {
				refMap.set(def.label, [def.url, def.title]);
				refDefs.push(def);
			}
		}
	}

	const p = new ParserState(
		content,
		lines,
		lineStarts,
		opts,
		fileName,
		refMap,
		hooks,
	);
	const start = p.positionAt(0);

	const blocks: Block[] = [];
	while (!p.isDone()) {
		if (p.skipBlankLines()) {
			continue;
		}
		const block = p.parseBlock(parseMd);
		if (block !== undefined) {
			blocks.push(block);
		} else {
			p.advance(); // safety net — never loop forever
		}
	}

	const end = p.positionAt(Math.min(p.pos, lines.length));

	return {
		nodeType: "root",
		pos: { start, end },
		fileName: file_name,
		children: blocks,
		linkReferences: refDefs,
	};
}
