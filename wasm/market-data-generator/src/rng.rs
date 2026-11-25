//! Random number source used by the market model.

use std::ops::RangeInclusive;

/// Source of uniform random integers. The market model depends on this trait, not on a concrete PRNG,
/// so tests can drive it with scripted values.
pub trait RandomSource {
    /// Uniform value in `range` (both ends inclusive).
    fn next_in(&mut self, range: RangeInclusive<u32>) -> u32;

    /// Fair coin flip.
    fn next_bool(&mut self) -> bool {
        self.next_in(0..=1) == 1
    }
}

/// xorshift64* PRNG: fast, deterministic for a given seed and good enough for simulated market data.
pub struct XorShift64Star {
    state: u64,
}

impl XorShift64Star {
    /// xorshift never leaves state `0`, so a zero seed is replaced by this constant.
    const FALLBACK_SEED: u64 = 0x9E37_79B9_7F4A_7C15;
    const MULTIPLIER: u64 = 0x2545_F491_4F6C_DD1D;

    pub fn from_seed(seed: u64) -> Self {
        Self { state: if seed == 0 { Self::FALLBACK_SEED } else { seed } }
    }

    fn next_u32(&mut self) -> u32 {
        self.state ^= self.state >> 12;
        self.state ^= self.state << 25;
        self.state ^= self.state >> 27;
        // The high 32 bits of the product are the best-distributed ones.
        (self.state.wrapping_mul(Self::MULTIPLIER) >> 32) as u32
    }
}

impl RandomSource for XorShift64Star {
    /// Maps 32 random bits onto the range by multiply-shift, which avoids the bias of `%`.
    fn next_in(&mut self, range: RangeInclusive<u32>) -> u32 {
        let (min, max) = range.into_inner();
        debug_assert!(min <= max, "empty range {min}..={max}");
        // `u64` so that the full `0..=u32::MAX` span (2^32 values) does not overflow.
        let span = u64::from(max - min) + 1;
        min + ((u64::from(self.next_u32()) * span) >> 32) as u32
    }
}

#[cfg(test)]
#[path = "rng_tests.rs"]
mod tests;
