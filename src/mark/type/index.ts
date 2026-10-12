export type PeisarEmphasisLevel = "Italic" | "Bold";
export type PeisarTableCellAlignment = "Default" | "Left" | "Center" | "Right";
export type PeisarTableCellAlignments = PeisarTableCellAlignment[];
export type PeisarTaskState = "Unchecked" | "Checked";
/**
 * Options that control how Markdown is parsed.
 *
 * # Defaults
 *
 * Both GFM and Kramdown extensions are enabled by default.  To parse
 * strict CommonMark only:
 */
export interface AstOptions {
	/**
	 * Enable GitHub Flavored Markdown (tables, strikethrough, task lists,
	 * autolinks).  Default: `true`.
	 */
	gfm: boolean;
	/**
	 * Enable Kramdown-style block attributes (`{:#id .class key="val"}`).
	 * Default: `true`.
	 */
	kramdown: boolean;
	/**
	 * Optional file name to attach to the parsed
	 * [`Document`](crate::markdown::ast::Document).
	 */
	fileName?: string;
}

/** Parsed Kramdown block attributes (`{:#id .class key="val"}`). */
export interface Attributes {
	/** HTML `id` attribute. */
	id?: string;
	/** CSS class list. */
	classes?: Array<string>;
	/** Arbitrary key/value attributes. */
	attributes?: Array<[string, string]>;
}

/** Block-level nodes. */
export type Block =
	| {
			type: "Heading" /** Heading level (1–6). */;
			level: number /** Inline content of the heading. */;
			children: Array<Inline> /** Source span. */;
			pos: Span /** Optional Kramdown attributes. */;
			attrs?: Attributes;
	  }
	| {
			type: "Paragraph" /** Inline content of the paragraph. */;
			children: Array<Inline> /** Source span. */;
			pos: Span /** Optional Kramdown attributes. */;
			attrs?: Attributes;
	  }
	| {
			type: "CodeBlock" /** Language hint from the info string (e.g. `rust` from ` ```rust `). */;
			lang?: string /** The raw code content. */;
			code: string /** Source span. */;
			pos: Span /** Optional Kramdown attributes. */;
			attrs?: Attributes;
	  }
	| {
			type: "BlockQuote" /** Nested block content inside the quote. */;
			children: Array<Block> /** Source span. */;
			pos: Span /** Optional Kramdown attributes. */;
			attrs?: Attributes;
	  }
	| {
			type: "List" /** `true` for ordered lists, `false` for unordered. */;
			ordered: boolean /** The list items. */;
			items: Array<ListItem> /** Source span. */;
			pos: Span /** Optional Kramdown attributes. */;
			attrs?: Attributes;
	  }
	| { type: "ThematicBreak" /** Source span. */; pos: Span }
	| {
			type: "HtmlBlock" /** The raw HTML content. */;
			html: string /** Source span. */;
			pos: Span /** Optional Kramdown attributes. */;
			attrs?: Attributes;
	  }
	| {
			type: "Table" /** The table structure (header, rows, alignments). */;
			table: Table /** Source span. */;
			pos: Span /** Optional Kramdown attributes. */;
			attrs?: Attributes;
	  }
	| {
			type: "LinkReferenceDefinition" /** Normalised label (lowercased, trimmed). */;
			label: string /** The destination URL. */;
			url: string /** Optional link title. */;
			title?: string /** Source span. */;
			pos: Span;
	  }
	| {
			type: "Comment" /** The comment text (markers stripped). */;
			value: string /** Source span. */;
			pos: Span;
	  };

/**
 * Synchronous block-visitor callback. Receives a `Block`, returns
 * `VisitControlJs` (or `undefined` for no changes).
 */
export type BlockCallback = (arg: [Block]) => VisitorControl | null | undefined;

/**
 * Synchronous block parser hook. Receives a [`BlockParseContext`], returns
 * a [`BlockParseResultJs`] (or `undefined` to decline).
 */
export type BlockParseCallback = (
	arg: [BlockParserContext],
) => BlockParseResult | null | undefined;

export interface BlockParserContext {
	/** The current (unmodified) source line. */
	line: string;
	/** 0-based index of the current line in the (sub-)document. */
	lineIndex: number;
	/** Remaining lines starting at the current line (`lines[0]` is `line`). */
	lines: Array<string>;
}

/**
 * Result returned from the JS `parseBlock` callback.
 *
 * All fields are optional; omitting `block` (or returning `undefined`)
 * declines the position so the next hook / built-in parser handles it.
 */
export interface BlockParseResult {
	/** The parsed block node. */
	block?: Block;
	/** Number of source lines consumed (must be at least `1`). */
	consumed?: number;
}

/**
 * A Markdown document — the root of the AST.
 *
 * Contains the top-level block children and all link reference definitions
 * collected from the source text.
 */
export interface Document {
	/** Always `"root"`. */
	nodeType: string;
	/** Optional source file name. */
	fileName?: string;
	/** Span of the whole document in the source text. */
	pos: Span;
	/** Top-level block children. */
	children: Array<Block>;
	/** All link reference definitions collected from the document. */
	linkReferences: Array<LinkReferenceDefinition>;
}
/** The Markdown body and YAML metadata parsed from a front-matter document. */
export interface FrontmatterResult {
	/** Markdown source after the leading YAML front matter is removed. */
	pureMarkdownContent: string;
	/** Deserialized YAML front matter, or `null` when no front matter exists. */
	// biome-ignore lint/suspicious/noExplicitAny: any
	yamlData?: Record<string, any>;
}

/** Inline-level nodes. */
export type Inline =
	| {
			type: "Text" /** The text value. */;
			value: string /** Source span. */;
			pos: Span;
	  }
	| {
			type: "Emphasis" /** Emphasis level (italic or bold). */;
			level: PeisarEmphasisLevel /** Nested inline content. */;
			children: Array<Inline> /** Source span. */;
			pos: Span;
	  }
	| {
			type: "Code" /** The code text. */;
			code: string /** Source span. */;
			pos: Span;
	  }
	| {
			type: "HtmlInline" /** The raw HTML string. */;
			html: string /** Source span. */;
			pos: Span;
	  }
	| {
			type: "Strikethrough" /** Nested inline content. */;
			children: Array<Inline> /** Source span. */;
			pos: Span;
	  }
	| { type: "HardBreak" /** Source span. */; pos: Span }
	| { type: "SoftBreak" /** Source span. */; pos: Span }
	| {
			type: "Image" /** Alternative text. */;
			alt: string /** Image URL. */;
			url: string /** Optional title. */;
			title?: string /** Source span. */;
			pos: Span;
	  }
	| {
			type: "Link" /** Link text (inline children). */;
			text: Array<Inline> /** Destination URL. */;
			url: string /** Optional link title. */;
			title?: string /** `true` if this is a GFM autolink (bare URL). */;
			autolink: boolean /** Source span. */;
			pos: Span;
	  }
	| {
			type: "LinkReference" /** Link text (inline children). */;
			text: Array<Inline> /** Normalised label used to look up the reference. */;
			label: string /** Resolved destination URL. */;
			url: string /** Optional resolved title. */;
			title?: string /** Source span. */;
			pos: Span;
	  };

/**
 * Synchronous inline-visitor callback. Receives an `Inline`, returns
 * `InlineVisitControlJs` (or `undefined` for no changes).
 */
export type InlineCallback = (
	arg: [Inline],
) => InlineVisitorControl | null | undefined;

/**
 * Synchronous inline parser hook. Receives an [`InlineParseContext`],
 * returns an [`InlineParseResultJs`] (or `undefined` to decline).
 */
export type InlineParseCallback = (
	arg: [InlineParserContext],
) => InlineParseResult | null | undefined;

/**
 * Context passed to inline parser hooks.
 *
 * On the JavaScript side the fields are exposed as `rest` and `index`.
 */
export interface InlineParserContext {
	/** Remaining inline text starting at the current character position. */
	rest: string;
	/** 0-based character index of the current position in the inline text. */
	index: number;
}

/**
 * Result returned from the JS `parseInline` callback.
 *
 * All fields are optional; omitting `inline` (or returning `undefined`)
 * declines the position so the next hook / built-in parser handles it.
 */
export interface InlineParseResult {
	/** The parsed inline node. */
	inline?: Inline;
	/** Number of characters consumed (`0` or missing declines). */
	consumed?: number;
}

/**
 * JS-facing mirror of [`InlineVisitControl`].
 *
 * Returned from the JS `visitInline` callback.  All fields are optional;
 * omitting a field means "no change" for that operation.
 */
export interface InlineVisitorControl {
	/** Nodes to insert before the current node. */
	insertBefore?: Array<Inline>;
	/** Nodes to insert after the current node. */
	insertAfter?: Array<Inline>;
	/** Replace the current node with these nodes. */
	replaceWith?: Array<Inline>;
	/** Remove the current node entirely. */
	remove?: boolean;
	/** Whether to recurse into this node's children. */
	recurse?: boolean;
}

/** A link reference definition collected at the document level. */
export interface LinkReferenceDefinition {
	/** Normalised label (lowercased, trimmed). */
	label: string;
	/** The destination URL. */
	url: string;
	/** Optional link title. */
	title?: string;
	/** Source span. */
	pos: Span;
}

/** A single list item (an `<li>`). Contains nested block content. */
export interface ListItem {
	/** Nested block content of the item. */
	children: Array<Block>;
	/** GFM task-list state: `None` = not a task, `Some` = checked / unchecked. */
	task?: PeisarTaskState;
	/** Span of the item in the *sub-document* of its enclosing list. */
	pos: Span;
}
/** Either property may be omitted / `null` to skip that phase. */
export interface Parser {
	/** Optional JS block parser hook (JS: `parseBlock`). */
	parseBlock?: BlockParseCallback;
	/** Optional JS inline parser hook (JS: `parseInline`). */
	parseInline?: InlineParseCallback;
}

/**
 * JavaScript options for Markdown parsing and HTML rendering.
 *
 * Every property is optional.  Omitted parsing options enable GFM and
 * Kramdown; omitted rendering options produce a complete HTML document with
 * charset and viewport metadata.
 *
 * # Defaults
 *
 * | Property   | Default     |
 * |------------|-------------|
 * | `gfm`      | `true`      |
 * | `kramdown` | `true`      |
 * | `fragment` | `false` (full document) |
 * | `charset`  | `true`      |
 * | `viewport` | `true`      |
 * | `file_name`, `title`, `body_class`, `style` | `null` |
 */
export interface PeisarOptions {
	/**
	 * Enable GitHub Flavored Markdown (tables, strikethrough, task lists,
	 * autolinks).  Default: `true`.
	 */
	gfm?: boolean;
	/**
	 * Enable Kramdown-style block attributes (`{:#id .class key="val"}`).
	 * Default: `true`.
	 */
	kramdown?: boolean;
	/**
	 * Optional file name to attach to the parsed
	 * [`Document`](crate::markdown::ast::Document).
	 */
	fileName?: string;
	/**
	 * If `true`, emit only the body content (no `<!DOCTYPE>`, `<html>`,
	 * `<head>`, or `<body>` wrapper).  If `false`, emit a full HTML
	 * document.  Default: `true` (fragment).
	 */
	fragment?: boolean;
	/**
	 * Include a `<meta charset="utf-8">` in the head (only relevant when
	 * `fragment` is `false`).  Default: `true`.
	 */
	charset?: boolean;
	/**
	 * Include a `<meta name="viewport" content="width=device-width,
	 * initial-scale=1.0">` in the head (only relevant when `fragment` is
	 * `false`).  Default: `true`.
	 */
	viewport?: boolean;
	/**
	 * Optional `<title>` for the HTML head (only relevant when
	 * `fragment` is `false`).  Default: `None`.
	 */
	title?: string;
	/**
	 * Optional additional CSS classes to add to `<body>` (only relevant
	 * when `fragment` is `false`).  Default: `None`.
	 */
	bodyClass?: string;
	/**
	 * Optional inline CSS to inject in a `<style>` tag in the head.
	 * Default: `None`.
	 */
	style?: string;
}

export interface Plugin {
	/** Optional JS callback for block nodes (JS: `visitBlock`). */
	visitBlock?: BlockCallback;
	/** Optional JS callback for inline nodes (JS: `visitInline`). */
	visitInline?: InlineCallback;
	/** Optional JS block parser hook (JS: `parseBlock`). */
	parseBlock?: BlockParseCallback;
	/** Optional JS inline parser hook (JS: `parseInline`). */
	parseInline?: InlineParseCallback;
}

/** A zero-based point in the source text. */
export interface Position {
	/** Line number, 0-based. */
	line: number;
	/** Column number, 0-based (in characters). */
	column: number;
	/** Byte offset from the start of the input. */
	offset: number;
}

/** Options that control how the AST is rendered to HTML. */
export interface RenderOptions {
	/**
	 * If `true`, emit only the body content (no `<!DOCTYPE>`, `<html>`,
	 * `<head>`, or `<body>` wrapper).  If `false`, emit a full HTML
	 * document.  Default: `true` (fragment).
	 */
	fragment: boolean;
	/**
	 * Include a `<meta charset="utf-8">` in the head (only relevant when
	 * `fragment` is `false`).  Default: `true`.
	 */
	charset: boolean;
	/**
	 * Include a `<meta name="viewport" content="width=device-width,
	 * initial-scale=1.0">` in the head (only relevant when `fragment` is
	 * `false`).  Default: `true`.
	 */
	viewport: boolean;
	/**
	 * Optional `<title>` for the HTML head (only relevant when
	 * `fragment` is `false`).  Default: `None`.
	 */
	title?: string;
	/**
	 * Optional additional CSS classes to add to `<body>` (only relevant
	 * when `fragment` is `false`).  Default: `None`.
	 */
	bodyClass?: string;
	/**
	 * Optional inline CSS to inject in a `<style>` tag in the head.
	 * Default: `None`.
	 */
	style?: string;
}

/**
 * A half-open span `[start, end)` covering a node's source text.
 *
 * `start` is inclusive and `end` is exclusive; both positions point into the
 * original source string.
 */
export interface Span {
	/** The start position (inclusive). */
	start: Position;
	/** The end position (exclusive). */
	end: Position;
}

/** A GFM table. */
export interface Table {
	/** The header row. */
	header: TableRow;
	/** Body rows. */
	rows: Array<TableRow>;
	/** Column alignment specifications (one per column). */
	alignments: PeisarTableCellAlignments;
}

/** A single table cell. */
export interface TableCell {
	/** Inline content of the cell. */
	children: Array<Inline>;
}

/** A single table row (header or body). */
export interface TableRow {
	/** The cells in this row. */
	cells: Array<TableCell>;
}

/**
 * JavaScript object shape for a visitor callback pair.
 *
 * On the JS side it is a plain object with two optional
 * function properties:
 *
 * ```js
 * const myPlugin = {
 *   visitBlock(block)  { return { recurse: true }; },
 *   visitInline(inline) { return {}; },
 * };
 * ast.addVisitor(myPlugin);
 * ```
 *
 * Either property may be omitted / `null` to skip that node kind.
 */
export interface Visitor {
	/** Optional JS callback for block nodes (JS: `visitBlock`). */
	visitBlock?: BlockCallback;
	/** Optional JS callback for inline nodes (JS: `visitInline`). */
	visitInline?: InlineCallback;
}

/**
 * JS-facing mirror of [`VisitControl`].
 *
 * Returned from the JS `visitBlock` callback.  All fields are optional;
 * omitting a field means "no change" for that operation.
 */
export interface VisitorControl {
	/** Nodes to insert before the current node. */
	insertBefore?: Array<Block>;
	/** Nodes to insert after the current node. */
	insertAfter?: Array<Block>;
	/** Replace the current node with these nodes. */
	replaceWith?: Array<Block>;
	/** Remove the current node entirely. */
	remove?: boolean;
	/** Whether to recurse into this node's children. */
	recurse?: boolean;
}
