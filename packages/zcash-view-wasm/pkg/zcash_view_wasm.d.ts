/* tslint:disable */
/* eslint-disable */
/**
 * The `ReadableStreamType` enum.
 *
 * *This API requires the following crate features to be activated: `ReadableStreamType`*
 */

export type ReadableStreamType = "bytes";

export interface NoiseEncryptResult { state: string; ciphertext: Uint8Array }
export interface NoiseDecryptResult { state: string; plaintext: Uint8Array }
export interface DkgMessage { recipient: string; msg: Uint8Array }
export interface DkgResult {
    identifier: string;
    keyPackage: string;
    publicKeyPackage: string;
    groupPublicKey: string;
}
export interface FrostCommitResult { nonces: string; commitments: string }
export interface PcztSpend {
    pool: "orchard" | "ironwood";
    index: number;
    alpha: string;
    valueZat: string | null;
}
export interface PcztOutput {
    pool: "transparent" | "sapling" | "orchard" | "ironwood";
    address: string | null;
    valueZat: string;
    memo: string | null;
    change: boolean;
}
export interface PcztSummary {
    txVersion: number;
    sighash: string;
    expiryHeight: number;
    feeZat: string;
    conventionalFeeZat: string;
    spends: PcztSpend[];
    outputs: PcztOutput[];
}
export interface PcztSignature { pool: "orchard" | "ironwood"; index: number; signature: string }
export interface TreasuryViewingKey { ufvk: string; address: string; changeAddress: string }
export interface TreasuryViewingKeyInfo { groupPublicKey: string; address: string; changeAddress: string }



/**
 * A FROST(Pallas, BLAKE2b-512) DKG participant speaking frost-client's
 * frostd message protocol. Outgoing messages must be sent in the returned order
 * (they share per-recipient Noise channels); on a network error, resend the same
 * bytes rather than calling `start`/`receive` again.
 */
export class FrostDkg {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * The FROST identifier of the participant with the given comms public key.
     */
    identifierOf(pubkey: string): string;
    /**
     * Our FROST identifier (hex, as frost-core serializes it).
     */
    identifier(): string;
    isComplete(): boolean;
    /**
     * `participants` are the hex comms public keys of everyone in the frostd
     * session, including our own.
     */
    constructor(secret: Uint8Array, session_id: string, participants: string[], min_signers: number);
    /**
     * Processes a message from `sender` (hex comms public key) and returns the
     * messages it triggers (echo broadcasts, round 2 packages).
     */
    receive(sender: string, msg: Uint8Array): DkgMessage[];
    /**
     * The key material, once `isComplete()`. `keyPackage` is secret.
     */
    result(): DkgResult;
    /**
     * Runs DKG part 1 and returns the round 1 messages for every other participant.
     */
    start(): DkgMessage[];
}

declare class IntoUnderlyingByteSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    cancel(): void;
    pull(controller: ReadableByteStreamController): Promise<any>;
    start(controller: ReadableByteStreamController): void;
    readonly autoAllocateChunkSize: number;
    readonly type: ReadableStreamType;
}
export type { IntoUnderlyingByteSource };

declare class IntoUnderlyingSink {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    abort(reason: any): Promise<any>;
    close(): Promise<any>;
    write(chunk: any): Promise<any>;
}
export type { IntoUnderlyingSink };

declare class IntoUnderlyingSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    cancel(): void;
    pull(controller: ReadableStreamDefaultController): Promise<any>;
}
export type { IntoUnderlyingSource };

export class ZcashViewWallet {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Builds an unproven, unsigned PCZT paying a ZIP 321 request
     * (`zcash:?address=..&amount=..&memo=..&address.1=..`) from this wallet's
     * account, expiring `expiryDelta` blocks after its target height. The wallet
     * must be synced. Sapling-only and TEX recipients are rejected.
     */
    createPczt(payment_request_uri: string, expiry_delta: number): Promise<Uint8Array>;
    static create(lightwalletd_url: string, ufvk_str: string, birthday_height: number, network: string): Promise<ZcashViewWallet>;
    /**
     * Extracts the transaction from a proven, fully signed PCZT and records it
     * in the wallet (so balances and sent transactions update), without
     * sending it. Returns `{ txid, raw }`: the txid (hex, display order) and
     * the serialized transaction, which the caller broadcasts.
     */
    extractTransaction(pczt: Uint8Array): any;
    /**
     * Restores a wallet saved with `toBytes`. The saved state records its
     * network, which must match `network`; states saved before the network was
     * recorded are mainnet wallets.
     */
    static fromBytes(lightwalletd_url: string, saved_state: Uint8Array, network: string): Promise<ZcashViewWallet>;
    getBalance(): any;
    getChainTip(): Promise<bigint>;
    /**
     * Detect outgoing transactions from a view-only wallet.
     *
     * Since `sent_notes` is only populated when the wallet creates a transaction
     * itself, a view-only wallet must detect spends via nullifier tracking:
     *
     * 1. `received_note_spends` maps spent note IDs → spending tx IDs
     * 2. Sum up the value of all spent received notes per spending tx
     * 3. Subtract every note this wallet received in the same tx: change
     *    (`is_change = true`) and outputs to its own external addresses
     * 4. The difference (fee included) is the net amount sent
     *
     * All shielded pools are handled alike: notes are keyed by
     * (pool, txid, output index), with Ironwood (NU6.3) as its own pool. After
     * Ironwood activation a payment funded from Orchard notes reveals Orchard
     * nullifiers while its change lands in the Ironwood pool, and an
     * Orchard → Ironwood migration returns (almost) all value to the wallet,
     * which is why received value is subtracted regardless of key scope.
     */
    getSentTransactions(): any;
    /**
     * Sync the wallet step by step with logging and progress reporting.
     */
    syncWithProgress(on_progress: Function): Promise<any>;
    /**
     * Serializes the wallet, prefixed with a header recording its network.
     */
    toBytes(): Uint8Array;
}

/**
 * Hex X25519 public key of a 32-byte frostd comms private key.
 */
export function commsPublicKey(secret: Uint8Array): string;

/**
 * Derive a shielded unified address for a UFVK, starting the search at the given
 * 11-byte diversifier index (or index 0 for the default address). Transparent
 * receivers are omitted because the view wallet only scans Sapling and Orchard.
 * Notes sent to any diversified address are detected by the same viewing key.
 *
 * `network` is "main" (default) or "test".
 */
export function deriveUnifiedAddress(ufvk_str: string, network?: string | null, diversifier_index?: Uint8Array | null): string;

/**
 * Coordinator: aggregates shares into one hex 64-byte RedPallas signature per
 * spend. `shares` is a JSON string of an object mapping identifier hex to the
 * `Vec<SignatureShare>` payload each signer sent.
 */
export function frostAggregate(signing_package_args: string, shares: string, public_key_package: string): string[];

/**
 * Coordinator: builds frost-client's `SendSigningPackageArgs` JSON.
 * `commitments` is a JSON string of an object mapping each signer's identifier
 * hex to the `Vec<SigningCommitments>` payload it sent, e.g.
 * `JSON.stringify({ [id]: JSON.parse(payloadText) })`.
 */
export function frostBuildSigningPackage(commitments: string, sighash: string, randomizers: string[]): string;

/**
 * Round 1: `count` nonce/commitment pairs, one per spend. `nonces` is secret and
 * single-use; `commitments` is the frost-client participant payload.
 */
export function frostCommit(key_package: string, count: number): FrostCommitResult;

/**
 * The group public key (hex) of a FROST key share.
 */
export function frostKeyPackageGroupKey(key_package: string): string;

/**
 * Participant round 2: verifies the signing package against the expected
 * sighash, randomizers and own commitments, then returns the
 * `Vec<SignatureShare>` JSON payload.
 */
export function frostSign(key_package: string, nonces: string, signing_package_args: string, expected_sighash: string, expected_randomizers: string[]): string;

/**
 * Hex 64-byte XEdDSA signature over the 16 raw bytes of a frostd `/challenge`
 * UUID, as frostd `/login` expects.
 */
export function frostdSignChallenge(secret: Uint8Array, challenge: string): string;

/**
 * Current chain tip height from lightwalletd, without a wallet.
 */
export function getChainTip(lightwalletd_url: string): Promise<number>;

export function init(): void;

export function initThreadPool(num_threads: number): Promise<any>;

/**
 * Decrypts a message on the one-way Noise_K channel from `peerPublic` to us.
 * `state` is `null` if nothing has been received on that channel yet.
 */
export function noiseDecrypt(secret: Uint8Array, peer_public: string, state: string | null | undefined, ciphertext: Uint8Array): NoiseDecryptResult;

/**
 * Encrypts a message on the one-way Noise_K channel from us to `peerPublic`.
 * `state` is `null` for the first message on that channel.
 */
export function noiseEncrypt(secret: Uint8Array, peer_public: string, state: string | null | undefined, plaintext: Uint8Array): NoiseEncryptResult;

/**
 * Applies aggregated spend authorization signatures (each verified against its
 * action's `rk` and the transaction sighash).
 */
export function pcztApplySignatures(pczt: Uint8Array, signatures: PcztSignature[]): Uint8Array;

/**
 * The proven PCZT minus what only the coordinator needs (see
 * `pczt_ops::redact_for_signers`): this is the copy to upload.
 */
export function pcztRedactForSigners(pczt: Uint8Array): Uint8Array;

/**
 * Verified summary of what a PCZT does, for signers to review. Pass the
 * treasury UFVK to make change detection cryptographic (recommended).
 */
export function pcztSummary(pczt: Uint8Array, network: string, ufvk?: string | null): PcztSummary;

/**
 * Adds the missing Orchard/Ironwood proofs. Slow (the proving key is built on
 * first use and cached); call from a worker after `initThreadPool`.
 */
export function provePczt(pczt: Uint8Array): Uint8Array;

/**
 * The last Rust panic on this thread. JS only sees a panic as an
 * "unreachable" trap, so callers fetch the actual message here.
 */
export function takeLastPanic(): string | undefined;

/**
 * The address `pcztSummary` reports for this treasury's change outputs (Orchard
 * and Ironwood pools alike): the UFVK's internal-scope Orchard address at index
 * 0, as an Orchard-only unified address. Equals `treasuryViewingKey(...).changeAddress`.
 */
export function treasuryChangeAddress(ufvk: string, network: string): string;

/**
 * Orchard-only UFVK (with `ak` = the FROST group key) and its default
 * Orchard-only unified address. Randomized: call once per treasury and store
 * the result.
 */
export function treasuryViewingKey(group_public_key: string, network: string): TreasuryViewingKey;

/**
 * The group key a treasury viewing key belongs to and the addresses it derives,
 * for a signer to compare with their own key share and the published
 * addresses before trusting it.
 */
export function treasuryViewingKeyInfo(ufvk: string, network: string): TreasuryViewingKeyInfo;

export class wbg_rayon_PoolBuilder {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    build(): void;
    numThreads(): number;
    receiver(): number;
}

export function wbg_rayon_start_worker(receiver: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly __wbg_frostdkg_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly __wbg_zcashviewwallet_free: (a: number, b: number) => void;
    readonly commsPublicKey: (a: number, b: number) => [number, number, number, number];
    readonly deriveUnifiedAddress: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly frostAggregate: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly frostBuildSigningPackage: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly frostCommit: (a: number, b: number, c: number) => [number, number, number];
    readonly frostKeyPackageGroupKey: (a: number, b: number) => [number, number, number, number];
    readonly frostSign: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number, number, number];
    readonly frostdSignChallenge: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly frostdkg_identifier: (a: number) => [number, number];
    readonly frostdkg_identifierOf: (a: number, b: number, c: number) => [number, number, number, number];
    readonly frostdkg_isComplete: (a: number) => number;
    readonly frostdkg_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly frostdkg_receive: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly frostdkg_result: (a: number) => [number, number, number];
    readonly frostdkg_start: (a: number) => [number, number, number];
    readonly getChainTip: (a: number, b: number) => any;
    readonly init: () => void;
    readonly initThreadPool: (a: number) => any;
    readonly intounderlyingbytesource_autoAllocateChunkSize: (a: number) => number;
    readonly intounderlyingbytesource_cancel: (a: number) => void;
    readonly intounderlyingbytesource_pull: (a: number, b: any) => any;
    readonly intounderlyingbytesource_start: (a: number, b: any) => void;
    readonly intounderlyingbytesource_type: (a: number) => number;
    readonly intounderlyingsink_abort: (a: number, b: any) => any;
    readonly intounderlyingsink_close: (a: number) => any;
    readonly intounderlyingsink_write: (a: number, b: any) => any;
    readonly intounderlyingsource_cancel: (a: number) => void;
    readonly intounderlyingsource_pull: (a: number, b: any) => any;
    readonly noiseDecrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number];
    readonly noiseEncrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number];
    readonly pcztApplySignatures: (a: number, b: number, c: any) => [number, number, number, number];
    readonly pcztRedactForSigners: (a: number, b: number) => [number, number, number, number];
    readonly pcztSummary: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly provePczt: (a: number, b: number) => [number, number, number, number];
    readonly takeLastPanic: () => [number, number];
    readonly treasuryChangeAddress: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly treasuryViewingKey: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly treasuryViewingKeyInfo: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly zcashviewwallet_create: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly zcashviewwallet_createPczt: (a: number, b: number, c: number, d: number) => any;
    readonly zcashviewwallet_extractTransaction: (a: number, b: number, c: number) => [number, number, number];
    readonly zcashviewwallet_fromBytes: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly zcashviewwallet_getBalance: (a: number) => [number, number, number];
    readonly zcashviewwallet_getChainTip: (a: number) => any;
    readonly zcashviewwallet_getSentTransactions: (a: number) => [number, number, number];
    readonly zcashviewwallet_syncWithProgress: (a: number, b: any) => any;
    readonly zcashviewwallet_toBytes: (a: number) => [number, number, number, number];
    readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
    readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
    readonly wasm_bindgen_9387dbcee5e27194___convert__closures_____invoke___js_sys_4497dad8fdab7ec5___Function_fn_wasm_bindgen_9387dbcee5e27194___JsValue_____wasm_bindgen_9387dbcee5e27194___sys__Undefined___js_sys_4497dad8fdab7ec5___Function_fn_wasm_bindgen_9387dbcee5e27194___JsValue_____wasm_bindgen_9387dbcee5e27194___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_9387dbcee5e27194___convert__closures_____invoke___wasm_bindgen_9387dbcee5e27194___JsValue__core_f576a7f0a61931f7___result__Result_____wasm_bindgen_9387dbcee5e27194___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_9387dbcee5e27194___convert__closures_____invoke___js_sys_4497dad8fdab7ec5___futures__task__wait_async_polyfill__MessageEvent______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_9387dbcee5e27194___convert__closures_____invoke___wasm_bindgen_9387dbcee5e27194___JsValue______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_9387dbcee5e27194___convert__closures_____invoke_______true_: (a: number, b: number) => void;
    readonly memory: WebAssembly.Memory;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
    readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;
