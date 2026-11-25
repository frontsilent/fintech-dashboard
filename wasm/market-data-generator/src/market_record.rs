//! One generated market update and its binary wire format.

/// Number of `u32` fields in an encoded record.
pub const RECORD_FIELD_COUNT: usize = 7;
/// Size of an encoded record; mirrored by `MARKET_UPDATE_RECORD_BYTES` in `wasm-market-data-generator.ts`.
pub const RECORD_BYTES: usize = RECORD_FIELD_COUNT * size_of::<u32>();

/// A trade on one instrument plus the latest order-book snapshot. Prices are integer cents.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MarketRecord {
    pub instrument_index: u32,
    pub price_cents: u32,
    pub trade_quantity: u32,
    pub bid_cents: u32,
    pub ask_cents: u32,
    pub bid_quantity: u32,
    pub ask_quantity: u32,
}

impl MarketRecord {
    /// Field order on the wire. This is the binary contract with TypeScript (`recordFieldOffset` in
    /// `wasm-market-data-generator.ts`): change both sides together.
    fn wire_fields(self) -> [u32; RECORD_FIELD_COUNT] {
        [
            self.instrument_index,
            self.price_cents,
            self.trade_quantity,
            self.bid_cents,
            self.ask_cents,
            self.bid_quantity,
            self.ask_quantity,
        ]
    }

    /// Encodes the record as consecutive little-endian `u32` values.
    pub fn to_le_bytes(self) -> [u8; RECORD_BYTES] {
        let mut bytes = [0; RECORD_BYTES];
        for (chunk, value) in bytes.as_chunks_mut::<{ size_of::<u32>() }>().0.iter_mut().zip(self.wire_fields()) {
            *chunk = value.to_le_bytes();
        }
        bytes
    }
}

#[cfg(test)]
#[path = "market_record_tests.rs"]
mod tests;
