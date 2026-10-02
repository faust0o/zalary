/* tslint:disable */
/* eslint-disable */
/**
 * The `ReadableStreamType` enum.
 *
 * *This API requires the following crate features to be activated: `ReadableStreamType`*
 */

export type ReadableStreamType = "bytes";

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
    static create(lightwalletd_url: string, ufvk_str: string, birthday_height: bigint): Promise<ZcashViewWallet>;
    static fromBytes(lightwalletd_url: string, saved_state: Uint8Array): Promise<ZcashViewWallet>;
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
    toBytes(): Uint8Array;
}

/**
 * Derive a shielded unified address for a UFVK, starting the search at the given
 * 11-byte diversifier index (or index 0 for the default address). Transparent
 * receivers are omitted because the view wallet only scans Sapling and Orchard.
 * Notes sent to any diversified address are detected by the same viewing key.
 */
export function deriveUnifiedAddress(ufvk_str: string, diversifier_index?: Uint8Array | null): string;

export function init(): void;

export function initThreadPool(num_threads: number): Promise<any>;

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
    readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly __wbg_zcashviewwallet_free: (a: number, b: number) => void;
    readonly deriveUnifiedAddress: (a: number, b: number, c: number, d: number) => [number, number, number, number];
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
    readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
    readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
    readonly intounderlyingsource_cancel: (a: number) => void;
    readonly intounderlyingsource_pull: (a: number, b: any) => any;
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly zcashviewwallet_create: (a: number, b: number, c: number, d: number, e: bigint) => any;
    readonly zcashviewwallet_fromBytes: (a: number, b: number, c: number, d: number) => any;
    readonly zcashviewwallet_getBalance: (a: number) => [number, number, number];
    readonly zcashviewwallet_getChainTip: (a: number) => any;
    readonly zcashviewwallet_getSentTransactions: (a: number) => [number, number, number];
    readonly zcashviewwallet_syncWithProgress: (a: number, b: any) => any;
    readonly zcashviewwallet_toBytes: (a: number) => [number, number, number, number];
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
