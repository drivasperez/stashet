import { Subscribable } from "./types";

type Factory<T> = (...args: any[]) => Subscribable<T>;
export function memoize() {}
