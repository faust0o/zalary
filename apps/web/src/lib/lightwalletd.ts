/**
 * lightwalletd's SendTransaction over gRPC-web, straight from the page: one
 * small request that, unlike the wasm client, can be given a deadline.
 */

const SEND_TIMEOUT_MS = 60_000

// lightwalletd/zcashd answers a resend this way; the transaction is out.
const ALREADY_SENT =
  /already (in the mempool|have|known)|txn-already|known transaction/i

function varint(value: number): number[] {
  const bytes: number[] = []
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80)
    value >>>= 7
  }
  bytes.push(value)
  return bytes
}

/** RawTransaction { bytes data = 1; uint64 height = 2 } in a gRPC-web frame. */
function encodeRequest(raw: Uint8Array): Uint8Array<ArrayBuffer> {
  const message = new Uint8Array([0x0a, ...varint(raw.length), ...raw])
  const frame = new Uint8Array(5 + message.length)
  new DataView(frame.buffer).setUint32(1, message.length)
  frame.set(message, 5)
  return frame
}

function readVarint(bytes: Uint8Array, at: number): [bigint, number] {
  let value = 0n
  let shift = 0n
  for (;;) {
    const byte = bytes[at++]
    if (byte === undefined) throw new Error("Truncated lightwalletd response")
    value |= BigInt(byte & 0x7f) << shift
    if (!(byte & 0x80)) return [value, at]
    shift += 7n
  }
}

/** SendResponse { int32 errorCode = 1; string errorMessage = 2 }. */
function decodeSendResponse(bytes: Uint8Array): {
  errorCode: number
  errorMessage: string
} {
  let errorCode = 0
  let errorMessage = ""
  let at = 0
  while (at < bytes.length) {
    const [key, next] = readVarint(bytes, at)
    at = next
    const field = Number(key >> 3n)
    const wire = Number(key & 7n)
    if (wire === 0) {
      const [value, after] = readVarint(bytes, at)
      at = after
      if (field === 1) errorCode = Number(BigInt.asIntN(64, value))
    } else if (wire === 2) {
      const [length, after] = readVarint(bytes, at)
      const end = after + Number(length)
      if (field === 2) {
        errorMessage = new TextDecoder().decode(bytes.subarray(after, end))
      }
      at = end
    } else {
      throw new Error("Unexpected lightwalletd response")
    }
  }
  return { errorCode, errorMessage }
}

/** Split a gRPC-web body into its message and its trailers. */
function readFrames(body: Uint8Array): {
  message: Uint8Array | null
  trailers: Record<string, string>
} {
  let message: Uint8Array | null = null
  const trailers: Record<string, string> = {}
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  let at = 0
  while (at + 5 <= body.length) {
    const flags = body[at]
    const length = view.getUint32(at + 1)
    const payload = body.subarray(at + 5, at + 5 + length)
    at += 5 + length
    if (flags & 0x80) {
      for (const line of new TextDecoder().decode(payload).split("\r\n")) {
        const colon = line.indexOf(":")
        if (colon > 0) {
          trailers[line.slice(0, colon).trim().toLowerCase()] = line
            .slice(colon + 1)
            .trim()
        }
      }
    } else {
      message = payload
    }
  }
  return { message, trailers }
}

/**
 * Broadcast a serialized transaction. Resolves once lightwalletd accepted it
 * (or already had it); rejects with lightwalletd's reason otherwise.
 */
export async function sendTransaction(
  lightwalletdUrl: string,
  raw: Uint8Array
): Promise<void> {
  let res: Response
  try {
    res = await fetch(
      `${lightwalletdUrl.replace(/\/$/, "")}/cash.z.wallet.sdk.rpc.CompactTxStreamer/SendTransaction`,
      {
        method: "POST",
        headers: {
          "content-type": "application/grpc-web+proto",
          "x-grpc-web": "1",
        },
        body: encodeRequest(raw),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      }
    )
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(
        `lightwalletd didn't answer within ${SEND_TIMEOUT_MS / 1000}s`
      )
    }
    throw new Error(
      `Couldn't reach lightwalletd (${err instanceof Error ? err.message : String(err)})`
    )
  }
  if (!res.ok) throw new Error(`lightwalletd answered HTTP ${res.status}`)

  const { message, trailers } = readFrames(
    new Uint8Array(await res.arrayBuffer())
  )
  const status = trailers["grpc-status"] ?? res.headers.get("grpc-status")
  if (status && status !== "0") {
    const reason = decodeURIComponent(
      trailers["grpc-message"] ?? res.headers.get("grpc-message") ?? ""
    )
    if (ALREADY_SENT.test(reason)) return
    throw new Error(`lightwalletd rejected it: ${reason || `status ${status}`}`)
  }
  if (!message) return
  const { errorCode, errorMessage } = decodeSendResponse(message)
  if (errorCode !== 0 && !ALREADY_SENT.test(errorMessage)) {
    throw new Error(
      `lightwalletd rejected it: ${errorMessage || `code ${errorCode}`}`
    )
  }
}
