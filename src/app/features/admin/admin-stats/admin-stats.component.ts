import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { SessionService } from '../../../core/services/session.service';
import { UserStatsList } from '../../../shared/models/session.model';
import { RouterModule } from '@angular/router';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-stats.component.html',
  styleUrls: ['./admin-stats.component.scss']
})
export class AdminStatsComponent implements OnInit, AfterViewChecked {

  @ViewChild('pieCanvas') pieCanvas!: ElementRef;

  users: UserStatsList[] = [];
  loading = true;
  error = '';
  private pieChart: Chart | null = null;

  // ✅ Palette baby colors
  private readonly ROLE_FILL: { [k: string]: string } = {
    INVESTOR:             '#B3D9F7',
    TOURIST:              '#B8EDD8',
    PARTNER:              '#FADADD',
    LOCAL_PARTNER:        '#FFD6F0',
    INTERNATIONAL_COMPANY:'#D4C5F9',
    ADMIN:                '#D6EAD4'
  };

  private readonly ROLE_BG: { [k: string]: string } = {
    INVESTOR:             '#E8F4FD',
    TOURIST:              '#E4F7EF',
    PARTNER:              '#FDF0F1',
    LOCAL_PARTNER:        '#FFF0FA',
    INTERNATIONAL_COMPANY:'#F0ECFE',
    ADMIN:                '#EEF7ED'
  };

  private readonly ROLE_TEXT: { [k: string]: string } = {
    INVESTOR:             '#2a6a9a',
    TOURIST:              '#2a7a56',
    PARTNER:              '#9a3a46',
    LOCAL_PARTNER:        '#9a2a7a',
    INTERNATIONAL_COMPANY:'#5a3aaa',
    ADMIN:                '#3a6a38'
  };

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    this.sessionService.getAllUsersStats().subscribe({
      next: (data: UserStatsList[]) => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur chargement des statistiques';
        this.loading = false;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (!this.loading && this.users.length > 0 && !this.pieChart && this.pieCanvas) {
      this.initPieChart();
    }
  }

  private initPieChart(): void {
    const ctx = this.pieCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.roleStats.map(r => r.role),
        datasets: [{
          data: this.roleStats.map(r => r.count),
          backgroundColor: this.roleStats.map(r => r.fill),
          borderWidth: 3,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '65%'
      }
    });
  }

  getDays(user: UserStatsList): { label: string; seconds: number }[] {
    const dailySeconds = user.dailySeconds;
    if (!dailySeconds || Object.keys(dailySeconds).length === 0) return [];
    return Object.entries(dailySeconds).map(([label, seconds]) => ({
      label,
      seconds: Number(seconds)
    }));
  }

  get maxDaySeconds(): number {
    return Math.max(...this.users.flatMap(u =>
      Object.values(u.dailySeconds || {}).map(Number)
    ), 1);
  }

  getDayBarHeight(seconds: number): number {
    return Math.max(Math.round((seconds / this.maxDaySeconds) * 22), 2);
  }

  get roleStats(): { role: string; count: number; fill: string; bg: string; text: string }[] {
    const map: { [key: string]: number } = {};
    this.users.forEach(u => {
      map[u.userRole] = (map[u.userRole] || 0) + 1;
    });
    return Object.entries(map).map(([role, count]) => ({
      role, count,
      fill: this.ROLE_FILL[role] || '#ddd',
      bg:   this.ROLE_BG[role]   || '#f5f5f5',
      text: this.ROLE_TEXT[role]  || '#555'
    }));
  }

  get top10(): UserStatsList[] {
    return [...this.users]
      .sort((a, b) => b.totalSecondsThisWeek - a.totalSecondsThisWeek)
      .slice(0, 10);
  }

  get activeThisWeek(): number {
    return this.users.filter(u => u.totalSecondsThisWeek > 0).length;
  }

  get totalTimeThisWeek(): number {
    return this.users.reduce((a, u) => a + u.totalSecondsThisWeek, 0);
  }

  get avgTimeThisWeek(): number {
    return this.users.length ? Math.round(this.totalTimeThisWeek / this.users.length) : 0;
  }

  get maxSeconds(): number {
    return Math.max(...this.users.map(u => u.totalSecondsThisWeek), 1);
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  getRoleFill(role: string):  string { return this.ROLE_FILL[role]  || '#ddd'; }
  getRoleBg(role: string):    string { return this.ROLE_BG[role]    || '#f5f5f5'; }
  getRoleText(role: string):  string { return this.ROLE_TEXT[role]  || '#555'; }

  getBarWidth(seconds: number): number {
    return Math.round((seconds / this.maxSeconds) * 100);
  }
}