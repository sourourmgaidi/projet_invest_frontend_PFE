import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { StatsService } from '../../../core/services/stats.service';
import { StatsSummary } from '../../../shared/models/stats.model';
import { TunisiaMapboxComponent } from '../tunisia-mapbox/tunisia-mapbox.component';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    TranslateModule,
    TunisiaMapboxComponent,
    LanguageSwitcherComponent   // ← importer le composant
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  private statsService = inject(StatsService);

  stats: StatsSummary | null = null;
  loading = true;
  private statsSub: Subscription | null = null;

  ngOnInit(): void {
    this.statsSub = this.statsService.getSummary().subscribe({
      next: (data) => { this.stats = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.statsSub?.unsubscribe();
  }
}