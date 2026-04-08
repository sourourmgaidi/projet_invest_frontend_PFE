import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatsService } from '../../../core/services/stats.service';
import { MonthlyRegistrationDTO } from '../../../shared/models/monthly-registration.model';
import { RouterModule } from '@angular/router';
Chart.register(...registerables);

@Component({
  selector: 'app-monthly-registrations-chart',
  standalone: true,
 imports: [CommonModule, RouterModule],
  templateUrl: './monthly-registrations-chart.component.html',
  styleUrls: ['./monthly-registrations-chart.component.scss']
})
export class MonthlyRegistrationsChartComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('monthlyChart') monthlyChart!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;
  data: MonthlyRegistrationDTO[] = [];
  notification: string = '';
  isLoading: boolean = false;
  hasError: boolean = false;
  monthsCount: number = 12;

  totalRegistrations: number = 0;
  averagePerMonth: number = 0;
  bestMonth: string = '';

  // ✅ FLAG POUR SAVOIR SI LA VUE EST PRÊTE
  private viewReady: boolean = false;

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // ✅ MARQUER LA VUE COMME PRÊTE
    this.viewReady = true;
    // ✅ SI LES DONNÉES SONT DÉJÀ CHARGÉES, RENDRE LE GRAPHIQUE
    if (this.data.length > 0) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  loadData(): void {
    console.log('🔄 Loading monthly data...');
    this.isLoading = true;
    this.hasError = false;

    this.statsService.getMonthlyRegistrations(this.monthsCount).subscribe({
      next: (res: MonthlyRegistrationDTO[]) => {
        console.log('✅ Monthly data received:', res);
        this.data = res;
        this.computeStats();
        
        // ✅ CHARGER LA NOTIFICATION
        this.loadNotification();
        
        this.isLoading = false;
        
        // ✅ ATTENDRE QUE LA VUE SOIT PRÊTE AVANT DE RENDRE
        if (this.viewReady) {
          setTimeout(() => {
            this.renderChart();
          }, 100);
        }
      },
      error: (err: unknown) => {
        console.error('❌ Error loading monthly stats', err);
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  loadNotification(): void {
    this.statsService.getMonthOverMonthNotification().subscribe({
      next: (res: string) => {
        console.log('✅ Notification received:', res);
        this.notification = res;
      },
      error: (err: unknown) => {
        console.error('❌ Error loading notification', err);
      }
    });
  }

  computeStats(): void {
    this.totalRegistrations = this.data.reduce((sum, item) => sum + item.count, 0);
    this.averagePerMonth = this.data.length > 0 
      ? Math.round(this.totalRegistrations / this.data.length) 
      : 0;
    
    const best = [...this.data].sort((a, b) => b.count - a.count)[0];
    this.bestMonth = best ? `${best.monthLabel} ${best.month.split('-')[0]}` : '-';
  }

  renderChart(): void {
    // ✅ VÉRIFIER QUE LE CANVAS EXISTE
    if (!this.monthlyChart || !this.monthlyChart.nativeElement) {
      console.warn('⚠️ Canvas not ready yet, waiting...');
      // Réessayer après un court délai
      setTimeout(() => {
        if (this.monthlyChart && this.monthlyChart.nativeElement) {
          this.renderChart();
        } else {
          console.error('❌ Canvas still not available');
        }
      }, 200);
      return;
    }
    
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    if (!this.data || this.data.length === 0) {
      console.warn('⚠️ No data to render');
      return;
    }

    const labels = this.data.map(d => `${d.monthLabel} ${d.month.split('-')[0]}`);
    const values = this.data.map(d => d.count);

    console.log('📊 Rendering chart with:', { labels, values });

    const barColors = values.map((value, index) => {
      if (index === 0) return 'rgba(54, 162, 235, 0.8)';
      const previousValue = this.data[index - 1]?.count || 0;
      if (value > previousValue) return 'rgba(75, 192, 192, 0.8)';
      if (value < previousValue) return 'rgba(255, 99, 132, 0.8)';
      return 'rgba(201, 203, 207, 0.8)';
    });

    try {
      this.chart = new Chart(this.monthlyChart.nativeElement, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Registrations',
            data: values,
            backgroundColor: barColors,
            borderColor: 'transparent',
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw as number;
                  const index = context.dataIndex;
                  if (index > 0 && this.data[index]?.previousMonthCount > 0) {
                    const change = this.data[index]?.percentageChange || 0;
                    const trend = change > 0 ? '▲' : (change < 0 ? '▼' : '→');
                    return `${value} registrations (${trend} ${Math.abs(change)}% vs previous month)`;
                  }
                  return `${value} registrations`;
                }
              }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0,0,0,0.05)'
              },
              ticks: {
                stepSize: 1,
                callback: (value) => Number.isInteger(value) ? value : ''
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            }
          }
        }
      });
      console.log('✅ Chart rendered successfully');
    } catch (error) {
      console.error('❌ Error creating chart:', error);
    }
  }

  changePeriod(months: number): void {
    this.monthsCount = months;
    this.loadData();
  }
}