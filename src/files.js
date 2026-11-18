// @ts-check
/**
 * @module files
 * The only module that saves a file to the user's machine and reads a file the user picked
 * (HOL-010 to HOL-012, DEC-018). `saveJson` offers a value as a download; `readJson` reads a picked
 * file as JSON. It does not know what the value means (domain/user-holidays.js validates it) and
 * sends nothing over the network (NFR-001).
 */

/** @typedef {{ status: "read", value: unknown } | { status: "unreadable" }} FileRead */

/**
 * @typedef {object} FilesDeps
 * @property {Pick<Document, "createElement" | "body">} doc The page; tests pass a fake.
 * @property {Pick<typeof URL, "createObjectURL" | "revokeObjectURL">} urls Makes and revokes
 *   object URLs; tests pass a fake.
 */

/**
 * @param {string} text
 * @returns {unknown} The parsed JSON, or `undefined` when the text is not JSON.
 */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * @param {FilesDeps} deps
 * @returns {{ saveJson: (fileName: string, value: unknown) => void, readJson: (file: Blob) => Promise<FileRead> }}
 */
export function createFiles({ doc, urls }) {
  return {
    /**
     * Offers the value as a JSON file download.
     * @param {string} fileName The name the browser proposes.
     * @param {unknown} value Anything `JSON.stringify` writes.
     */
    saveJson(fileName, value) {
      const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
      const url = urls.createObjectURL(blob);
      const link = doc.createElement("a");
      link.href = url;
      link.download = fileName;
      doc.body.append(link);
      link.click();
      link.remove();
      urls.revokeObjectURL(url);
    },
    /**
     * @param {Blob} file The file the user picked.
     * @returns {Promise<FileRead>} The parsed JSON, or `unreadable` when the text is not JSON.
     */
    async readJson(file) {
      const value = parseJson(await file.text());
      return value === undefined ? { status: "unreadable" } : { status: "read", value };
    },
  };
}
