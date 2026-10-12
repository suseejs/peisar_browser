import type {
	Attributes,
	Block,
	BlockParseResult,
	BlockParserContext,
	Inline,
	InlineParseResult,
	InlineParserContext,
	Parser,
	Span,
} from "../type/index.js";

// ---------------------------------------------------------------------------
// Hook registry
// ---------------------------------------------------------------------------

/**
 * Ordered registry of `AstParser` hooks, threaded through the block and
 * inline parsers.
 *
 * Hooks are tried in registration order; the first hook to claim a position
 * wins.
 */
export class ParseHooks {
	private readonly parsers: Parser[] = [];

	/** An empty registry — no hooks run (the default when none registered). */
	static empty(): ParseHooks {
		return new ParseHooks();
	}

	/** Register a hook (appended after any existing hooks). */
	push(parser: Parser): void {
		this.parsers.push(parser);
	}

	/** Chainable `push` — returns the registry so calls can be chained:
	 * `ParseHooks.empty().with(a).with(b)`. */
	with(parser: Parser): this {
		this.parsers.push(parser);
		return this;
	}

	/** `true` when no hooks are registered. */
	isEmpty(): boolean {
		return this.parsers.length === 0;
	}

	/** Try every registered block hook in order. */
	tryParseBlock(ctx: BlockParserContext): BlockParseResult | undefined | null {
		for (const parser of this.parsers) {
			const result = parser.parseBlock?.([ctx]);
			if (result !== undefined) {
				return result;
			}
		}
		return undefined;
	}

	/** Try every registered inline hook in order. */
	tryParseInline(
		ctx: InlineParserContext,
	): InlineParseResult | undefined | null {
		for (const parser of this.parsers) {
			const result = parser.parseInline?.([ctx]);
			if (result !== undefined) {
				return result;
			}
		}
		return undefined;
	}
}

// ---------------------------------------------------------------------------
// Node finalisation helpers
// ---------------------------------------------------------------------------

/**
 * Overwrite a hook-returned block's source span (computed from the number
 * of consumed lines) and apply a Kramdown `{:...}` attribute block if one
 * follows the block in the source.  Existing `attrs` on the node are kept
 * unless trailing attributes are found.  Variants without an `attrs` field
 * (`thematic_break`, `link_reference_definition`, `comment`) only get their
 * `pos` overwritten.
 */
export function finalizeHookBlock(
	block: Block,
	pos: Span,
	trailingAttrs?: Attributes | undefined,
): Block {
	switch (block.type) {
		case "Heading":
		case "Paragraph":
		case "CodeBlock":
		case "BlockQuote":
		case "List":
		case "HtmlBlock":
		case "Table":
			return { ...block, pos, attrs: trailingAttrs ?? block.attrs };
		case "ThematicBreak":
		case "LinkReferenceDefinition":
		case "Comment":
			return { ...block, pos };
	}
}

/**
 * Overwrite a hook-returned inline node's source span (computed from the
 * number of consumed characters).
 */
export function finalizeHookInline(node: Inline, pos: Span): Inline {
	return { ...node, pos } as Inline;
}
