use std::collections::VecDeque;
use std::ops::RangeInclusive;

use super::*;
use crate::rng::XorShift64Star;

const SEED: u64 = 0x1234_5678_9ABC_DEF0;

/// Returns pre-recorded values, checking that each one is valid for the requested range.
struct ScriptedRandom(VecDeque<u32>);

impl ScriptedRandom {
    fn new(values: impl IntoIterator<Item = u32>) -> Self {
        Self(values.into_iter().collect())
    }
}

impl RandomSource for ScriptedRandom {
    fn next_in(&mut self, range: RangeInclusive<u32>) -> u32 {
        let value = self.0.pop_front().expect("script exhausted");
        assert!(range.contains(&value), "scripted {value} is outside {range:?}");
        value
    }
}

fn generator(seed: u64, instrument_count: u32) -> MarketGenerator<XorShift64Star> {
    MarketGenerator::new(XorShift64Star::from_seed(seed), instrument_count).unwrap()
}

#[test]
fn price_moves_by_the_drawn_step_in_the_drawn_direction() {
    // Draws: step, direction (1 = up).
    assert_eq!(next_price(&mut ScriptedRandom::new([3, 1]), 1_000), 1_003);
    assert_eq!(next_price(&mut ScriptedRandom::new([3, 0]), 1_000), 997);
}

#[test]
fn price_is_reflected_at_the_floor() {
    assert_eq!(next_price(&mut ScriptedRandom::new([5, 0]), MIN_PRICE_CENTS + 4), MIN_PRICE_CENTS + 9);
    assert_eq!(next_price(&mut ScriptedRandom::new([5, 0]), MIN_PRICE_CENTS + 5), MIN_PRICE_CENTS);
}

#[test]
fn trade_price_is_the_bid_or_the_ask() {
    // Draws: spread, side (1 = trade at the ask).
    assert_eq!(quote(&mut ScriptedRandom::new([7, 1]), 500), Quote { bid_cents: 493, ask_cents: 500 });
    assert_eq!(quote(&mut ScriptedRandom::new([7, 0]), 500), Quote { bid_cents: 500, ask_cents: 507 });
}

#[test]
fn next_record_combines_the_drawn_values() {
    // instrument, step, direction, spread, side, trade quantity, bid quantity, ask quantity.
    let random = ScriptedRandom::new([1, 2, 1, 4, 0, 30, 600, 400]);
    let mut generator = MarketGenerator::new(random, 2).unwrap();

    assert_eq!(
        generator.next_record(),
        MarketRecord {
            instrument_index: 1,
            price_cents: 12_502,
            trade_quantity: 30,
            bid_cents: 12_502,
            ask_cents: 12_506,
            bid_quantity: 600,
            ask_quantity: 400,
        }
    );
    assert_eq!(generator.prices_cents, [BASE_PRICE_CENTS, 12_502]);
}

#[test]
fn generates_valid_records_and_always_moves_the_price() {
    let mut generator = generator(SEED, 5);
    let mut prices = generator.prices_cents.clone();

    for _ in 0..50_000 {
        let record = generator.next_record();
        let previous = std::mem::replace(&mut prices[record.instrument_index as usize], record.price_cents);
        assert!((1..=MAX_PRICE_MOVE_CENTS).contains(&record.price_cents.abs_diff(previous)));
        assert!(record.price_cents >= MIN_PRICE_CENTS && record.bid_cents < record.ask_cents);
        assert!(record.price_cents == record.bid_cents || record.price_cents == record.ask_cents);
        assert!((1..=MAX_TRADE_QUANTITY).contains(&record.trade_quantity));
        assert!(record.bid_quantity.max(record.ask_quantity) <= MAX_BOOK_QUANTITY);
    }
}

#[test]
fn price_walk_has_no_drift() {
    let mut generator = generator(SEED, 1);
    (0..200_000).for_each(|_| _ = generator.next_record());
    // The previous `0 → +1` walk drifted about +18_000 cents over this many updates.
    assert!(generator.prices_cents[0].abs_diff(BASE_PRICE_CENTS) < 2_000);
}

#[test]
fn is_deterministic_and_rejects_invalid_instrument_counts() {
    let records = |seed| {
        let mut generator = generator(seed, 3);
        (0..100).map(|_| generator.next_record()).collect::<Vec<_>>()
    };
    assert_eq!(records(SEED), records(SEED));
    assert_ne!(records(SEED), records(0));

    let random = || XorShift64Star::from_seed(SEED);
    assert!(MarketGenerator::new(random(), 0).is_none());
    assert!(MarketGenerator::new(random(), MAX_INSTRUMENTS + 1).is_none());
}
