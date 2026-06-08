import { atom } from "jotai";

export const searchAtom = atom("");
export const localeAtom = atom("en");
export const modalOpenAtom = atom(false);
export const refreshEnabledAtom = atom(true);
export const refreshTimestampAtom = atom<number | null>(null);