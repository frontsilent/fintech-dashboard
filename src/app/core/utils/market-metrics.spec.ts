import { applyMarketUpdates, createMarketMetricsState, selectInstrumentMetrics } from './market-metrics';
import type { MarketUpdate } from '../models/market-data.model';

const update = (overrides: Partial<MarketUpdate> = {}): MarketUpdate => ({
  instrument: 'BTC-USD',
  priceCents: 10_000,
  tradeQuantity: 10,
  bidCents: 9_996,
  askCents: 10_000,
  bidQuantity: 600,
  askQuantity: 400,
  ...overrides
});

const snapshotTrades = { first: 5, second: 7, total: 12n, latestImbalance: 0.5 };
const isolatedTrades = { btc: 2, eth: 9 };

describe('market metrics', () => {
  it('exposes zero volume and unavailable metrics before the first trade', () => {
    const [metrics] = selectInstrumentMetrics(createMarketMetricsState(['BTC-USD']));

    expect(metrics).toEqual({
      instrument: 'BTC-USD',
      lastPriceCents: null,
      spreadCents: null,
      tradingVolume: 0n,
      vwapCents: null,
      orderBookImbalance: null
    });
  });

  it('calculates the worked example exactly', () => {
    const state = applyMarketUpdates(createMarketMetricsState(), [
      update({ priceCents: 10_000, bidCents: 9_996, askCents: 10_000, tradeQuantity: 10 }),
      update({ priceCents: 10_200, bidCents: 10_196, askCents: 10_200, tradeQuantity: 30 })
    ]);
    const [metrics] = selectInstrumentMetrics(state);

    expect(metrics).toEqual({
      instrument: 'BTC-USD',
      lastPriceCents: 10_200,
      spreadCents: 4,
      tradingVolume: 40n,
      vwapCents: 10_150,
      orderBookImbalance: 0.2
    });
  });

  it('uses the latest order-book snapshot and keeps trade volume cumulative', () => {
    const state = applyMarketUpdates(createMarketMetricsState(), [
      update({ tradeQuantity: snapshotTrades.first, bidQuantity: 2, askQuantity: 8 }),
      update({ tradeQuantity: snapshotTrades.second, bidQuantity: 9, askQuantity: 3 })
    ]);
    const [metrics] = selectInstrumentMetrics(state);

    expect(metrics.tradingVolume).toBe(snapshotTrades.total);
    expect(metrics.orderBookImbalance).toBeCloseTo(snapshotTrades.latestImbalance);
  });

  it('keeps metrics isolated by instrument', () => {
    const state = applyMarketUpdates(createMarketMetricsState(), [
      update({ instrument: 'BTC-USD', tradeQuantity: isolatedTrades.btc }),
      update({
        instrument: 'ETH-USD',
        priceCents: 20_000,
        bidCents: 19_996,
        askCents: 20_000,
        tradeQuantity: isolatedTrades.eth
      })
    ]);
    const metrics = selectInstrumentMetrics(state);

    expect(metrics.map((item) => [item.instrument, item.tradingVolume])).toEqual([
      ['BTC-USD', BigInt(isolatedTrades.btc)],
      ['ETH-USD', BigInt(isolatedTrades.eth)]
    ]);
  });

  it('returns unavailable imbalance when the book has no quantity', () => {
    const state = applyMarketUpdates(createMarketMetricsState(), [update({ bidQuantity: 0, askQuantity: 0 })]);

    expect(selectInstrumentMetrics(state)[0]?.orderBookImbalance).toBeNull();
  });

  it('does not mutate the previous state', () => {
    const initial = createMarketMetricsState();
    const next = applyMarketUpdates(initial, [update()]);

    expect(initial.size).toBe(0);
    expect(next.size).toBe(1);
  });

  it.each<Partial<MarketUpdate>>([
    { askCents: 9_995 },
    { priceCents: 9_998 },
    { tradeQuantity: 0 },
    { bidQuantity: -1 },
    { instrument: ' ' }
  ])('rejects invalid market update %p instead of silently corrupting metrics', (overrides) => {
    expect(() => applyMarketUpdates(createMarketMetricsState(), [update(overrides)])).toThrow(RangeError);
  });
});
