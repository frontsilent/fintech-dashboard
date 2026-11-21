import type { MarketUpdate } from './market-data.model';
import type { ProducerSettings } from './producer-settings.model';
import type { MessageByType } from '../../shared/utils/message-dispatch';

/** Commands sent from Angular to the market-data Worker. */
export type MainToWorkerMessage =
  | {
      readonly type: 'init';
      readonly runId: number;
      readonly settings: ProducerSettings;
      readonly seed: bigint;
      readonly wasmUrl: string;
    }
  | { readonly type: 'pause'; readonly runId: number }
  | { readonly type: 'resume'; readonly runId: number }
  | { readonly type: 'dispose'; readonly runId: number };

/** Events sent from the market-data Worker back to Angular. */
export type WorkerToMainMessage =
  | { readonly type: 'ready'; readonly runId: number }
  | { readonly type: 'batch'; readonly runId: number; readonly updates: readonly MarketUpdate[] }
  | { readonly type: 'paused'; readonly runId: number }
  | { readonly type: 'resumed'; readonly runId: number }
  | { readonly type: 'error'; readonly runId: number; readonly message: string };

export type MainToWorkerMessageMap = MessageByType<MainToWorkerMessage>;
export type WorkerToMainMessageMap = MessageByType<WorkerToMainMessage>;
