// investor-dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';

@Component({
  selector: 'app-investor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  opportunitiesCount = 0;
  pendingRequestsCount = 0;    // PENDING_PARTNER_APPROVAL + AWAITING_PAYMENT
  takenServicesCount = 0;      // COMPLETED (payés)
  pendingPaymentCount = 0;     // AWAITING_PAYMENT uniquement
  recentActivities: any[] = [];

  private currentUserId: number | null = null;

  private http = inject(HttpClient);
  private acquisitionService = inject(AcquisitionService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      return JSON.parse(atob(padded));
    } catch { return null; }
  }

  private loadProfile(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<any>('http://localhost:8089/api/auth/me', {
        headers: this.getHeaders()
      }).subscribe({
        next: (profile) => {
          this.currentUserId = profile.id ?? profile.userId ?? null;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    this.loadOpportunitiesCount();
    this.loadAcquisitionStats();
  }

  loadOpportunitiesCount(): void {
    this.http.get<any[]>(
      'http://localhost:8089/api/investment-services/approved',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.opportunitiesCount = data.length;
      },
      error: () => {
        this.opportunitiesCount = 0;
      }
    });
  }

 loadAcquisitionStats(): void {
  this.acquisitionService.getMyServices().subscribe({
    next: (acquisitions: ServiceAcquisition[]) => {
      const investmentOnly = acquisitions.filter(a => a.serviceType === 'INVESTMENT');

      this.pendingRequestsCount = investmentOnly.filter(
        a => a.paymentStatus === 'PENDING_PARTNER_APPROVAL' ||
             a.paymentStatus === 'AWAITING_PAYMENT'
      ).length;

      this.takenServicesCount = investmentOnly.filter(
        a => a.paymentStatus === 'COMPLETED'
      ).length;

      this.pendingPaymentCount = investmentOnly.filter(
        a => a.paymentStatus === 'AWAITING_PAYMENT'
      ).length;

      this.recentActivities = investmentOnly
        .sort((a, b) =>
          new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime()
        )
        .slice(0, 5)
        .map(a => ({
          type: a.paymentStatus === 'COMPLETED' ? 'success' :
                a.paymentStatus === 'AWAITING_PAYMENT' ? 'warning' : 'info',
          message: this.getActivityMessage(a),
          date: a.acquiredAt
        }));
    },
    error: (err) => {
      console.error('❌ Erreur chargement acquisitions:', err);
    }
  });
}

  getActivityMessage(acquisition: ServiceAcquisition): string {
    switch (acquisition.paymentStatus) {
      case 'COMPLETED':
        return `✅ Acquired: ${acquisition.serviceName}`;
      case 'AWAITING_PAYMENT':
        return `⏳ Payment pending: ${acquisition.serviceName}`;
      case 'PENDING_PARTNER_APPROVAL':
        return `📤 Awaiting approval: ${acquisition.serviceName}`;
      case 'PARTNER_REJECTED':
        return `❌ Rejected: ${acquisition.serviceName}`;
      default:
        return `📋 ${acquisition.serviceName} — ${acquisition.paymentStatus}`;
    }
  }
}