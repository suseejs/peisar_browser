import { type FrontMatterResult, frontmatter } from "../../fm/index.js";
import type {
	AstOptions,
	Document,
	Parser,
	Plugin,
	Visitor,
} from "../type/index.js";
import { ParseHooks } from "./hooks.js";
import { DEFAULT_AST_OPTIONS, resolveAstOptions } from "./options.js";
import { parseMd } from "./parse_md.js";
import { AstPluginRegister, ParserPluginRegister } from "./plugins.js";
import { parseAstVisitor } from "./visitor.js";

/**
 * The low-level Markdown-to-AST engine: parses the source into a
 * `Document` and manages the plugin registry (AST visitors and parser
 * hooks).
 *
 * This is the class behind the `Pepamark` facade. The document is
 * parsed once in the constructor and re-parsed whenever plugins are
 * applied (see {@link PeisarAst.parsePlugins}); because re-parsing
 * always restarts from the raw source, parser plugins can be registered
 * and removed at any time.
 *
 * @typeParam T The expected shape of the parsed YAML front matter
 * (`Record<string, any>` by default).
 */

export class PeisarAst {
	private _ast: Document;
	private _hooks: ParseHooks;
	private _options: AstOptions;
	private _visitors: Visitor[];
	private _parsers: Parser[];
	private _rawMd: string;
	private _fm: FrontMatterResult<Record<string, unknown>>;
	private _content: string;
	private _data: Record<string, unknown>;
	/**
	 * Create a new AST engine for the given Markdown source.
	 *
	 * The source is parsed immediately; any plugins registered later are
	 * applied by re-parsing the original input (see {@link parsePlugins}).
	 *
	 * @param rawMd The raw Markdown source text (may include a YAML front
	 * matter block delimited by `---`).
	 * @param options Partial parse options; missing fields fall back to
	 * `DEFAULT_AST_OPTIONS` (GFM and Kramdown on, no file name).
	 */
	constructor(rawMd: string, options?: Partial<AstOptions>) {
		this._rawMd = rawMd;
		this._hooks = new ParseHooks();
		this._options = resolveAstOptions(options);
		this._fm = frontmatter(this._rawMd);
		this._content = this._fm.content;
		this._data = this._fm.data;
		this._ast = parseMd(
			this._content,
			this._options,
			this._options.fileName,
			this._hooks,
		);
		this._visitors = [];
		this._parsers = [];
	}
	/**
	 * Register one plugin or an array of plugins.
	 *
	 * `AstPlugin`s are collected as AST visitors; `ParserPlugin`s are
	 * collected as parser hooks. Registration alone does nothing visible —
	 * call {@link parsePlugins} (or read a getter) to apply them.
	 *
	 * @param plugin A plugin or array of plugins to register.
	 */
	use(plugin: Plugin | Plugin[]): void {
		if (Array.isArray(plugin)) {
			for (const p of plugin) {
				const visitor = new AstPluginRegister(p);
				this._visitors.push(visitor);
				const parser = new ParserPluginRegister(p);
				this._parsers.push(parser);
			}
		} else {
			const visitor = new AstPluginRegister(plugin);
			this._visitors.push(visitor);
			const parser = new ParserPluginRegister(plugin);
			this._parsers.push(parser);
		}
	}
	/**
	 * Apply the registered plugins to the document.
	 *
	 * The raw source is always re-parsed from scratch first (registering a
	 * new parser plugin therefore invalidates any earlier parse results),
	 * then every registered visitor runs over the freshly parsed AST, in
	 * registration order.
	 */
	parsePlugins() {
		if (this._parsers.length > 0) {
			for (const p of this._parsers) {
				this._hooks.push(p);
			}
		}
		this._ast = parseMd(
			this._content,
			this._options,
			this._options.fileName,
			this._hooks,
		);
		if (this._visitors.length > 0) {
			for (const v of this._visitors) {
				parseAstVisitor(this._ast, v);
			}
		}
	}

	/** The parsed `Document`, with the registered plugins applied (see
	 * {@link parsePlugins}). */
	public get ast(): Document {
		this.parsePlugins();
		return this._ast;
	}
	/**
	 * The parsed YAML front matter, or an empty object when the document has
	 * none. Plugin results are applied before reading.
	 */
	public get frontmatter() {
		this.parsePlugins();
		return this._data ?? {};
	}
}

export { DEFAULT_AST_OPTIONS };
