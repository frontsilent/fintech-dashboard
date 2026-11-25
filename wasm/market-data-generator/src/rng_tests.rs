use super::*;

const SEED: u64 = 0x1234_5678_9ABC_DEF0;

#[test]
fn is_deterministic_for_a_seed() {
    let sample = |seed| {
        let mut random = XorShift64Star::from_seed(seed);
        (0..100).map(|_| random.next_in(0..=1_000)).collect::<Vec<_>>()
    };
    assert_eq!(sample(SEED), sample(SEED));
    assert_ne!(sample(SEED), sample(SEED + 1));
}

#[test]
fn replaces_a_zero_seed_instead_of_getting_stuck() {
    let mut random = XorShift64Star::from_seed(0);
    let values: Vec<_> = (0..10).map(|_| random.next_in(0..=u32::MAX)).collect();
    assert!(values.iter().any(|&value| value != 0));
}

#[test]
fn stays_inside_the_range_including_the_full_u32_span() {
    let mut random = XorShift64Star::from_seed(SEED);
    for _ in 0..10_000 {
        assert!((5..=9).contains(&random.next_in(5..=9)));
        assert_eq!(random.next_in(7..=7), 7);
        random.next_in(0..=u32::MAX);
    }
}
