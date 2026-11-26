/**
 * Browser loader for the compiled model (`public/model.json`, written by `npm run model:build`).
 * The only runtime code that knows the model's location; types live in `./schema`.
 */
import type { CompiledModel } from "./schema";

/** Where the compiled model is served from (relative to the app base). */
export const MODEL_URL = "model.json";

/** A model that failed to load or is the wrong version. */
export class ModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelLoadError";
  }
}

/** The model.json schema version this build of the app understands. */
export const MODEL_VERSION = 1;

/**
 * Fetch and type the compiled model. Checks the version and the presence of the main arrays;
 * deep validation happened at build time. Pass `fetchImpl` in tests.
 */
export async function loadModel(url: string = import.meta.env?.BASE_URL ? import.meta.env.BASE_URL + MODEL_URL : MODEL_URL, fetchImpl: typeof fetch = fetch): Promise<CompiledModel> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new ModelLoadError(`Could not load the model (${res.status}) from ${url}`);
  const model = (await res.json()) as CompiledModel;
  return checkModel(model);
}

/** Light shape check of a parsed model; throws ModelLoadError on a mismatch. */
export function checkModel(model: CompiledModel): CompiledModel {
  if (!model || typeof model !== "object" || !model.meta) throw new ModelLoadError("The model file is not a compiled model");
  if (model.meta.version !== MODEL_VERSION) throw new ModelLoadError(`Model version ${model.meta.version}, expected ${MODEL_VERSION}`);
  for (const key of ["strands", "components", "rules", "cards", "curveballs", "authorities", "regions"] as const) {
    if (!Array.isArray(model[key]) || model[key].length === 0) throw new ModelLoadError(`The model has no ${key}`);
  }
  return model;
}
