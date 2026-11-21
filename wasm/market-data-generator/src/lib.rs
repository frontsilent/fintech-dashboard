//! Deterministic market-data generator compiled to WebAssembly.
//!
//! ABI record layout (7 little-endian u32 values, 28 bytes):
//! instrument_index, price_cents, trade_quantity, bid_cents, ask_cents,
//! bid_quantity, ask_quantity.

use std::alloc::{alloc, dealloc, Layout};
use std::ptr;

const MAX_INSTRUMENTS: usize = 50;
const MAX_BATCH_SIZE: u32 = 1_000;
const RECORD_SIZE: usize = 7 * size_of::<u32>();
const MIN_PRICE_CENTS: u32 = 100;

static mut RNG_STATE: u64 = 0x9E37_79B9_7F4A_7C15;
static mut INSTRUMENT_PRICES: [u32; MAX_INSTRUMENTS] = [0; MAX_INSTRUMENTS];
static mut IS_INITIALIZED: bool = false;
static mut ACTIVE_INSTRUMENT_COUNT: usize = 0;

/// Initializes a new run and resets all per-instrument price history.
#[no_mangle]
pub extern "C" fn init(seed: u64, instrument_count: u32) -> u32 {
    if instrument_count == 0 || instrument_count as usize > MAX_INSTRUMENTS {
        return 0;
    }

    unsafe {
        RNG_STATE = if seed == 0 { 0x9E37_79B9_7F4A_7C15 } else { seed };
        for index in 0..MAX_INSTRUMENTS {
            INSTRUMENT_PRICES[index] = if index < instrument_count as usize {
                10_000 + (index as u32 * 2_500)
            } else {
                0
            };
        }
        ACTIVE_INSTRUMENT_COUNT = instrument_count as usize;
        IS_INITIALIZED = true;
    }

    instrument_count
}

/// Allocates a byte buffer in Wasm memory. Pair with `dealloc` after copying it.
#[no_mangle]
pub extern "C" fn alloc_buffer(length: usize) -> *mut u8 {
    if length == 0 {
        return ptr::null_mut();
    }

    let Ok(layout) = Layout::from_size_align(length, 8) else {
        return ptr::null_mut();
    };

    unsafe { alloc(layout) }
}

/// Releases a buffer previously allocated by `alloc_buffer`.
#[no_mangle]
pub extern "C" fn dealloc_buffer(pointer: *mut u8, length: usize) {
    if pointer.is_null() || length == 0 {
        return;
    }

    if let Ok(layout) = Layout::from_size_align(length, 8) {
        unsafe { dealloc(pointer, layout) };
    }
}

/// Writes exactly `count` generated updates into the supplied Wasm-memory buffer.
/// Returns the number of records written, or zero if the request is invalid.
#[no_mangle]
pub extern "C" fn generate_batch(count: u32, output_pointer: *mut u8, output_length: usize) -> u32 {
    if count == 0 || count > MAX_BATCH_SIZE || output_pointer.is_null() {
        return 0;
    }

    let required_length = count as usize * RECORD_SIZE;
    if output_length < required_length {
        return 0;
    }

    unsafe {
        if !IS_INITIALIZED {
            return 0;
        }

        let instrument_count = ACTIVE_INSTRUMENT_COUNT;
        if instrument_count == 0 {
            return 0;
        }

        for record_index in 0..count as usize {
            let instrument_index = (next_random() as usize) % instrument_count;
            let previous_price = INSTRUMENT_PRICES[instrument_index];
            let movement = (next_random() % 11) as i32 - 5;
            let movement = if movement == 0 { 1 } else { movement };
            let candidate_price = previous_price as i64 + movement as i64;
            let next_price = if candidate_price < MIN_PRICE_CENTS as i64 {
                previous_price + 1
            } else {
                candidate_price as u32
            };
            INSTRUMENT_PRICES[instrument_index] = next_price;

            let spread = 1 + (next_random() % 20) as u32;
            let trade_is_ask = next_random() & 1 == 1;
            let (bid_price, ask_price) = if trade_is_ask {
                (next_price - spread, next_price)
            } else {
                (next_price, next_price + spread)
            };
            let trade_quantity = 1 + (next_random() % 100) as u32;
            let bid_quantity = (next_random() % 1_001) as u32;
            let ask_quantity = (next_random() % 1_001) as u32;

            let values = [
                instrument_index as u32,
                next_price,
                trade_quantity,
                bid_price,
                ask_price,
                bid_quantity,
                ask_quantity,
            ];
            let record_pointer = output_pointer.add(record_index * RECORD_SIZE);
            for (field_index, value) in values.iter().enumerate() {
                ptr::write_unaligned(record_pointer.add(field_index * 4).cast::<u32>(), *value);
            }
        }
    }

    count
}

unsafe fn next_random() -> u64 {
    // xorshift64*: all PRNG state transitions happen inside Wasm.
    let mut value = RNG_STATE;
    value ^= value >> 12;
    value ^= value << 25;
    value ^= value >> 27;
    RNG_STATE = value;
    value.wrapping_mul(0x2545_F491_4F6C_DD1D)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn generates_exact_valid_batches_and_evolves_each_instrument_price() {
        let mut previous_prices = HashMap::<u32, u32>::new();
        assert_eq!(init(0x1234_5678_9ABC_DEF0, 5), 5);

        for count in [1_u32, 100, 1_000] {
            let byte_length = count as usize * RECORD_SIZE;
            let output = alloc_buffer(byte_length);
            assert!(!output.is_null());
            let generated = generate_batch(count, output, byte_length);
            assert_eq!(generated, count);

            unsafe {
                for index in 0..count as usize {
                    let record = output.add(index * RECORD_SIZE);
                    let instrument = ptr::read_unaligned(record.cast::<u32>());
                    let price = ptr::read_unaligned(record.add(4).cast::<u32>());
                    let trade_quantity = ptr::read_unaligned(record.add(8).cast::<u32>());
                    let bid = ptr::read_unaligned(record.add(12).cast::<u32>());
                    let ask = ptr::read_unaligned(record.add(16).cast::<u32>());
                    let bid_quantity = ptr::read_unaligned(record.add(20).cast::<u32>());
                    let ask_quantity = ptr::read_unaligned(record.add(24).cast::<u32>());

                    assert!(instrument < 5);
                    assert!(price > 0 && bid > 0 && ask > bid);
                    assert!(trade_quantity > 0);
                    assert!(bid_quantity <= 1_000 && ask_quantity <= 1_000);
                    assert!(price == bid || price == ask);
                    if let Some(previous) = previous_prices.insert(instrument, price) {
                        assert_ne!(price, previous, "price must evolve for each instrument");
                    }
                }
            }

            dealloc_buffer(output, byte_length);
        }
    }
}
