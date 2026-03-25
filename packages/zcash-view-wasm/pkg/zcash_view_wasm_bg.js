//#region exports

export class IntoUnderlyingByteSource {
    constructor() {
        throw new Error('cannot invoke `new` directly');
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingByteSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingbytesource_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get autoAllocateChunkSize() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    cancel() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        wasm.intounderlyingbytesource_cancel(ptr);
    }
    /**
     * @param {ReadableByteStreamController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.intounderlyingbytesource_pull(this.__wbg_ptr, controller);
        return ret;
    }
    /**
     * @param {ReadableByteStreamController} controller
     */
    start(controller) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.intounderlyingbytesource_start(this.__wbg_ptr, controller);
    }
    /**
     * @returns {ReadableStreamType}
     */
    get type() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.intounderlyingbytesource_type(this.__wbg_ptr);
        return __wbindgen_enum_ReadableStreamType[ret];
    }
}
if (Symbol.dispose) IntoUnderlyingByteSource.prototype[Symbol.dispose] = IntoUnderlyingByteSource.prototype.free;

export class IntoUnderlyingSink {
    constructor() {
        throw new Error('cannot invoke `new` directly');
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSinkFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsink_free(ptr, 0);
    }
    /**
     * @param {any} reason
     * @returns {Promise<any>}
     */
    abort(reason) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        const ret = wasm.intounderlyingsink_abort(ptr, reason);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    close() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        const ret = wasm.intounderlyingsink_close(ptr);
        return ret;
    }
    /**
     * @param {any} chunk
     * @returns {Promise<any>}
     */
    write(chunk) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.intounderlyingsink_write(this.__wbg_ptr, chunk);
        return ret;
    }
}
if (Symbol.dispose) IntoUnderlyingSink.prototype[Symbol.dispose] = IntoUnderlyingSink.prototype.free;

export class IntoUnderlyingSource {
    constructor() {
        throw new Error('cannot invoke `new` directly');
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsource_free(ptr, 0);
    }
    cancel() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        wasm.intounderlyingsource_cancel(ptr);
    }
    /**
     * @param {ReadableStreamDefaultController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.intounderlyingsource_pull(this.__wbg_ptr, controller);
        return ret;
    }
}
if (Symbol.dispose) IntoUnderlyingSource.prototype[Symbol.dispose] = IntoUnderlyingSource.prototype.free;

export class ZcashViewWallet {
    constructor() {
        throw new Error('cannot invoke `new` directly');
    }
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ZcashViewWallet.prototype);
        obj.__wbg_ptr = ptr;
        ZcashViewWalletFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ZcashViewWalletFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_zcashviewwallet_free(ptr, 0);
    }
    /**
     * @param {string} lightwalletd_url
     * @param {string} ufvk_str
     * @param {bigint} birthday_height
     * @returns {Promise<ZcashViewWallet>}
     */
    static create(lightwalletd_url, ufvk_str, birthday_height) {
        const ptr0 = passStringToWasm0(lightwalletd_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(ufvk_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        _assertBigInt(birthday_height);
        const ret = wasm.zcashviewwallet_create(ptr0, len0, ptr1, len1, birthday_height);
        return ret;
    }
    /**
     * @param {string} lightwalletd_url
     * @param {Uint8Array} saved_state
     * @returns {Promise<ZcashViewWallet>}
     */
    static fromBytes(lightwalletd_url, saved_state) {
        const ptr0 = passStringToWasm0(lightwalletd_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(saved_state, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.zcashviewwallet_fromBytes(ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @returns {any}
     */
    getBalance() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.zcashviewwallet_getBalance(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<bigint>}
     */
    getChainTip() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.zcashviewwallet_getChainTip(this.__wbg_ptr);
        return ret;
    }
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
     * @returns {any}
     */
    getSentTransactions() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.zcashviewwallet_getSentTransactions(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Sync the wallet step by step with logging and progress reporting.
     * @param {Function} on_progress
     * @returns {Promise<any>}
     */
    syncWithProgress(on_progress) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.zcashviewwallet_syncWithProgress(this.__wbg_ptr, on_progress);
        return ret;
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.zcashviewwallet_toBytes(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) ZcashViewWallet.prototype[Symbol.dispose] = ZcashViewWallet.prototype.free;

export function init() {
    wasm.init();
}

//#endregion

//#region wasm imports
export function __wbg_Error_83742b46f01ce22d() { return logError(function (arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_String_8564e559799eccda() { return logError(function (arg0, arg1) {
    const ret = String(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg___wbindgen_debug_string_5398f5bb970e0daa(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_is_function_3c846841762788c1(arg0) {
    const ret = typeof(arg0) === 'function';
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_object_781bc9f159099513(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_undefined_52709e72fb9f179c(arg0) {
    const ret = arg0 === undefined;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_string_get_395e606bd0ee4427(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_throw_6ddd609b62940d55(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg__wbg_cb_unref_6b5b6b8576d35cb1() { return logError(function (arg0) {
    arg0._wbg_cb_unref();
}, arguments); }
export function __wbg_abort_5ef96933660780b7() { return logError(function (arg0) {
    arg0.abort();
}, arguments); }
export function __wbg_abort_6479c2d794ebf2ee() { return logError(function (arg0, arg1) {
    arg0.abort(arg1);
}, arguments); }
export function __wbg_append_608dfb635ee8998f() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_body_ac1dad652946e6da() { return logError(function (arg0) {
    const ret = arg0.body;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_buffer_60b8043cd926067d() { return logError(function (arg0) {
    const ret = arg0.buffer;
    return ret;
}, arguments); }
export function __wbg_byobRequest_6342e5f2b232c0f9() { return logError(function (arg0) {
    const ret = arg0.byobRequest;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_byteLength_607b856aa6c5a508() { return logError(function (arg0) {
    const ret = arg0.byteLength;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_byteOffset_b26b63681c83856c() { return logError(function (arg0) {
    const ret = arg0.byteOffset;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_call_2d781c1f4d5c0ef8() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_call_dcc2662fa17a72cf() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.call(arg1, arg2, arg3);
    return ret;
}, arguments); }
export function __wbg_call_e133b57c9155d22c() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments); }
export function __wbg_cancel_79b3bea07a1028e7() { return logError(function (arg0) {
    const ret = arg0.cancel();
    return ret;
}, arguments); }
export function __wbg_catch_d7ed0375ab6532a5() { return logError(function (arg0, arg1) {
    const ret = arg0.catch(arg1);
    return ret;
}, arguments); }
export function __wbg_clearTimeout_1d1b13f4034f30ca() { return logError(function (arg0) {
    const ret = clearTimeout(arg0);
    return ret;
}, arguments); }
export function __wbg_close_690d36108c557337() { return handleError(function (arg0) {
    arg0.close();
}, arguments); }
export function __wbg_close_737b4b1fbc658540() { return handleError(function (arg0) {
    arg0.close();
}, arguments); }
export function __wbg_createTask_6eb3a8b6dd2f87c9() { return handleError(function (arg0, arg1) {
    const ret = console.createTask(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_done_08ce71ee07e3bd17() { return logError(function (arg0) {
    const ret = arg0.done;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_enqueue_ec3552838b4b7fbf() { return handleError(function (arg0, arg1) {
    arg0.enqueue(arg1);
}, arguments); }
export function __wbg_error_a6fa202b58aa1cd3() { return logError(function (arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
}, arguments); }
export function __wbg_fetch_010aa16f24b763bc() { return logError(function (arg0, arg1) {
    const ret = fetch(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_fetch_d77cded604d729e9() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.fetch(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_getReader_9facd4f899beac89() { return handleError(function (arg0) {
    const ret = arg0.getReader();
    return ret;
}, arguments); }
export function __wbg_get_326e41e095fb2575() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_a8ee5c45dabc1b3b() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}, arguments); }
export function __wbg_get_done_d0ab690f8df5501f() { return logError(function (arg0) {
    const ret = arg0.done;
    if (!isLikeNone(ret)) {
        _assertBoolean(ret);
    }
    return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}, arguments); }
export function __wbg_get_value_548ae6adf5a174e4() { return logError(function (arg0) {
    const ret = arg0.value;
    return ret;
}, arguments); }
export function __wbg_has_926ef2ff40b308cf() { return handleError(function (arg0, arg1) {
    const ret = Reflect.has(arg0, arg1);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_headers_eb2234545f9ff993() { return logError(function (arg0) {
    const ret = arg0.headers;
    return ret;
}, arguments); }
export function __wbg_iterator_d8f549ec8fb061b1() { return logError(function () {
    const ret = Symbol.iterator;
    return ret;
}, arguments); }
export function __wbg_length_ea16607d7b61445b() { return logError(function (arg0) {
    const ret = arg0.length;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_log_524eedafa26daa59() { return logError(function (arg0) {
    console.log(arg0);
}, arguments); }
export function __wbg_new_0837727332ac86ba() { return handleError(function () {
    const ret = new Headers();
    return ret;
}, arguments); }
export function __wbg_new_227d7c05414eb861() { return logError(function () {
    const ret = new Error();
    return ret;
}, arguments); }
export function __wbg_new_5f486cdf45a04d78() { return logError(function (arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
}, arguments); }
export function __wbg_new_a70fbab9066b301f() { return logError(function () {
    const ret = new Array();
    return ret;
}, arguments); }
export function __wbg_new_ab79df5bd7c26067() { return logError(function () {
    const ret = new Object();
    return ret;
}, arguments); }
export function __wbg_new_c518c60af666645b() { return handleError(function () {
    const ret = new AbortController();
    return ret;
}, arguments); }
export function __wbg_new_d15cb560a6a0e5f0() { return logError(function (arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_new_from_slice_22da9388ac046e50() { return logError(function (arg0, arg1) {
    const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_new_typed_aaaeaf29cf802876() { return logError(function (arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___js_sys_2a125ee6e2c04e11___Function_fn_wasm_bindgen_c1809b92ce2d6ed9___JsValue_____wasm_bindgen_c1809b92ce2d6ed9___sys__Undefined___js_sys_2a125ee6e2c04e11___Function_fn_wasm_bindgen_c1809b92ce2d6ed9___JsValue_____wasm_bindgen_c1809b92ce2d6ed9___sys__Undefined_______true_(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return ret;
    } finally {
        state0.a = state0.b = 0;
    }
}, arguments); }
export function __wbg_new_with_byte_offset_and_length_b2ec5bf7b2f35743() { return logError(function (arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_new_with_str_and_init_b4b54d1a819bc724() { return handleError(function (arg0, arg1, arg2) {
    const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
    return ret;
}, arguments); }
export function __wbg_next_11b99ee6237339e3() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments); }
export function __wbg_next_e01a967809d1aa68() { return logError(function (arg0) {
    const ret = arg0.next;
    return ret;
}, arguments); }
export function __wbg_now_16f0c993d5dd6c27() { return logError(function () {
    const ret = Date.now();
    return ret;
}, arguments); }
export function __wbg_prototypesetcall_d62e5099504357e6() { return logError(function (arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}, arguments); }
export function __wbg_queueMicrotask_0c399741342fb10f() { return logError(function (arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
}, arguments); }
export function __wbg_queueMicrotask_a082d78ce798393e() { return logError(function (arg0) {
    queueMicrotask(arg0);
}, arguments); }
export function __wbg_read_7f593a961a7f80ed() { return logError(function (arg0) {
    const ret = arg0.read();
    return ret;
}, arguments); }
export function __wbg_releaseLock_ef7766a5da654ff8() { return logError(function (arg0) {
    arg0.releaseLock();
}, arguments); }
export function __wbg_resolve_ae8d83246e5bcc12() { return logError(function (arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
}, arguments); }
export function __wbg_respond_e286ee502e7cf7e4() { return handleError(function (arg0, arg1) {
    arg0.respond(arg1 >>> 0);
}, arguments); }
export function __wbg_run_78b7b601add6ed6b() { return logError(function (arg0, arg1, arg2) {
    try {
        var state0 = {a: arg1, b: arg2};
        var cb0 = () => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___bool__true_(a, state0.b, );
            } finally {
                state0.a = a;
            }
        };
        const ret = arg0.run(cb0);
        _assertBoolean(ret);
        return ret;
    } finally {
        state0.a = state0.b = 0;
    }
}, arguments); }
export function __wbg_setTimeout_a3127d9f29a851c3() { return logError(function (arg0, arg1) {
    const ret = setTimeout(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_set_282384002438957f() { return logError(function (arg0, arg1, arg2) {
    arg0[arg1 >>> 0] = arg2;
}, arguments); }
export function __wbg_set_6be42768c690e380() { return logError(function (arg0, arg1, arg2) {
    arg0[arg1] = arg2;
}, arguments); }
export function __wbg_set_8c0b3ffcf05d61c2() { return logError(function (arg0, arg1, arg2) {
    arg0.set(getArrayU8FromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_set_body_a3d856b097dfda04() { return logError(function (arg0, arg1) {
    arg0.body = arg1;
}, arguments); }
export function __wbg_set_cache_ec7e430c6056ebda() { return logError(function (arg0, arg1) {
    arg0.cache = __wbindgen_enum_RequestCache[arg1];
}, arguments); }
export function __wbg_set_credentials_ed63183445882c65() { return logError(function (arg0, arg1) {
    arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
}, arguments); }
export function __wbg_set_e09648bea3f1af1e() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_set_headers_3c8fecc693b75327() { return logError(function (arg0, arg1) {
    arg0.headers = arg1;
}, arguments); }
export function __wbg_set_integrity_6e605069e31cef0a() { return logError(function (arg0, arg1, arg2) {
    arg0.integrity = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_method_8c015e8bcafd7be1() { return logError(function (arg0, arg1, arg2) {
    arg0.method = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_mode_5a87f2c809cf37c2() { return logError(function (arg0, arg1) {
    arg0.mode = __wbindgen_enum_RequestMode[arg1];
}, arguments); }
export function __wbg_set_redirect_c7b340412376b11a() { return logError(function (arg0, arg1) {
    arg0.redirect = __wbindgen_enum_RequestRedirect[arg1];
}, arguments); }
export function __wbg_set_referrer_4f2f273104bee6d0() { return logError(function (arg0, arg1, arg2) {
    arg0.referrer = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_referrer_policy_3cea8b6e31a9e636() { return logError(function (arg0, arg1) {
    arg0.referrerPolicy = __wbindgen_enum_ReferrerPolicy[arg1];
}, arguments); }
export function __wbg_set_signal_0cebecb698f25d21() { return logError(function (arg0, arg1) {
    arg0.signal = arg1;
}, arguments); }
export function __wbg_signal_166e1da31adcac18() { return logError(function (arg0) {
    const ret = arg0.signal;
    return ret;
}, arguments); }
export function __wbg_stack_3b0d974bbf31e44f() { return logError(function (arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_static_accessor_GLOBAL_8adb955bd33fac2f() { return logError(function () {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_GLOBAL_THIS_ad356e0db91c7913() { return logError(function () {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_SELF_f207c857566db248() { return logError(function () {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_WINDOW_bb9f1ba69d61b386() { return logError(function () {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_status_318629ab93a22955() { return logError(function (arg0) {
    const ret = arg0.status;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_then_098abe61755d12f6() { return logError(function (arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}, arguments); }
export function __wbg_then_9e335f6dd892bc11() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_toString_3272fa0dfd05dd87() { return logError(function (arg0) {
    const ret = arg0.toString();
    return ret;
}, arguments); }
export function __wbg_value_21fc78aab0322612() { return logError(function (arg0) {
    const ret = arg0.value;
    return ret;
}, arguments); }
export function __wbg_view_f68a712e7315f8b2() { return logError(function (arg0) {
    const ret = arg0.view;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_zcashviewwallet_new() { return logError(function (arg0) {
    const ret = ZcashViewWallet.__wrap(arg0);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000001() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { dtor_idx: 612, function: Function { arguments: [], shim_idx: 613, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen_c1809b92ce2d6ed9___closure__destroy___dyn_core_12fa19964ec1fe8b___ops__function__FnMut_____Output_______, wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke_______true_);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000002() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { dtor_idx: 738, function: Function { arguments: [Externref], shim_idx: 737, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen_c1809b92ce2d6ed9___closure__destroy___dyn_core_12fa19964ec1fe8b___ops__function__FnMut__wasm_bindgen_c1809b92ce2d6ed9___JsValue____Output_______, wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___wasm_bindgen_c1809b92ce2d6ed9___JsValue______true_);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000003() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { dtor_idx: 782, function: Function { arguments: [Externref], shim_idx: 874, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen_c1809b92ce2d6ed9___closure__destroy___dyn_core_12fa19964ec1fe8b___ops__function__FnMut__wasm_bindgen_c1809b92ce2d6ed9___JsValue____Output___core_12fa19964ec1fe8b___result__Result_____wasm_bindgen_c1809b92ce2d6ed9___JsError___, wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___wasm_bindgen_c1809b92ce2d6ed9___JsValue__core_12fa19964ec1fe8b___result__Result_____wasm_bindgen_c1809b92ce2d6ed9___JsError___true_);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000004() { return logError(function (arg0) {
    // Cast intrinsic for `F64 -> Externref`.
    const ret = arg0;
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000005() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000006() { return logError(function (arg0) {
    // Cast intrinsic for `U64 -> Externref`.
    const ret = BigInt.asUintN(64, arg0);
    return ret;
}, arguments); }
export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_externrefs;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
}

//#endregion
function wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke_______true_(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke_______true_(arg0, arg1);
}

function wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___bool__true_(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    const ret = wasm.wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___bool__true_(arg0, arg1);
    return ret !== 0;
}

function wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___wasm_bindgen_c1809b92ce2d6ed9___JsValue______true_(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___wasm_bindgen_c1809b92ce2d6ed9___JsValue______true_(arg0, arg1, arg2);
}

function wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___wasm_bindgen_c1809b92ce2d6ed9___JsValue__core_12fa19964ec1fe8b___result__Result_____wasm_bindgen_c1809b92ce2d6ed9___JsError___true_(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    const ret = wasm.wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___wasm_bindgen_c1809b92ce2d6ed9___JsValue__core_12fa19964ec1fe8b___result__Result_____wasm_bindgen_c1809b92ce2d6ed9___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___js_sys_2a125ee6e2c04e11___Function_fn_wasm_bindgen_c1809b92ce2d6ed9___JsValue_____wasm_bindgen_c1809b92ce2d6ed9___sys__Undefined___js_sys_2a125ee6e2c04e11___Function_fn_wasm_bindgen_c1809b92ce2d6ed9___JsValue_____wasm_bindgen_c1809b92ce2d6ed9___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen_c1809b92ce2d6ed9___convert__closures_____invoke___js_sys_2a125ee6e2c04e11___Function_fn_wasm_bindgen_c1809b92ce2d6ed9___JsValue_____wasm_bindgen_c1809b92ce2d6ed9___sys__Undefined___js_sys_2a125ee6e2c04e11___Function_fn_wasm_bindgen_c1809b92ce2d6ed9___JsValue_____wasm_bindgen_c1809b92ce2d6ed9___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_ReadableStreamType = ["bytes"];


const __wbindgen_enum_ReferrerPolicy = ["", "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "unsafe-url", "same-origin", "strict-origin", "strict-origin-when-cross-origin"];


const __wbindgen_enum_RequestCache = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"];


const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];


const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];


const __wbindgen_enum_RequestRedirect = ["follow", "error", "manual"];
const IntoUnderlyingByteSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingbytesource_free(ptr >>> 0, 1));
const IntoUnderlyingSinkFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsink_free(ptr >>> 0, 1));
const IntoUnderlyingSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsource_free(ptr >>> 0, 1));
const ZcashViewWalletFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_zcashviewwallet_free(ptr >>> 0, 1));


//#region intrinsics
function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertBigInt(n) {
    if (typeof(n) !== 'bigint') throw new Error(`expected a bigint argument, found ${typeof(n)}`);
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error(`expected a boolean argument, found ${typeof(n)}`);
    }
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error(`expected a number argument, found ${typeof(n)}`);
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            state.dtor(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (typeof(arg) !== 'string') throw new Error(`expected a string argument, found ${typeof(arg)}`);
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;


//#endregion

//#region wasm loading

let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}

//#endregion
