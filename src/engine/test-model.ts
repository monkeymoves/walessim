/** Test helper: the real model compiled from model/ once per test process. */
import type { CompiledModel } from "../model/schema";
import { compileFromDisk } from "../../scripts/model-files";

let cached: CompiledModel | null = null;
export function testModel(): CompiledModel {
  if (cached) return cached;
  const r = compileFromDisk();
  if (!r.model) throw new Error("model does not compile:\n" + r.errors.join("\n"));
  cached = r.model;
  return cached;
}
