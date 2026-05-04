// investor-dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';
import { ChatbotWidgetComponent } from '../../../shared/Agents/chatbot-widget.component';

@Component({
  selector: 'app-investor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent, ChatbotWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  opportunitiesCount = 0;
  pendingRequestsCount = 0;    // PENDING_PARTNER_APPROVAL + AWAITING_VALIDATION
  takenServicesCount = 0;      // COMPLETED (payés)
  pendingValidationCount = 0; 
  favoritesCount = 0; 
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
    this.loadFavoritesCount(); 
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
    // ✅ CORRECTION: Utiliser getMyAllAcquisitions() au lieu de getMyServices()
    // getMyServices() retourne seulement les COMPLETED
    // getMyAllAcquisitions() retourne TOUS les statuts
    this.acquisitionService.getMyAllAcquisitions().subscribe({
      next: (acquisitions: ServiceAcquisition[]) => {
        const investmentOnly = acquisitions.filter(a => a.serviceType === 'INVESTMENT');

        // ✅ CORRECTION: Remplacer AWAITING_PAYMENT par AWAITING_VALIDATION
        this.pendingRequestsCount = investmentOnly.filter(
          a => a.paymentStatus === 'PENDING_PARTNER_APPROVAL' ||
               a.paymentStatus === 'AWAITING_VALIDATION'
        ).length;

this.takenServicesCount = investmentOnly.filter(
  a => a.paymentStatus === 'COMPLETED' ||
       a.paymentStatus === 'PENDING_PARTNER_APPROVAL' ||
       a.paymentStatus === 'RESERVED' ||
       a.paymentStatus === 'AWAITING_VALIDATION'
).length;

        // ✅ CORRECTION: Renommé pendingPaymentCount → pendingValidationCount
        this.pendingValidationCount = investmentOnly.filter(
          a => a.paymentStatus === 'AWAITING_VALIDATION'
        ).length;

        // ✅ CORRECTION: Gérer les dates nullables
        this.recentActivities = investmentOnly
          .filter(a => a.acquiredAt !== null) // Filtrer les null
          .sort((a, b) => {
            const dateA = a.acquiredAt ? new Date(a.acquiredAt).getTime() : 0;
            const dateB = b.acquiredAt ? new Date(b.acquiredAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5)
          .map(a => ({
            type: a.paymentStatus === 'COMPLETED' ? 'success' :
                  a.paymentStatus === 'AWAITING_VALIDATION' ? 'warning' : 
                  a.paymentStatus === 'PENDING_PARTNER_APPROVAL' ? 'info' : 'secondary',
            message: this.getActivityMessage(a),
            date: a.acquiredAt
          }));
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement acquisitions:', err);
      }
    });
  }

  getActivityMessage(acquisition: ServiceAcquisition): string {
    switch (acquisition.paymentStatus) {
      case 'COMPLETED':
        return `✅ Acquis: ${acquisition.serviceName}`;
      case 'AWAITING_VALIDATION':
        return `⏳ En attente de validation du paiement: ${acquisition.serviceName}`;
      case 'PENDING_PARTNER_APPROVAL':
        return `📤 En attente d'approbation: ${acquisition.serviceName}`;
      case 'PARTNER_REJECTED':
        return `❌ Demandé refusée: ${acquisition.serviceName}`;
      case 'CANCELLED':
        return `🚫 Demandé annulée: ${acquisition.serviceName}`;
      default:
        return `📋 ${acquisition.serviceName} — ${acquisition.paymentStatus}`;
    }
  }
loadFavoritesCount(): void {
  this.http.get<any>(
    'http://localhost:8089/api/investors/favorites/count',
    { headers: this.getHeaders() }
  ).subscribe({
    next: (res) => { this.favoritesCount = res.count ?? 0; },
    error: () => { this.favoritesCount = 0; }
  });
}
}