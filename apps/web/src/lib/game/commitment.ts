export type BoardCommitment = {
  saltHex: string;
  commitmentHex: string;
  commitmentBytes: Uint8Array; // 32 bytes
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function encodeBoardBits(board: boolean[][]): Uint8Array {
  const h = board.length;
  const w = board[0]?.length ?? 0;
  if (h === 0 || w === 0) throw new Error('Empty board');

  const bitLen = w * h;
  const byteLen = Math.ceil(bitLen / 8);
  const out = new Uint8Array(byteLen);

  // Row-major bits: (y * w + x)
  let bitIndex = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const byteIndex = Math.floor(bitIndex / 8);
      const inner = bitIndex % 8;
      if (board[y][x]) out[byteIndex] |= 1 << inner;
      bitIndex++;
    }
  }

  return out;
}

export function randomSaltHex(bytesLen = 32): string {
  const salt = new Uint8Array(bytesLen);
  crypto.getRandomValues(salt);
  return bytesToHex(salt);
}

/**
 * Commitment = sha256( salt || board_bits )
 * - salt: 32 bytes hex string
 * - board_bits: packed bits, row-major
 */
export async function sha256CommitBoard(board: boolean[][], saltHex?: string): Promise<BoardCommitment> {
  const salt = saltHex ? hexToBytes(saltHex) : hexToBytes(randomSaltHex(32));
  if (salt.length !== 32) throw new Error('Salt must be 32 bytes');

  const bits = encodeBoardBits(board);
  const preimage = concatBytes(salt, bits);

  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', preimage as unknown as BufferSource)
  );
  return {
    saltHex: bytesToHex(salt),
    commitmentHex: bytesToHex(digest),
    commitmentBytes: digest,
  };
}
