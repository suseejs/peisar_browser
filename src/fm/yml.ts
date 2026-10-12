/**
 * Parses YAML front matter into JavaScript values.
 */
export const yaml = (() => {
	const regex = {
		regLevel: /^([\s-]+)/,
		invalidLine: /^---|^\.\.\.|^\s*#.*|^\s*$/,
		dashesString: /^\s*"([^"]*)"\s*$/,
		quotesString: /^\s*'([^']*)'\s*$/,
		float: /^[+-]?[0-9]+\.[0-9]+(e[+-]?[0-9]+(\.[0-9]+)?)?$/,
		integer: /^[+-]?[0-9]+$/,
		array: /^\[\s*(.*)\s*\]$/,
		map: /^\{\s*(.*)\s*\}$/,
		key_value: /([a-z0-9_-][ a-z0-9_-]*):( .+)/i,
		single_key_value: /^([a-z0-9_-][ a-z0-9_-]*):( .+?)$/i,
		key: /([a-z0-9_-][ a-z0-9_-]+):( .+)?/i,
		item: /^-\s+/,
		trim: /^\s+|\s+$/,
		comment: /([^'"#]+(['"][^'"]*['"])*)*(#.*)?/,
	};

	const errors: string[] = [];
	// biome-ignore lint/suspicious/noExplicitAny: any
	const reference_blocks: { [key: string]: any } = {};

	function preProcess(str: string): string {
		const lines = str.split("\n");
		const r = regex.comment;

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i] as string;
			const m: RegExpMatchArray | null = line.match(r);
			if (m) {
				if (typeof m[3] !== "undefined") {
					line = m[0].slice(0, m[0].length - m[3].length);
				}
			}
			lines[i] = line;
		}
		return lines.join("\n");
	}

	class Block {
		parent: Block | null;
		level: number;
		length: number;
		lines: string[];
		children: Block[];
		constructor(lvl: number) {
			this.parent = null;
			this.level = lvl;
			this.length = 0;
			this.lines = [];
			this.children = [];
		}
		addChild(obj: Block) {
			this.children.push(obj);
			obj.parent = this;
			++this.length;
		}
	}

	function parser(str: string) {
		const regLevel = regex.regLevel;
		const invalidLine = regex.invalidLine;
		const lines = str.split("\n");
		let level = 0;
		let curLevel = 0;

		const blocks: Block[] = [];

		const result = new Block(-1);
		let currentBlock = new Block(0);
		result.addChild(currentBlock);

		const levels: number[] = [];
		let line = "";

		blocks.push(currentBlock);
		levels.push(level);

		for (let i = 0; i < lines.length; i++) {
			line = lines[i] as string;
			const m: RegExpMatchArray | null = regLevel.exec(line);

			if (line.match(invalidLine)) {
				continue;
			}

			if (m) {
				level = (m[1] as string).length;
			} else level = 0;

			if (level > curLevel) {
				const oldBlock = currentBlock;
				currentBlock = new Block(level);
				oldBlock.addChild(currentBlock);
				blocks.push(currentBlock);
				levels.push(level);
			} else if (level < curLevel) {
				let added = false;

				let k = levels.length - 1;
				for (; k >= 0; --k) {
					if (levels[k] === level) {
						currentBlock = new Block(level);
						blocks.push(currentBlock);
						levels.push(level);
						if ((blocks[k] as Block).parent != null)
							((blocks[k] as Block).parent as Block).addChild(currentBlock);
						added = true;
						break;
					}
				}

				if (!added) {
					errors.push(`Error: Invalid indentation at line ${i}: ${line}`);
					return;
				}
			}

			currentBlock.lines.push(line.replace(regex.trim, ""));
			curLevel = level;
		}

		return result;
	}
	// biome-ignore lint/suspicious/noExplicitAny: any
	type Value = boolean | number | Record<string, any> | string | null;
	type ValueArray = Value[];

	function processValue(val: string): Value | ValueArray {
		val = val.replace(regex.trim, "");
		const dsm = val.match(regex.dashesString);
		const qom = val.match(regex.quotesString);
		const fom = val.match(regex.float);
		const iom = val.match(regex.integer);
		const dam = Date.parse(val);
		const skvm = val.match(regex.single_key_value);
		const arm = val.match(regex.array);
		const mapm = val.match(regex.map);

		if (val === "true") {
			return true;
		} else if (val === "false") {
			return false;
		} else if (val === ".NaN") {
			return Number.NaN;
		} else if (val === "null") {
			return null;
		} else if (val === ".inf") {
			return Number.POSITIVE_INFINITY;
		} else if (val === "-.inf") {
			return Number.NEGATIVE_INFINITY;
		} else if (dsm) {
			return dsm[1] as string;
		} else if (qom) {
			return qom[1] as string;
		} else if (fom) {
			return parseFloat(fom[0]);
		} else if (iom) {
			return parseInt(iom[0], 10);
		} else if (!Number.isNaN(dam)) {
			return new Date(dam);
		} else if (skvm) {
			// biome-ignore lint/suspicious/noExplicitAny: any
			const res: Record<string, any> = {};
			res[skvm[1] as string] = processValue(skvm[2] as string);
			return res;
		} else if (arm) {
			let count = 0;
			let c = " ";
			const res = [];
			let content = "";
			let str: string | boolean = false;
			for (let j = 0; j < (arm[1] as string).length; ++j) {
				c = (arm[1] as string)[j] as string;
				if (c === "'" || c === '"') {
					if (str === false) {
						str = c;
						content += c;
						continue;
					} else if ((c === "'" && str === "'") || (c === '"' && str === '"')) {
						str = false;
						content += c;
						continue;
					}
				} else if (str === false && (c === "[" || c === "{")) {
					++count;
				} else if (str === false && (c === "]" || c === "}")) {
					--count;
				} else if (str === false && count === 0 && c === ",") {
					res.push(processValue(content));
					content = "";
					continue;
				}

				content += c;
			}

			if (content.length > 0) res.push(processValue(content));
			return res;
		} else if (mapm) {
			let count = 0;
			let c = " ";
			const res = [];
			let content = "";
			let str: string | boolean = false;
			for (let j = 0; j < (mapm[1] as string).length; ++j) {
				c = (mapm[1] as string)[j] as string;
				if (c === "'" || c === '"') {
					if (str === false) {
						str = c;
						content += c;
						continue;
					} else if ((c === "'" && str === "'") || (c === '"' && str === '"')) {
						str = false;
						content += c;
						continue;
					}
				} else if (str === false && (c === "[" || c === "{")) {
					++count;
				} else if (str === false && (c === "]" || c === "}")) {
					--count;
				} else if (str === false && count === 0 && c === ",") {
					res.push(content);
					content = "";
					continue;
				}

				content += c;
			}

			if (content.length > 0) res.push(content);
			// biome-ignore lint/suspicious/noExplicitAny: any
			const newRes: Record<string, any> = {};
			for (let j = 0; j < res.length; ++j) {
				const m = (res[j] as string).match(regex.key_value);
				if (m) {
					newRes[m[1] as string] = processValue(m[2] as string);
				}
			}

			return newRes;
		} else {
			return val;
		}
	}

	function processFoldedBlock(block: Block) {
		const lines = block.lines;
		const children = block.children;
		const str = lines.join(" ");
		const chunks = [str];
		for (let i = 0; i < children.length; ++i) {
			chunks.push(processFoldedBlock(children[i] as Block));
		}
		return chunks.join("\n");
	}
	function processLiteralBlock(block: Block) {
		const lines = block.lines;
		const children = block.children;
		let str = lines.join("\n");
		for (let i = 0; i < children.length; ++i) {
			str += processLiteralBlock(children[i] as Block);
		}
		return str;
	}
	function processBlock(blocks: Block[]) {
		// biome-ignore lint/suspicious/noExplicitAny: any
		let res: Record<string, any> = {};
		let lines: string[] | null = null;
		// biome-ignore lint/suspicious/noExplicitAny: any
		let children: any[] | null = null;
		// biome-ignore lint/suspicious/noExplicitAny: any
		let currentObj: Record<string, any> | null = null;

		let level = -1;

		const processedBlocks = [];

		var isMap = true;

		for (let j = 0; j < blocks.length; ++j) {
			if (level !== -1 && level !== (blocks[j] as Block).level) continue;

			processedBlocks.push(j);

			level = (blocks[j] as Block).level;
			lines = (blocks[j] as Block).lines;
			children = (blocks[j] as Block).children;
			currentObj = null;

			for (let i = 0; i < lines.length; ++i) {
				const line = lines[i] as string;
				const m = line.match(regex.key);
				const m2 = line.match(/^-\s*(.*)/);
				if (m) {
					let key = m[1] as string;

					if (key[0] === "-") {
						key = key.replace(regex.item, "");
						if (isMap) {
							isMap = false;
							if (typeof res.length === "undefined") {
								res = [];
							}
						}
						if (currentObj != null) res.push(currentObj);
						currentObj = {};
						isMap = true;
					}

					if (typeof m[2] !== "undefined") {
						const value = m[2].replace(regex.trim, "");
						if (value[0] === "&") {
							const nb = processBlock(children);
							if (currentObj != null) currentObj[key] = nb;
							else res[key] = nb;
							reference_blocks[value.slice(1) as string] = nb;
						} else if (value[0] === "|") {
							if (currentObj != null)
								currentObj[key] = processLiteralBlock(children.shift());
							else res[key] = processLiteralBlock(children.shift());
						} else if (value[0] === "*") {
							const v = value.slice(1);
							// biome-ignore lint/suspicious/noExplicitAny: any
							const no: Record<string, any> = {};

							if (typeof reference_blocks[v] === "undefined") {
								errors.push(`Reference "${v}" not found!`);
							} else {
								for (var k in reference_blocks[v]) {
									no[k] = reference_blocks[v][k];
								}

								if (currentObj != null) currentObj[key] = no;
								else res[key] = no;
							}
						} else if (value[0] === ">") {
							if (currentObj != null)
								currentObj[key] = processFoldedBlock(children.shift());
							else res[key] = processFoldedBlock(children.shift());
						} else {
							if (currentObj != null) currentObj[key] = processValue(value);
							else res[key] = processValue(value);
						}
					} else {
						if (currentObj != null) currentObj[key] = processBlock(children);
						else res[key] = processBlock(children);
					}
				} else if (line.match(/^-\s*$/)) {
					if (isMap) {
						isMap = false;
						if (typeof res.length === "undefined") {
							res = [];
						}
					}
					if (currentObj != null) res.push(currentObj);
					currentObj = {};
					isMap = true;
				} else if (m2) {
					if (currentObj !== null)
						currentObj.push(processValue(m2[1] as string));
					else {
						if (isMap) {
							isMap = false;
							if (typeof res.length === "undefined") {
								res = [];
							}
						}
						res.push(processValue(m2[1] as string));
					}
				}
			}

			if (currentObj !== null) {
				if (isMap) {
					isMap = false;
					if (typeof res.length === "undefined") {
						res = [];
					}
				}
				res.push(currentObj);
			}
		}

		for (let j = processedBlocks.length - 1; j >= 0; --j) {
			blocks.splice.call(blocks, processedBlocks[j] as number, 1);
		}

		return res;
	}

	function semanticAnalysis(blocks: Block) {
		const res = processBlock(blocks.children);
		return res;
	}

	/**
	 * Parses a YAML document.
	 *
	 * @typeParam T - Expected shape of the parsed document.
	 * @param str - YAML source text.
	 * @returns The parsed YAML document.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: any
	function parse<T = Record<string, any>>(str: string): T {
		const pre = preProcess(str);
		const doc = parser(pre);
		let res = {} as T;
		if (doc) {
			res = semanticAnalysis(doc) as T;
		}
		return res;
	}
	return { parse };
})();
