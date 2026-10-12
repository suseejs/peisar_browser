import type { PeisarOptions, Plugin } from "./mark/type/index.js";
import { PeisarAst } from "./mark/ast/index.js";
import { renderDocumentHtml } from "./mark/html/index.js";

class Peisar {
  private _opts: Partial<PeisarOptions> | undefined;
  private _ast: PeisarAst;
  constructor(rawMd: string, options?: Partial<PeisarOptions>) {
    this._opts = options ?? undefined;
    this._ast = new PeisarAst(rawMd, this._opts);
  }
  usePligin(plugin: Plugin) {
    this._ast.use(plugin);
  }
  get html() {
    this._ast.parsePlugins();
    return renderDocumentHtml(this._ast.ast, this._opts);
  }
  get frontmatter() {
    this._ast.parsePlugins();
    return this._ast.frontmatter;
  }
  get ast() {
    this._ast.parsePlugins();
    return this._ast.ast;
  }
}

export { Peisar };
