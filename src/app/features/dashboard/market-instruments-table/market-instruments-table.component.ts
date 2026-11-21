import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { InstrumentMetrics } from '../../../core/models/market-data.model';
import { IntegerPipe, NumberSignPipe, SignedRatioPipe, UsdCentsPipe } from '../../../shared/pipes/number-format.pipes';

@Component({
  selector: 'app-market-instruments-table',
  imports: [IntegerPipe, NumberSignPipe, SignedRatioPipe, UsdCentsPipe],
  templateUrl: 'market-instruments-table.component.html',
  styleUrl: 'market-instruments-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketInstrumentsTableComponent {
  readonly metrics = input.required<readonly InstrumentMetrics[]>();
}
