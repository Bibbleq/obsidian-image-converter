/**
 * Utilities for resolving "bucket path" variables.
 *
 * A bucket path is formed from the leading N folder segments of a note's vault-relative path,
 * providing a stable location for attachments regardless of how deep the note is.
 *
 * Example for note path "IT Pro/Content Creation/Content Items/Ideas/Note.md":
 *   depth 1  →  "IT Pro"
 *   depth 2  →  "IT Pro/Content Creation"
 *   depth 3  →  "IT Pro/Content Creation/Content Items"
 */

/**
 * Default fallback bucket name used for root-level notes (those with no parent folder).
 * This constant is shared by settings defaults and VariableProcessor so the value is
 * never duplicated or accidentally inconsistent.
 */
export const DEFAULT_ROOT_NOTE_FALLBACK_BUCKET = "Inbox";

/**
 * Return the ordered list of folder segments for a vault-relative note path.
 * The filename itself is excluded; only directory portions are included.
 *
 * @example
 * getNoteFolderSegments("IT Pro/Content Creation/Ideas/Note.md")
 * // → ["IT Pro", "Content Creation", "Ideas"]
 *
 * getNoteFolderSegments("Root Note.md")
 * // → []
 */
export function getNoteFolderSegments(notePath: string): string[] {
    // Normalize separators (handle any accidental backslashes)
    const normalised = notePath.replace(/\\/g, "/");
    const lastSlash = normalised.lastIndexOf("/");
    if (lastSlash === -1) {
        // Note is in the vault root – no folder segments
        return [];
    }
    const folderPart = normalised.substring(0, lastSlash);
    return folderPart.split("/").filter(seg => seg.length > 0);
}

/**
 * Resolve a bucket path of `depth` folder segments from the vault root of the note.
 *
 * If the note has fewer segments than requested, the available segments are used
 * (i.e. the path is not padded).  A root-level note (no folder segments) returns
 * the fallback string unchanged.
 *
 * @param notePath  vault-relative path to the note, e.g. "IT Pro/Content/Note.md"
 * @param depth     how many leading folder segments to include (≥1)
 * @param fallback  value returned when the note is in the vault root
 */
export function resolveBucketPath(
    notePath: string,
    depth: number,
    fallback: string
): string {
    const segments = getNoteFolderSegments(notePath);
    if (segments.length === 0) {
        return fallback;
    }
    const take = Math.max(1, Math.floor(depth));
    return segments.slice(0, take).join("/");
}
