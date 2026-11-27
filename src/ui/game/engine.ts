// The engine as the game screen calls it: a thin pass-through to src/engine/api.ts, so the
// screens have one import site (and saveGame / dailySeed take the model like the rest).
import * as api from "../../engine/api";
import type { CompiledModel } from "../../model/schema";

export const newGame = api.newGame;
export const dispatch = api.dispatch;
export const validatePlays = api.validatePlays;
export const cardCost = api.cardCost;
export const preview = api.preview;
export const gradeVisit = api.gradeVisit;
export const pullThread = api.pullThread;
export const recomputeResult = api.recomputeResult;
export const loadGame = api.loadGame;
export const saveGame = (_m: CompiledModel, s: api.GameState): string => api.saveGame(s);
export const dailySeed = (_m: CompiledModel, date: string): number => api.dailySeed(date);
export const headline = api.headline;
export const whatMattered = api.whatMattered;
export const unusedCoins = api.unusedCoins;
export const cardsCapped = api.cardsCapped;
