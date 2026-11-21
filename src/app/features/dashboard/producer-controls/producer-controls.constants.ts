import type { ProducerStatus } from '../../../core/models/producer-state.model';
import type { ButtonAppearance } from '../../../shared/ui/button/button.directive';

export type ProducerAction = 'pause' | 'resume';

export type ProducerControl = {
  readonly label: string;
  readonly appearance: ButtonAppearance;
  /** `null` renders a disabled button. */
  readonly action: ProducerAction | null;
}

/** Control shown for each producer status; `null` hides the control. */
export const PRODUCER_CONTROL_BY_STATUS = {
  idle: null,
  initializing: { label: 'Starting…', appearance: 'secondary', action: null },
  running: { label: 'Pause', appearance: 'secondary', action: 'pause' },
  paused: { label: 'Resume', appearance: 'primary', action: 'resume' },
  error: null
} as const satisfies Record<ProducerStatus, ProducerControl | null>;
