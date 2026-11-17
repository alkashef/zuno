// @ts-check
/**
 * @module log
 * The only module that uses `console`. It prints a message only when its level is at or above the
 * level from `config.js`. It does not decide what to log; the callers do (project rules).
 */
import { config } from "./config.js";

/** Log levels from least to most severe; the number orders them. */
export const LogLevel = Object.freeze({ debug: 0, info: 1, warn: 2, error: 3 });

/** @typedef {keyof typeof LogLevel} LogLevelName */
/** @typedef {Pick<Console, LogLevelName>} LogSink */

/**
 * @typedef {object} Log
 * @property {(message: string, ...details: unknown[]) => void} debug
 * @property {(message: string, ...details: unknown[]) => void} info
 * @property {(message: string, ...details: unknown[]) => void} warn
 * @property {(message: string, ...details: unknown[]) => void} error
 */

/**
 * Makes a logger that prints at `level` and above.
 * @param {string} level One of the `LogLevel` names.
 * @param {LogSink} [sink] Where messages go; tests pass a fake.
 * @returns {Log} The logger.
 * @throws {Error} When `level` is not a `LogLevel` name.
 */
export function createLog(level, sink = console) {
  if (!Object.hasOwn(LogLevel, level)) {
    throw new Error(`Unknown log level "${level}" in config.logLevel`);
  }
  const threshold = LogLevel[/** @type {LogLevelName} */ (level)];
  /** @param {LogLevelName} name */
  const printer =
    (name) =>
    (/** @type {string} */ message, /** @type {unknown[]} */ ...details) => {
      if (LogLevel[name] >= threshold) {
        sink[name](message, ...details);
      }
    };
  return {
    debug: printer("debug"),
    info: printer("info"),
    warn: printer("warn"),
    error: printer("error"),
  };
}

export const log = createLog(config.logLevel);
