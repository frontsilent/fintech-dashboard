use super::*;

const RECORD: MarketRecord = MarketRecord {
    instrument_index: 1,
    price_cents: 2,
    trade_quantity: 3,
    bid_cents: 4,
    ask_cents: 5,
    bid_quantity: 6,
    ask_quantity: 0x0102_0304,
};

#[test]
fn record_is_28_bytes() {
    assert_eq!(RECORD_BYTES, 28);
}

#[test]
fn encodes_fields_in_wire_order_as_little_endian() {
    let bytes = RECORD.to_le_bytes();
    let fields: Vec<u32> = bytes.as_chunks::<4>().0.iter().map(|chunk| u32::from_le_bytes(*chunk)).collect();

    assert_eq!(fields, [1, 2, 3, 4, 5, 6, 0x0102_0304]);
    assert_eq!(bytes[24..], [0x04, 0x03, 0x02, 0x01], "least significant byte first");
}
