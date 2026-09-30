/** SHA-256 fallback for local/opaque documents without SubtleCrypto. Hashes UTF-8 text.
 * The browser-native implementation is preferred when present. Tested against Node crypto. */
export declare function sha256Text(text: string): string;
