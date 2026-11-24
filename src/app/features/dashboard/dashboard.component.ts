import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MarketInstrumentsTableComponent } from './market-instruments-table/market-instruments-table.component';
import { ProducerControlsComponent } from './producer-controls/producer-controls.component';
import { MarketDataProducerService } from '../../core/services/market-data-producer.service';
import { AlertComponent } from '../../shared/ui/alert/alert.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { formatDecimal } from '../../shared/utils/number-format';

type OverviewItem = {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
  readonly hint: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    AlertComponent,
    MarketInstrumentsTableComponent,
    PageHeaderComponent,
    PanelComponent,
    ProducerControlsComponent,
    StatCardComponent
  ],
  templateUrl: 'dashboard.component.html',
  styleUrl: 'dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly producer = inject(MarketDataProducerService);

  readonly overviewItems = computed<readonly OverviewItem[]>(() => {
    const { instrumentCount, updatesPerBatch, batchIntervalMs } = this.producer.settings();

    return [
      { label: 'Instruments', value: instrumentCount, hint: 'Active symbols' },
      { label: 'Batch size', value: updatesPerBatch, hint: 'Updates per batch' },
      {
        label: 'Nominal rate',
        value: formatDecimal(this.producer.nominalUpdatesPerSecond(), 0),
        unit: '/ sec',
        hint: 'Across all instruments'
      },
      { label: 'Batch interval', value: batchIntervalMs, unit: 'ms', hint: 'Generation interval' }
    ];
  });
}
