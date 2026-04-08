import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { SessionService } from '../../core/services/session.service';
import { UserStats } from '../models/session.model';
import { Router } from '@angular/router';

Chart.register(...registerables);

@Component({
  selector: 'app-user-stats',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './user-stats.component.html',
  styleUrls: ['./user-stats.component.scss']
})
export class UserStatsComponent implements OnInit, AfterViewChecked {

  @ViewChild('dailyCanvas') dailyCanvas!: ElementRef;

  // Expose Object to template
  Object = Object;

  stats: UserStats | null = null;
  loading = true;
  error = '';
  private barChart: Chart | null = null;
  private chartInitialized = false;

  constructor(private sessionService: SessionService, private router: Router) {}

  ngOnInit(): void {
    this.sessionService.getMyStats().subscribe({
      next: (data: UserStats) => {
        console.log('✅ Stats received:', data);
        console.log('✅ dailySessions:', data.dailySessions);
        console.log('✅ dailySeconds:', data.dailySeconds);
        this.stats = data;
        this.loading = false;
        this.chartInitialized = false;
        this.barChart = null;
      },
      error: (err) => {
        console.error('❌ Stats error:', err);
        this.error = 'Erreur lors du chargement des statistiques';
        this.loading = false;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (!this.loading && this.stats && !this.chartInitialized && this.dailyCanvas) {
      this.initBarChart();
    }
  }

  private initBarChart(): void {
    const ctx = this.dailyCanvas?.nativeElement?.getContext('2d');
    if (!ctx || !this.stats) return;

    const dailySeconds = this.stats.dailySeconds;
    const labels = Object.keys(dailySeconds);
    const data = (Object.values(dailySeconds) as number[]).map(s => Math.round(s / 60));

    if (this.barChart) {
      this.barChart.destroy();
    }

    // ✅ FIX : afficher "Aucune donnée" seulement si vraiment vide
    const hasData = labels.length > 0;

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hasData ? labels : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [{
          data: hasData ? data : [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: labels.map((_, i) => {
            // ✅ Colorer différemment les jours avec activité
            return data[i] > 0 ? '#4A90D9' : '#D0E4F7';
          }),
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.55
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed.y ?? 0;
                if (val === 0) return 'Aucune activité';
                if (val < 60) return `${val} min`;
                const h = Math.floor(val / 60);
                const m = val % 60;
                return m > 0 ? `${h}h ${m}min` : `${h}h`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              font: { size: 12 },
              color: '#888',
              autoSkip: false,
              maxRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              font: { size: 11 },
              color: '#888',
              callback: (v) => `${v}`
            }
          }
        }
      }
    });

    this.chartInitialized = true;
  }

  // Format : 58 sec / 18 min / 1h 36m
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} sec`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
    }
    return secs > 0 ? `${mins} min ${secs}s` : `${mins} min`;
  }

  get trend(): 'up' | 'down' | 'stable' {
    if (!this.stats) return 'stable';
    if (this.stats.differenceSeconds > 0) return 'up';
    if (this.stats.differenceSeconds < 0) return 'down';
    return 'stable';
  }

  get trendIcon(): string {
    return this.trend === 'up' ? '↑' : this.trend === 'down' ? '↓' : '=';
  }

  get trendColor(): string {
    return this.trend === 'up' ? '#3B6D11' :
           this.trend === 'down' ? '#A32D2D' : '#888780';
  }

  get hasSessions(): boolean {
    return this.stats !== null &&
           this.stats.dailySessions !== null &&
           this.stats.dailySessions.length > 0;
  }

 returnToDashboard(): void {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    this.router.navigate(['/login']);
    return;
  }

  // ✅ Décoder le JWT sans librairie externe
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('🔑 Token payload:', payload);

    // Keycloak met les rôles dans realm_access.roles
    const roles: string[] = payload?.realm_access?.roles || [];
    console.log('🎭 Rôles trouvés:', roles);

    const roleRoutes: Record<string, string> = {
      'ADMIN':                 '/admin/dashboard',
      'TOURIST':               '/touriste/dashboard',
      'INVESTOR':              '/investisseur/dashboard',
      'PARTNER':               '/partenaire-economique/dashboard',
      'LOCAL_PARTNER':         '/partenaire-local/dashboard',
      'INTERNATIONAL_COMPANY': '/societe-international/dashboard',
    };

    // Trouver le premier rôle métier dans le token
    const matchedRole = Object.keys(roleRoutes).find(r => roles.includes(r));

    if (!matchedRole) {
      console.warn('⚠️ Aucun rôle métier trouvé dans le token, rôles:', roles);
      this.router.navigate(['/login']);
      return;
    }

    const dashboardPath = roleRoutes[matchedRole];
    console.log('🚀 Redirection vers:', dashboardPath);
    this.router.navigate([dashboardPath]);

  } catch (e) {
    console.error('❌ Erreur décodage token:', e);
    this.router.navigate(['/login']);
  }
}
}