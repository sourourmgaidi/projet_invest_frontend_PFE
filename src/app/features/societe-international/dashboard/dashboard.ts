import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MessagerieService } from '../../../core/services/messagerie.service';
import { AcquisitionService } from '../../../core/services/acquisition.service'; // ✅ Ajout

@Component({
  selector: 'app-international-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent],
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

  // ✅ NOUVEAUX COMPTEURS
  pendingRequestsCount = 0;
  takenServicesCount = 0;

  private currentUserId: number | null = null;

  private http = inject(HttpClient);
  private messagerieService = inject(MessagerieService);
  private router = inject(Router);
  private acquisitionService = inject(AcquisitionService); // ✅ Injection

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
    this.loadRequestsCount(); // ✅ Charger les compteurs de demandes
  }

  loadStats(): void {
    // Compter les services de collaboration
    this.http.get<any[]>('http://localhost:8089/api/international-companies/services/collaboration',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => this.collaborationCount = data.length,
      error: () => this.collaborationCount = 0
    });

    // Compter les services d'investissement
    this.http.get<any[]>('http://localhost:8089/api/international-companies/services/investment',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => this.investmentCount = data.length,
      error: () => this.investmentCount = 0
    });
  }

  loadUnreadCount(): void {
    this.messagerieService.getUnreadMessages().subscribe({
      next: (res) => this.unreadCount = res.unreadCount,
      error: () => this.unreadCount = 0
    });
  }

  // ✅ Méthode pour charger les compteurs de demandes
 loadRequestsCount(): void {
  this.acquisitionService.getMyServices().subscribe({
    next: (data) => {
      this.pendingRequestsCount = data.filter(a =>
        a.paymentStatus === 'PENDING_PARTNER_APPROVAL' ||
        a.paymentStatus === 'AWAITING_PAYMENT'
      ).length;

      this.takenServicesCount = data.filter(a =>
        a.paymentStatus === 'COMPLETED'
      ).length;

      console.log('✅ Requests count loaded:', {
        pending: this.pendingRequestsCount,
        taken: this.takenServicesCount
      });
    },
    error: (err) => {
      console.error('❌ Error loading requests count:', err);
      this.pendingRequestsCount = 0;
      this.takenServicesCount = 0;
    }
  });
}

  loadFavoritesCount(): void {
    // Compter les favoris investment
    this.http.get<any>('http://localhost:8089/api/international-companies/favorites/count',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.investmentFavCount = res.count || 0;
      },
      error: (err) => {
        console.error('❌ Error loading investment favorites count:', err);
        this.investmentFavCount = 0;
      }
    });

    // Compter les favoris collaboration
    this.http.get<any>('http://localhost:8089/api/international-companies/collaboration-favorites/count',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.collaborationFavCount = res.count || 0;
      },
      error: (err) => {
        console.error('❌ Error loading collaboration favorites count:', err);
        this.collaborationFavCount = 0;
      }
    });
  }

  // ✅ NAVIGATION VERS LES DEMANDES
  navigateToMyRequests(): void {
    this.router.navigate(['/societe-international/my-requests']);
  }

  // ✅ NAVIGATION VERS LES SERVICES ACQUIS
  navigateToMyTakenServices(): void {
    this.router.navigate(['/societe-international/my-taken-services']);
  }

  // ✅ Navigation vers les services collaboration
  navigateToCollaborationServices(): void {
    this.router.navigate(['/societe-international/collaboration-services']);
  }

  navigateToInvestmentServices(): void {
    this.router.navigate(['/societe-international/services']);
  }

  // ✅ Navigation vers les favoris investment
  navigateToInvestmentFavorites(): void {
    this.router.navigate(['/societe-international/favorites']);
  }

  // ✅ Navigation vers les favoris collaboration
  navigateToCollaborationFavorites(): void {
    this.router.navigate(['/societe-international/favorites-collaboration']);
  }

  // ✅ Navigation vers la messagerie
  navigateToMessages(): void {
    this.router.navigate(['/societe-international/messagerie']);
  }

  // ✅ Rafraîchir tous les compteurs
  refreshCounts(): void {
    this.loadStats();
    this.loadUnreadCount();
    this.loadFavoritesCount();
    this.loadRequestsCount();
  }
}