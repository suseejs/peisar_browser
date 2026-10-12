import type {
	Block,
	BlockParseResult,
	BlockParserContext,
	Inline,
	InlineParseResult,
	InlineParserContext,
	InlineVisitorControl,
	Parser,
	Plugin,
	Visitor,
	VisitorControl,
} from "../type/index.js";

export class AstPluginRegister implements Visitor {
	constructor(private readonly inner: Plugin) {}
	visitBlock(block: [Block]): VisitorControl {
		return this.inner.visitBlock?.(block) ?? {};
	}

	visitInline(inline: [Inline]): InlineVisitorControl {
		return this.inner.visitInline?.(inline) ?? {};
	}
}

export class ParserPluginRegister implements Parser {
	constructor(private readonly inner: Plugin) {}

	parseBlock(ctx: [BlockParserContext]): BlockParseResult | null | undefined {
		const result = this.inner.parseBlock?.(ctx);
		if (result === undefined) {
			return undefined;
		}
		return result;
	}

	parseInline(
		ctx: [InlineParserContext],
	): InlineParseResult | undefined | null {
		const result = this.inner.parseInline?.(ctx);
		if (result === undefined) {
			return undefined;
		}
		return result;
	}
}
