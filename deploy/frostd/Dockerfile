# frostd, the Zcash Foundation's FROST relay server
# (https://github.com/ZcashFoundation/frost-tools). Treasury key ceremonies and
# signing sessions exchange their end-to-end encrypted messages through it.
#
# It runs plain HTTP on Railway's private network only. Browsers reach it
# through the Zalary server's same-origin /frostd proxy, which adds TLS (via the
# Railway edge) and requires a Zalary login.
#
# frostd keeps sessions in memory, so a redeploy drops any ceremony or signing
# session in flight. Bump the pinned revision deliberately.

FROM rust:1-bookworm AS build
ARG FROST_TOOLS_REV=06c0dbdbb1bac9b99cd255e74ba2f387c295e660
RUN cargo install --locked \
    --git https://github.com/ZcashFoundation/frost-tools.git \
    --rev "${FROST_TOOLS_REV}" \
    frostd

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/local/cargo/bin/frostd /usr/local/bin/frostd
EXPOSE 2744
# [::] accepts both IPv6 (Railway private networking) and IPv4.
CMD ["frostd", "--ip", "[::]", "--port", "2744", "--no-tls-very-insecure"]
