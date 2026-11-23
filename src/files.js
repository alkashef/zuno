// @ts-check
/**
 * @module files
 * The only module that saves a file to the user's machine and reads a file the user picked
 * (HOL-010 to HOL-012, DEC-032). `saveText` offers text as a download; `readText` reads a picked
 * file as text. It does not know what the text means (domain/holidays-file.js does) and sends
 * nothing over the network (NFR-001).
 */

/** @typedef {{ status: "read", text: string } | { status: "unreadable" }} TextRead */

/**
 * @typedef {object} FilesDeps
 * @property {Pick<Document, "createElement" | "body">} doc The page; tests pass a fake.
 * @property {Pick<typeof URL, "createObjectURL" | "revokeObjectURL">} urls Makes and revokes
 *   object URLs; tests pass a fake.
 */

/**
 * @param {Blob} file
 * @returns {Promise<TextRead>} The file's text, or `unreadable` when the browser cannot read it.
 */
async function readTextOf(file) {
  try {
    return { status: "read", text: await file.text() };
  } catch {
    return { status: "unreadable" };
  }
}

/**
 * @param {FilesDeps} deps
 * @returns {{ saveText: (fileName: string, text: string, mimeType: string) => void, readText: (file: Blob) => Promise<TextRead> }}
 */
export function createFiles({ doc, urls }) {
  return {
    /**
     * Offers the text as a file download.
     * @param {string} fileName The name the browser proposes.
     * @param {string} text The content of the file.
     * @param {string} mimeType The type of the file, such as `text/csv`.
     */
    saveText(fileName, text, mimeType) {
      const blob = new Blob([text], { type: mimeType });
      const url = urls.createObjectURL(blob);
      const link = doc.createElement("a");
      link.href = url;
      link.download = fileName;
      doc.body.append(link);
      link.click();
      link.remove();
      urls.revokeObjectURL(url);
    },
    readText: readTextOf,
  };
}
