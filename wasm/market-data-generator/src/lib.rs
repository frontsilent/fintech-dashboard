//! Deterministic market-data generator compiled to WebAssembly. ABI and record layout: see `wasm/README.md`.
//!
//! This file holds the WebAssembly exports used by `wasm-market-data-generator.ts`, the active run and the
//! buffer memory management. Every export validates its arguments and reports failure as `0` / null instead of
//! panicking.
//!
//! - [`generator`]: market simulation and price management.
//! - [`market_record`]: `MarketRecord` and its binary serialization.
//! - [`rng`]: deterministic random number generation.

mod generator;
mod market_record;
mod rng;

use std::alloc::{Layout, alloc, dealloc};
use std::cell::RefCell;
use std::{ptr, slice};

use crate::generator::MarketGenerator;
use crate::market_record::RECORD_BYTES;
use crate::rng::XorShift64Star;

const MAX_BATCH_SIZE: u32 = 1_000;
/// Output buffers are read through a `Uint32Array` view, which requires `u32` alignment.
const BUFFER_ALIGN: usize = align_of::<u32>();

// The largest batch must fit in one slice (`slice::from_raw_parts_mut` requires at most `isize::MAX` bytes).
const _: () = assert!(MAX_BATCH_SIZE as usize * RECORD_BYTES <= isize::MAX as usize);

thread_local! {
    /// The active run. Wasm is single-threaded, so this is a global without `static mut`.
    static GENERATOR: RefCell<Option<MarketGenerator<XorShift64Star>>> = const { RefCell::new(None) };
}

/// The single layout used by both `alloc_buffer` and `dealloc_buffer`; `None` for `0` or an oversized length.
fn buffer_layout(length: usize) -> Option<Layout> {
    if length == 0 {
        return None;
    }
    Layout::from_size_align(length, BUFFER_ALIGN).ok()
}

/// Bytes needed for `count` records; `None` when `count` is outside `1..=MAX_BATCH_SIZE`.
/// The range is checked before multiplying, so the product cannot overflow.
fn batch_byte_length(count: u32) -> Option<usize> {
    if !(1..=MAX_BATCH_SIZE).contains(&count) {
        return None;
    }
    usize::try_from(count).ok()?.checked_mul(RECORD_BYTES)
}

/// Starts a new run. Returns `instrument_count`, or `0` (clearing the previous run) if it is unsupported.
#[unsafe(no_mangle)]
pub extern "C" fn init(seed: u64, instrument_count: u32) -> u32 {
    let generator = MarketGenerator::new(XorShift64Star::from_seed(seed), instrument_count);
    let result = if generator.is_some() { instrument_count } else { 0 };
    GENERATOR.set(generator);
    result
}

/// Allocates a `u32`-aligned buffer in Wasm memory; null for `0`, an oversized length or allocation failure.
#[unsafe(no_mangle)]
pub extern "C" fn alloc_buffer(length: usize) -> *mut u8 {
    match buffer_layout(length) {
        // SAFETY: `buffer_layout` never returns a zero-sized layout.
        Some(layout) => unsafe { alloc(layout) },
        None => ptr::null_mut(),
    }
}

/// Releases a buffer from `alloc_buffer`. Null pointers and lengths `alloc_buffer` would reject are ignored.
///
/// # Safety
/// `pointer` must come from `alloc_buffer(length)` with the same `length`, and must not be used afterwards.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dealloc_buffer(pointer: *mut u8, length: usize) {
    if pointer.is_null() {
        return;
    }
    if let Some(layout) = buffer_layout(length) {
        // SAFETY: by the caller contract, `pointer` was allocated with this same layout by `alloc_buffer`.
        unsafe { dealloc(pointer, layout) };
    }
}

/// Writes `count` encoded records to `output`. Returns `count`, or `0` without writing anything when there is
/// no active run, `count` is outside `1..=MAX_BATCH_SIZE`, or `output` is null, misaligned or too small.
///
/// # Safety
/// `output` must point to `output_length` writable bytes that nothing else accesses during the call,
/// e.g. a buffer from `alloc_buffer(output_length)`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn generate_batch(count: u32, output: *mut u8, output_length: usize) -> u32 {
    let Some(length) = batch_byte_length(count) else { return 0 };
    if output.is_null() || output.align_offset(BUFFER_ALIGN) != 0 || output_length < length {
        return 0;
    }

    GENERATOR.with_borrow_mut(|active| {
        let Some(generator) = active else { return 0 };
        // SAFETY: `output` is non-null and, by the caller contract, valid for `output_length >= length` exclusive
        // bytes; `length <= isize::MAX` is asserted at compile time above.
        let bytes = unsafe { slice::from_raw_parts_mut(output, length) };
        for chunk in bytes.as_chunks_mut::<RECORD_BYTES>().0 {
            *chunk = generator.next_record().to_le_bytes();
        }
        count
    })
}

#[cfg(test)]
#[path = "lib_tests.rs"]
mod tests;
