/**
 * gzip / gunzip over raw bytes using the Web Streams CompressionStream /
 * DecompressionStream APIs (Node >= 20 globals; not provided by jsdom itself).
 *
 * The share codec uses these to shrink character payloads for URL links.
 * gunzip enforces a maximum decompressed size so a hostile/corrupt payload
 * cannot inflate without bound (a "zip bomb" guard): it aborts as soon as the
 * running total of decompressed chunk bytes exceeds `maxBytes`.
 *
 * Bytes are written directly to the transform stream's writable side (rather
 * than wrapped in a Blob/Response) so the exact input bytes are preserved
 * regardless of the host's Blob implementation.
 */

/** Read every chunk from a byte stream, enforcing an optional size cap. */
async function readAll(
  readable: ReadableStream<Uint8Array>,
  maxBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > maxBytes) {
          // Tear down the readable side so the upstream transform/writer is
          // unblocked (avoids a deadlock when back-pressure is in play).
          await reader.cancel();
          throw new Error('Decompressed size exceeds maximum');
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Pump input bytes through a transform stream and collect the output. */
async function transform(
  input: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  maxBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const writer = stream.writable.getWriter();
  // Write and close the writable side concurrently with reading the readable
  // side so neither back-pressures the other into a deadlock. The catch keeps a
  // write/close failure (e.g. when decompression errors and faults the writable
  // side, or when we abort the reader early) from surfacing as an unhandled
  // rejection; the read side reports the real error.
  const writePromise = (async () => {
    await writer.write(input);
    await writer.close();
  })().catch(() => { /* secondary to the read-side error; intentionally ignored */ });

  try {
    const output = await readAll(stream.readable, maxBytes);
    await writePromise;
    return output;
  } catch (err) {
    // Abort the writer first so any pending write/close is unblocked, THEN wait
    // for it to settle (its rejection is already swallowed above).
    try {
      await writer.abort();
    } catch { /* already errored/closed */ }
    await writePromise;
    throw err;
  }
}

/** Compress bytes with gzip. */
export async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return transform(bytes, new CompressionStream('gzip'), Number.POSITIVE_INFINITY);
}

/**
 * Decompress gzip bytes, aborting once the summed output exceeds `maxBytes`.
 * Throws on invalid gzip data or when the decompressed size limit is exceeded.
 */
export async function gunzip(bytes: Uint8Array<ArrayBuffer>, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  return transform(bytes, new DecompressionStream('gzip'), maxBytes);
}
