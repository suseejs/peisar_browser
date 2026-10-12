/**
 * Public API for Mark.
 *
 * @author Pho Thin Maung <https://github.com/phothinmg>
 * @license Apache-2.0
 */

import { Mark, type MarkOptions } from "./mark.js";
import type { MarkType } from "./type/index.js";
// biome-ignore lint/suspicious/noExplicitAny: any
export type PluginFactory = (...args: any[]) => MarkType.MarkPlugin;

export type { MarkOptions, MarkType };
export { Mark };
