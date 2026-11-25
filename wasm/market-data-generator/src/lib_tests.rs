use super::*;

const SEED: u64 = 0x1234_5678_9ABC_DEF0;
const MAX_BATCH_BYTES: usize = MAX_BATCH_SIZE as usize * RECORD_BYTES;

/// Owns a buffer from `alloc_buffer` and releases it on drop, so a failing assertion does not leak it.
struct Buffer {
    pointer: *mut u8,
    length: usize,
}

impl Buffer {
    fn new(length: usize) -> Self {
        let pointer = alloc_buffer(length);
        assert!(!pointer.is_null());
        Self { pointer, length }
    }

    fn generate(&mut self, count: u32) -> u32 {
        // SAFETY: the buffer is live and `length` bytes long.
        unsafe { generate_batch(count, self.pointer, self.length) }
    }

    fn bytes(&self) -> &[u8] {
        // SAFETY: the buffer is live and `length` bytes long; tests only read it after a full write.
        unsafe { slice::from_raw_parts(self.pointer, self.length) }
    }
}

impl Drop for Buffer {
    fn drop(&mut self) {
        // SAFETY: allocated by `alloc_buffer(self.length)` in `new`.
        unsafe { dealloc_buffer(self.pointer, self.length) };
    }
}

#[test]
fn rejects_invalid_batch_requests() {
    let mut buffer = Buffer::new(MAX_BATCH_BYTES + RECORD_BYTES);

    assert_eq!(buffer.generate(1), 0, "no active run on a fresh test thread");
    assert_eq!(init(SEED, 2), 2);
    assert_eq!(buffer.generate(0), 0);
    assert_eq!(buffer.generate(MAX_BATCH_SIZE + 1), 0);
    assert_eq!(buffer.generate(u32::MAX), 0, "a huge count must not overflow the length calculation");
    // SAFETY: every call below is rejected before the pointer is dereferenced.
    unsafe {
        assert_eq!(generate_batch(2, buffer.pointer, RECORD_BYTES), 0, "buffer too small");
        assert_eq!(generate_batch(1, ptr::null_mut(), RECORD_BYTES), 0, "null output");
        assert_eq!(generate_batch(1, buffer.pointer.add(1), RECORD_BYTES), 0, "misaligned output");
    }
    assert_eq!(buffer.generate(MAX_BATCH_SIZE), MAX_BATCH_SIZE);
}

#[test]
fn rejected_init_clears_the_previous_run() {
    let mut buffer = Buffer::new(RECORD_BYTES);

    assert_eq!(init(SEED, 2), 2);
    assert_eq!(init(SEED, 0), 0);
    assert_eq!(buffer.generate(1), 0);
}

#[test]
fn buffers_are_aligned_and_invalid_lengths_are_rejected() {
    assert!(alloc_buffer(0).is_null());
    assert!(alloc_buffer(usize::MAX).is_null());

    let buffer = Buffer::new(RECORD_BYTES + 1);
    assert_eq!(buffer.pointer.align_offset(BUFFER_ALIGN), 0);

    // SAFETY: null and zero-length calls are documented no-ops.
    unsafe {
        dealloc_buffer(ptr::null_mut(), RECORD_BYTES);
        dealloc_buffer(buffer.pointer, 0);
    }
}

/// Locks the full pipeline (PRNG, market model, encoding) to the output produced before the module split.
#[test]
fn output_for_a_seed_is_stable() {
    const BATCHES: usize = 10;
    const GOLDEN_FNV1A: u64 = 0xe242_4694_ae42_49d2;

    let mut buffer = Buffer::new(MAX_BATCH_BYTES);
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    assert_eq!(init(SEED, 3), 3);

    for _ in 0..BATCHES {
        assert_eq!(buffer.generate(MAX_BATCH_SIZE), MAX_BATCH_SIZE);
        for &byte in buffer.bytes() {
            hash = (hash ^ u64::from(byte)).wrapping_mul(0x0100_0000_01b3);
        }
    }
    assert_eq!(hash, GOLDEN_FNV1A);
}
