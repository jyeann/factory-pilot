const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const encoder = new TextEncoder()

/** 32-bit FNV-1a hash of the UTF-8 bytes of `text`, as 8 lowercase hex digits. */
export function fnv1a(text: string): string {
  let hash = FNV_OFFSET_BASIS
  for (const byte of encoder.encode(text)) {
    hash ^= byte
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
