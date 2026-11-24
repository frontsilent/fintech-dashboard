import type { MarketUpdate } from './market-data.model';
import type { ProducerSettings } from './producer-settings.model';
import type { MessageByType } from '../../shared/utils/message-dispatch';

/** Every message on the Worker channel is tagged with the run it belongs to; stale runs are ignored. */
type RunMessage<TType extends string, TPayload extends object = object> =
  { readonly type: TType; readonly runId: number } & Readonly<TPayload>;

/** Commands sent from Angular to the market-data Worker. */
export type WorkerCommand =
  | RunMessage<'init', { settings: ProducerSettings; seed: bigint; wasmUrl: string }>
  | RunMessage<'pause'>
  | RunMessage<'resume'>
  | RunMessage<'dispose'>;

/** Events sent from the market-data Worker back to Angular. */
export type WorkerEvent =
  | RunMessage<'ready'>
  | RunMessage<'batch', { updates: readonly MarketUpdate[] }>
  | RunMessage<'paused'>
  | RunMessage<'resumed'>
  | RunMessage<'error', { message: string }>;

export type WorkerCommandMap = MessageByType<WorkerCommand>;
export type WorkerEventMap = MessageByType<WorkerEvent>;
