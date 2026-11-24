//! Deterministic market-data generator compiled to WebAssembly. ABI and record layout: see `wasm/README.md`.

use std::alloc::{Layout, alloc, dealloc};
use std::cell::RefCell;
use std::{ptr, slice};

const MAX_INSTRUMENTS: u32 = 50;
const MAX_BATCH_SIZE: u32 = 1_000;
/// Seven little-endian `u32` fields per record; mirrored by `decode-market-updates.ts`.
const RECORD_FIELDS: usize = 7;
const RECORD_BYTES: usize = RECORD_FIELDS * size_of::<u32>();
const BUFFER_ALIGN: usize = align_of::<u32>();

/// xorshift never leaves state `0`, so a zero seed is replaced.
const FALLBACK_SEED: u64 = 0x9E37_79B9_7F4A_7C15;
const BASE_PRICE_CENTS: u32 = 10_000;
const PRICE_STEP_CENTS: u32 = 2_500;
const MIN_PRICE_CENTS: u32 = 100;
const MAX_PRICE_MOVE_CENTS: u32 = 5;
const MAX_SPREAD_CENTS: u32 = 20;
const MAX_TRADE_QUANTITY: u32 = 100;
const MAX_BOOK_QUANTITY: u32 = 1_000;

/// One run: the xorshift64* PRNG state and the last price of every instrument.
struct Generator {
    rng: u64,
    prices: Vec<u32>,
}

impl Generator {
    fn new(seed: u64, instrument_count: u32) -> Option<Self> {
        (1..=MAX_INSTRUMENTS).contains(&instrument_count).then(|| Self {
            rng: if seed == 0 { FALLBACK_SEED } else { seed },
            prices: (0..instrument_count).map(|index| BASE_PRICE_CENTS + index * PRICE_STEP_CENTS).collect(),
        })
    }

    /// Uniform value in `min..=max`, taken from the high bits by multiply-shift (no modulo bias).
    fn random(&mut self, min: u32, max: u32) -> u32 {
        self.rng ^= self.rng >> 12;
        self.rng ^= self.rng << 25;
        self.rng ^= self.rng >> 27;
        let bits = self.rng.wrapping_mul(0x2545_F491_4F6C_DD1D) >> 32;
        min + ((bits * u64::from(max - min + 1)) >> 32) as u32
    }

    /// Instrument, price, trade quantity, bid, ask, bid quantity, ask quantity.
    fn next_record(&mut self) -> [u32; RECORD_FIELDS] {
        let instrument = self.random(0, self.prices.len() as u32 - 1);
        let previous = self.prices[instrument as usize];
        // Symmetric random walk (no drift) that always moves and is reflected at the price floor.
        let step = self.random(1, MAX_PRICE_MOVE_CENTS);
        let move_up = self.random(0, 1) == 1 || previous - step < MIN_PRICE_CENTS;
        let price = if move_up { previous + step } else { previous - step };
        self.prices[instrument as usize] = price;

        // Every trade executes at the current bid or ask.
        let spread = self.random(1, MAX_SPREAD_CENTS);
        let (bid, ask) = if self.random(0, 1) == 1 { (price - spread, price) } else { (price, price + spread) };
        let trade_quantity = self.random(1, MAX_TRADE_QUANTITY);

        let (bid_quantity, ask_quantity) = (self.random(0, MAX_BOOK_QUANTITY), self.random(0, MAX_BOOK_QUANTITY));

        [instrument, price, trade_quantity, bid, ask, bid_quantity, ask_quantity]
    }
}

thread_local! {
    /// The active run. Wasm is single-threaded, so this is a global without `static mut`.
    static GENERATOR: RefCell<Option<Generator>> = const { RefCell::new(None) };
}

/// Starts a new run. Returns `instrument_count`, or `0` (clearing the previous run) if it is unsupported.
#[unsafe(no_mangle)]
pub extern "C" fn init(seed: u64, instrument_count: u32) -> u32 {
    let generator = Generator::new(seed, instrument_count);
    let result = if generator.is_some() { instrument_count } else { 0 };
    GENERATOR.set(generator);
    result
}

/// Allocates a buffer in Wasm memory; null for `0` or an invalid size.
#[unsafe(no_mangle)]
pub extern "C" fn alloc_buffer(length: usize) -> *mut u8 {
    match Layout::from_size_align(length, BUFFER_ALIGN) {
        Ok(layout) if length > 0 => unsafe { alloc(layout) },
        _ => ptr::null_mut(),
    }
}

/// # Safety
/// `pointer` must come from `alloc_buffer(length)` and must not be used afterwards.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dealloc_buffer(pointer: *mut u8, length: usize) {
    if !pointer.is_null() && length > 0 {
        unsafe { dealloc(pointer, Layout::from_size_align_unchecked(length, BUFFER_ALIGN)) };
    }
}

/// Writes `count` records. Returns `count`, or `0` when there is no active run, `count` is outside
/// `1..=MAX_BATCH_SIZE` or the buffer is too small.
///
/// # Safety
/// `output` must point to `output_length` writable bytes, e.g. a buffer from `alloc_buffer`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn generate_batch(count: u32, output: *mut u8, output_length: usize) -> u32 {
    let length = count as usize * RECORD_BYTES;
    if !(1..=MAX_BATCH_SIZE).contains(&count) || output.is_null() || output_length < length {
        return 0;
    }
    let bytes = unsafe { slice::from_raw_parts_mut(output, length) };

    GENERATOR.with_borrow_mut(|active| {
        let Some(generator) = active else { return 0 };
        for record in bytes.as_chunks_mut::<RECORD_BYTES>().0 {
            record.copy_from_slice(generator.next_record().map(u32::to_le_bytes).as_flattened());
        }
        count
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEED: u64 = 0x1234_5678_9ABC_DEF0;

    #[test]
    fn generates_valid_records_and_always_moves_the_price() {
        let mut generator = Generator::new(SEED, 5).unwrap();
        let mut prices = generator.prices.clone();

        for _ in 0..50_000 {
            let [instrument, price, quantity, bid, ask, bid_quantity, ask_quantity] = generator.next_record();
            let previous = std::mem::replace(&mut prices[instrument as usize], price);
            assert!((1..=MAX_PRICE_MOVE_CENTS).contains(&price.abs_diff(previous)));
            assert!(price >= MIN_PRICE_CENTS && bid < ask && (price == bid || price == ask));
            assert!((1..=MAX_TRADE_QUANTITY).contains(&quantity));
            assert!(bid_quantity.max(ask_quantity) <= MAX_BOOK_QUANTITY);
        }
    }

    #[test]
    fn price_walk_has_no_drift() {
        let mut generator = Generator::new(SEED, 1).unwrap();
        (0..200_000).for_each(|_| _ = generator.next_record());
        // The previous `0 → +1` walk drifted about +18_000 cents over this many updates.
        assert!(generator.prices[0].abs_diff(BASE_PRICE_CENTS) < 2_000);
    }

    #[test]
    fn is_deterministic_and_rejects_invalid_instrument_counts() {
        let records = |seed| {
            let mut generator = Generator::new(seed, 3).unwrap();
            (0..100).map(|_| generator.next_record()).collect::<Vec<_>>()
        };
        assert_eq!(records(SEED), records(SEED));
        assert_ne!(records(SEED), records(0));
        assert!(Generator::new(SEED, 0).is_none() && Generator::new(SEED, MAX_INSTRUMENTS + 1).is_none());
    }

    #[test]
    fn abi_rejects_invalid_requests() {
        let length = (MAX_BATCH_SIZE as usize + 1) * RECORD_BYTES;
        let buffer = alloc_buffer(length);
        unsafe {
            assert_eq!(generate_batch(1, buffer, length), 0, "no active run on a fresh test thread");
            assert_eq!(init(SEED, 2), 2);
            assert_eq!(generate_batch(0, buffer, length), 0);
            assert_eq!(generate_batch(MAX_BATCH_SIZE + 1, buffer, length), 0);
            assert_eq!(generate_batch(2, buffer, RECORD_BYTES), 0);
            assert_eq!(generate_batch(MAX_BATCH_SIZE, buffer, length), MAX_BATCH_SIZE);
            dealloc_buffer(buffer, length);
        }
    }
}
