//! Market model: per-instrument prices, the price walk and the order-book quote around each trade.

use crate::market_record::MarketRecord;
use crate::rng::RandomSource;

pub const MAX_INSTRUMENTS: u32 = 50;

const BASE_PRICE_CENTS: u32 = 10_000;
const PRICE_STEP_CENTS: u32 = 2_500;
const MIN_PRICE_CENTS: u32 = 100;
const MAX_PRICE_MOVE_CENTS: u32 = 5;
const MAX_SPREAD_CENTS: u32 = 20;
const MAX_TRADE_QUANTITY: u32 = 100;
const MAX_BOOK_QUANTITY: u32 = 1_000;

/// Best bid and ask around a trade.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Quote {
    bid_cents: u32,
    ask_cents: u32,
}

/// Symmetric random walk with no drift: the price always moves by 1–5 cents and is reflected
/// upwards instead of falling below `MIN_PRICE_CENTS`.
fn next_price(random: &mut impl RandomSource, previous_cents: u32) -> u32 {
    let step = random.next_in(1..=MAX_PRICE_MOVE_CENTS);
    let move_up = random.next_bool();

    match previous_cents.checked_sub(step) {
        Some(lower) if !move_up && lower >= MIN_PRICE_CENTS => lower,
        _ => previous_cents + step,
    }
}

/// The trade executes at the bid or the ask, so the price is always one side of the spread.
fn quote(random: &mut impl RandomSource, price_cents: u32) -> Quote {
    let spread = random.next_in(1..=MAX_SPREAD_CENTS);

    if random.next_bool() {
        Quote { bid_cents: price_cents - spread, ask_cents: price_cents }
    } else {
        Quote { bid_cents: price_cents, ask_cents: price_cents + spread }
    }
}

/// One simulation run: the random source and the last price of every instrument.
pub struct MarketGenerator<R: RandomSource> {
    random: R,
    prices_cents: Vec<u32>,
}

impl<R: RandomSource> MarketGenerator<R> {
    /// `None` when `instrument_count` is outside `1..=MAX_INSTRUMENTS`.
    pub fn new(random: R, instrument_count: u32) -> Option<Self> {
        (1..=MAX_INSTRUMENTS).contains(&instrument_count).then(|| Self {
            random,
            prices_cents: (0..instrument_count).map(|index| BASE_PRICE_CENTS + index * PRICE_STEP_CENTS).collect(),
        })
    }

    /// Picks an instrument, moves its price, then quotes the book around the trade.
    /// The order of random draws is part of the deterministic output for a seed; keep it stable.
    pub fn next_record(&mut self) -> MarketRecord {
        // At most `MAX_INSTRUMENTS` prices, so the length always fits in `u32`.
        let last_index = self.prices_cents.len() as u32 - 1;
        let instrument_index = self.random.next_in(0..=last_index);
        let price_slot = &mut self.prices_cents[instrument_index as usize];
        let price_cents = next_price(&mut self.random, *price_slot);
        *price_slot = price_cents;

        let Quote { bid_cents, ask_cents } = quote(&mut self.random, price_cents);
        let trade_quantity = self.random.next_in(1..=MAX_TRADE_QUANTITY);
        let bid_quantity = self.random.next_in(0..=MAX_BOOK_QUANTITY);
        let ask_quantity = self.random.next_in(0..=MAX_BOOK_QUANTITY);

        MarketRecord { instrument_index, price_cents, trade_quantity, bid_cents, ask_cents, bid_quantity, ask_quantity }
    }
}

#[cfg(test)]
#[path = "generator_tests.rs"]
mod tests;
