/* tslint:disable */
/* eslint-disable */
/**
 * The `ReadableStreamType` enum.
 *
 * *This API requires the following crate features to be activated: `ReadableStreamType`*
 */

type ReadableStreamType = "bytes";

export class IntoUnderlyingByteSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    cancel(): void;
    pull(controller: ReadableByteStreamController): Promise<any>;
    start(controller: ReadableByteStreamController): void;
    readonly autoAllocateChunkSize: number;
    readonly type: ReadableStreamType;
}

export class IntoUnderlyingSink {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    abort(reason: any): Promise<any>;
    close(): Promise<any>;
    write(chunk: any): Promise<any>;
}

export class IntoUnderlyingSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    cancel(): void;
    pull(controller: ReadableStreamDefaultController): Promise<any>;
}

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
     * 3. Subtract change notes (`is_change = true`) received in the same tx
     * 4. The difference (minus fee) is the net amount sent
     */
    getSentTransactions(): any;
    /**
     * Scan a single chunk of blocks. Returns null if no more ranges to scan,
     * or { scannedBlocks, lastHeight } if progress was made.
     */
    syncOneChunk(): Promise<any>;
    /**
     * Prepare the wallet for syncing: fetch chain tip and subtree roots.
     * Must be called once before calling syncOneChunk in a loop.
     */
    syncPrepare(): Promise<any>;
    /**
     * Sync the wallet step by step with logging and progress reporting.
     */
    syncWithProgress(on_progress: Function): Promise<any>;
    toBytes(): Uint8Array;
}

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
    readonly __wbg_zcashviewwallet_free: (a: number, b: number) => void;
    readonly zcashviewwallet_create: (a: number, b: number, c: number, d: number, e: bigint) => any;
    readonly zcashviewwallet_fromBytes: (a: number, b: number, c: number, d: number) => any;
    readonly zcashviewwallet_getBalance: (a: number) => [number, number, number];
    readonly zcashviewwallet_getChainTip: (a: number) => any;
    readonly zcashviewwallet_getSentTransactions: (a: number) => [number, number, number];
    readonly zcashviewwallet_syncOneChunk: (a: number) => any;
    readonly zcashviewwallet_syncPrepare: (a: number) => any;
    readonly zcashviewwallet_syncWithProgress: (a: number, b: any) => any;
    readonly zcashviewwallet_toBytes: (a: number) => [number, number, number, number];
    readonly init: () => void;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly initThreadPool: (a: number) => any;
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
    readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
    readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
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
    readonly wasm_bindgen_b7ae71689503b1fc___closure__destroy___dyn_core_f576a7f0a61931f7___ops__function__FnMut_____Output_______: (a: number, b: number) => void;
    readonly wasm_bindgen_b7ae71689503b1fc___closure__destroy___dyn_core_f576a7f0a61931f7___ops__function__FnMut__wasm_bindgen_b7ae71689503b1fc___JsValue____Output_______: (a: number, b: number) => void;
    readonly wasm_bindgen_b7ae71689503b1fc___closure__destroy___dyn_core_f576a7f0a61931f7___ops__function__FnMut__wasm_bindgen_b7ae71689503b1fc___JsValue____Output___core_f576a7f0a61931f7___result__Result_____wasm_bindgen_b7ae71689503b1fc___JsError___: (a: number, b: number) => void;
    readonly wasm_bindgen_b7ae71689503b1fc___convert__closures_____invoke___wasm_bindgen_b7ae71689503b1fc___JsValue__core_f576a7f0a61931f7___result__Result_____wasm_bindgen_b7ae71689503b1fc___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_b7ae71689503b1fc___convert__closures_____invoke___js_sys_f5f9b440db40cb87___Function_fn_wasm_bindgen_b7ae71689503b1fc___JsValue_____wasm_bindgen_b7ae71689503b1fc___sys__Undefined___js_sys_f5f9b440db40cb87___Function_fn_wasm_bindgen_b7ae71689503b1fc___JsValue_____wasm_bindgen_b7ae71689503b1fc___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_b7ae71689503b1fc___convert__closures_____invoke___wasm_bindgen_b7ae71689503b1fc___JsValue______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_b7ae71689503b1fc___convert__closures_____invoke___web_sys_2554c557213fe36a___features__gen_MessageEvent__MessageEvent______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_b7ae71689503b1fc___convert__closures_____invoke_______true_: (a: number, b: number) => void;
    readonly memory: WebAssembly.Memory;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
