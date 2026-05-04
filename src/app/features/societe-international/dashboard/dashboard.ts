// dashboard.ts (societe-international)
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MessagerieService } from '../../../core/services/messagerie.service';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';
import { ChatbotWidgetComponent } from "../../../shared/Agents/chatbot-widget.component";

@Component({
  selector: 'app-international-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent, ChatbotWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  collaborationCount = 0;
  investmentCount = 0;
  unreadCount = 0;

  // Compteurs pour les favoris
  investmentFavCount = 0;
  collaborationFavCount = 0;

  // ✅ COMPTEURS INVESTMENT
  pendingRequestsCount = 0;
  takenServicesCount = 0;
  pendingValidationCount = 0;

  // ✅ COMPTEUR COLLABORATION
  myCollaborationsCount = 0;

  private currentUserId: number | null = null;

  private http = inject(HttpClient);
  private messagerieService = inject(MessagerieService);
  private router = inject(Router);
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
    } catch (e) { return null; }
  }

  private loadUserId(): Promise<void> {
    return new Promise((resolve) => {
      const token = localStorage.getItem('auth_token');
      if (!token) { resolve(); return; }

      this.http.get<any>('http://localhost:8089/api/auth/me', { headers: this.getHeaders() }).subscribe({
        next: (profile) => {
          this.currentUserId = profile.id ?? profile.userId ?? null;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUserId();
    this.loadStats();
    this.loadUnreadCount();
    this.loadFavoritesCount();
    this.loadRequestsCount();
  }

  loadStats(): void {
    this.http.get<any[]>('http://localhost:8089/api/international-companies/services/collaboration',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data: any[]) => this.collaborationCount = data.length,
      error: () => this.collaborationCount = 0
    });

    this.http.get<any[]>('http://localhost:8089/api/international-companies/services/investment',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data: any[]) => this.investmentCount = data.length,
      error: () => this.investmentCount = 0
    });
  }

  loadUnreadCount(): void {
    this.messagerieService.getUnreadMessages().subscribe({
      next: (res: any) => this.unreadCount = res.unreadCount,
      error: () => this.unreadCount = 0
    });
  }

  loadRequestsCount(): void {
    this.acquisitionService.getMyAllAcquisitions().subscribe({
      next: (data: ServiceAcquisition[]) => {
        const investmentOnly    = data.filter((a: ServiceAcquisition) => a.serviceType === 'INVESTMENT');
        const collaborationOnly = data.filter((a: ServiceAcquisition) => a.serviceType === 'COLLABORATION'); // ✅ NOUVEAU

        // PENDING_PARTNER_APPROVAL + AWAITING_VALIDATION
        this.pendingRequestsCount = investmentOnly.filter((a: ServiceAcquisition) =>
          a.paymentStatus === 'PENDING_PARTNER_APPROVAL' ||
          a.paymentStatus === 'AWAITING_VALIDATION'
        ).length;

        // Services COMPLETED
       this.takenServicesCount = investmentOnly.filter((a: ServiceAcquisition) =>
  a.paymentStatus === 'COMPLETED' ||
  a.paymentStatus === 'PENDING_PARTNER_APPROVAL' ||
  a.paymentStatus === 'RESERVED' ||
  a.paymentStatus === 'AWAITING_VALIDATION'
).length;
        // En attente de validation uniquement
        this.pendingValidationCount = investmentOnly.filter((a: ServiceAcquisition) =>
          a.paymentStatus === 'AWAITING_VALIDATION'
        ).length;

        // ✅ NOUVEAU : total collaborations
        this.myCollaborationsCount = collaborationOnly.length;

        console.log('✅ Requests count loaded:', {
          pending: this.pendingRequestsCount,
          taken: this.takenServicesCount,
          pendingValidation: this.pendingValidationCount,
          collaborations: this.myCollaborationsCount
        });
      },
      error: (err: any) => {
        console.error('❌ Error loading requests count:', err);
        this.pendingRequestsCount  = 0;
        this.takenServicesCount    = 0;
        this.pendingValidationCount = 0;
        this.myCollaborationsCount = 0; // ✅ NOUVEAU
      }
    });
  }

  loadFavoritesCount(): void {
    this.http.get<any>('http://localhost:8089/api/international-companies/favorites/count',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res: any) => {
        this.investmentFavCount = res.count || 0;
      },
      error: (err: any) => {
        console.error('❌ Error loading investment favorites count:', err);
        this.investmentFavCount = 0;
      }
    });

    this.http.get<any>('http://localhost:8089/api/international-companies/collaboration-favorites/count',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res: any) => {
        this.collaborationFavCount = res.count || 0;
      },
      error: (err: any) => {
        console.error('❌ Error loading collaboration favorites count:', err);
        this.collaborationFavCount = 0;
      }
    });
  }

  // ── NAVIGATION ────────────────────────────────────

  navigateToMyRequests(): void {
    this.router.navigate(['/societe-international/my-requests']);
  }

  navigateToMyTakenServices(): void {
    this.router.navigate(['/societe-international/my-taken-services']);
  }

  navigateToCollaborationServices(): void {
    this.router.navigate(['/societe-international/collaboration-services']);
  }

  navigateToInvestmentServices(): void {
    this.router.navigate(['/societe-international/services']);
  }

  navigateToInvestmentFavorites(): void {
    this.router.navigate(['/societe-international/favorites']);
  }

  navigateToCollaborationFavorites(): void {
    this.router.navigate(['/societe-international/favorites-collaboration']);
  }

  navigateToMessages(): void {
    this.router.navigate(['/societe-international/messagerie']);
  }

  // ✅ NOUVEAU
  navigateToMyCollaborations(): void {
    this.router.navigate(['/societe-international/my-collaborations']);
  }

  refreshCounts(): void {
    this.loadStats();
    this.loadUnreadCount();
    this.loadFavoritesCount();
    this.loadRequestsCount();
  }
}