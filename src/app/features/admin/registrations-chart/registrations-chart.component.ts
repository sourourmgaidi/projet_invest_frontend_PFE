import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';  // ← AJOUTER CET IMPORT
import { Chart, registerables } from 'chart.js';
import { StatsService } from '../../../core/services/stats.service';
import { RegistrationBarDTO } from '../../../shared/models/RegistrationBarDTO';

Chart.register(...registerables);

@Component({
  selector: 'app-registrations-chart',
  standalone: true,  // ← AJOUTER SI standalone
  imports: [CommonModule],  // ← AJOUTER CETTE LIGNE
  templateUrl: './registrations-chart.component.html',
  styleUrls: ['./registrations-chart.component.scss']
})
export class RegistrationsChartComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;
  data: RegistrationBarDTO[] = [];

  currentYear:  number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1;

  months = [
    { value: 1,  label: 'Janvier'   },
    { value: 2,  label: 'Février'   },
    { value: 3,  label: 'Mars'      },
    { value: 4,  label: 'Avril'     },
    { value: 5,  label: 'Mai'       },
    { value: 6,  label: 'Juin'      },
    { value: 7,  label: 'Juillet'   },
    { value: 8,  label: 'Août'      },
    { value: 9,  label: 'Septembre' },
    { value: 10, label: 'Octobre'   },
    { value: 11, label: 'Novembre'  },
    { value: 12, label: 'Décembre'  },
  ];

  totalInscrits: number = 0;
  maxJour:       number = 0;
  moyenneJour:   number = 0;
  isLoading:     boolean = false;
  hasError:      boolean = false;

  // ✅ Correction erreur injection
  constructor(private statsService: StatsService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }

  loadData(): void {
    this.isLoading = true;
    this.hasError  = false;

    this.statsService.getDailyRegistrations(this.currentYear, this.currentMonth)
      .subscribe({
        // ✅ Correction erreur 'any' implicite
        next: (res: RegistrationBarDTO[]) => {
          this.data      = res;
          this.isLoading = false;
          this.computeStats();
          this.renderChart();
        },
        error: (err: unknown) => {
          console.error('Erreur chargement stats', err);
          this.isLoading = false;
          this.hasError  = true;
        }
      });
  }

  computeStats(): void {
    this.totalInscrits = this.data.reduce((s, d) => s + d.count, 0);
    this.maxJour       = Math.max(...this.data.map(d => d.count), 0);
    this.moyenneJour   = this.data.length
      ? Math.round(this.totalInscrits / this.data.length)
      : 0;
  }

  renderChart(): void {
    if (this.chart) this.chart.destroy();

    const labels = this.data.map(d => d.dayLabel);
    const values = this.data.map(d => d.count);
    const maxVal = Math.max(...values, 1);

    const barColors = values.map(v => {
      const intensity = v / maxVal;
      const r = Math.round(190 + (1 - intensity) * 40);
      const g = Math.round(50  + (1 - intensity) * 60);
      const b = Math.round(100 + (1 - intensity) * 40);
      return `rgb(${r}, ${g}, ${b})`;
    });

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Inscriptions',
          data: values,
          backgroundColor: barColors,
          borderColor: 'transparent',
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Jour ${items[0].label}`,
              label: (item)  => ` ${item.raw} inscrit(s)`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              font: { size: 11 },
              color: '#999',
              callback: function(val, index) {
                const day = index + 1;
                return [1, 7, 11, 15, 19, 23, 27, 31].includes(day)
                  ? String(day) : '';
              }
            }
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            border: { display: false },
            ticks: {
              font: { size: 11 },
              color: '#999',
              stepSize: 1,
              padding: 8,
              callback: (v) => Number.isInteger(v) ? v : ''
            },
            beginAtZero: true,
          }
        }
      }
    });
  }

  prevMonth(): void {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.loadData();
  }

  nextMonth(): void {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.loadData();
  }
}