//! Shared error type and parsing helpers.
//!
//! The FROST, Noise and PCZT code is written against this plain Rust error type so
//! that it can be unit-tested natively; the `#[wasm_bindgen]` wrappers convert it
//! into a `JsError` at the boundary.

use zcash_protocol::consensus::Network;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Error(pub String);

impl Error {
    pub fn new(msg: impl Into<String>) -> Self {
        Error(msg.into())
    }
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for Error {}

pub type Result<T> = std::result::Result<T, Error>;

/// Converts any displayable error into an [`Error`] with a context prefix.
pub fn ctx<E: std::fmt::Display>(context: &'static str) -> impl FnOnce(E) -> Error {
    move |e| Error(format!("{context}: {e}"))
}

/// Converts any debuggable error into an [`Error`] with a context prefix.
pub fn ctx_dbg<E: std::fmt::Debug>(context: &'static str) -> impl FnOnce(E) -> Error {
    move |e| Error(format!("{context}: {e:?}"))
}

/// Decodes a hex string that must be exactly `N` bytes long.
pub fn parse_hex_array<const N: usize>(s: &str, what: &str) -> Result<[u8; N]> {
    let bytes =
        hex::decode(s.trim()).map_err(|e| Error(format!("Invalid {what} hex: {e}")))?;
    <[u8; N]>::try_from(bytes.as_slice())
        .map_err(|_| Error(format!("{what} must be {N} bytes, got {}", bytes.len())))
}

/// Interprets a byte slice that must be exactly `N` bytes long.
pub fn bytes_array<const N: usize>(b: &[u8], what: &str) -> Result<[u8; N]> {
    <[u8; N]>::try_from(b).map_err(|_| Error(format!("{what} must be {N} bytes, got {}", b.len())))
}

/// Parses the `"main" | "test"` network strings used across the JS API.
pub fn parse_network(network: &str) -> Result<Network> {
    match network.trim() {
        "main" | "mainnet" => Ok(Network::MainNetwork),
        "test" | "testnet" => Ok(Network::TestNetwork),
        other => Err(Error(format!(
            "Invalid network {other:?}: expected \"main\" or \"test\""
        ))),
    }
}

pub fn network_name(network: Network) -> &'static str {
    match network {
        Network::MainNetwork => "main",
        Network::TestNetwork => "test",
    }
}
