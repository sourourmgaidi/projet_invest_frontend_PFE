import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';

@Component({
  selector: 'app-my-collaboration-partner',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent],
  templateUrl: './my-collaboration-partner.component.html',
  styleUrls: ['./my-collaboration-partner.component.css']
})
export class MyCollaborationPartnerComponent implements OnInit {

  // ── Données
  pendingRequests: any[]  = [];  // PENDING_PARTNER_APPROVAL
  reservedServices: any[] = [];  // AWAITING_VALIDATION
  takenServices: any[]    = [];  // COMPLETED

  // ── UI
  loading   = false;
  error: string | null    = null;
  success: string | null  = null;
  activeTab: 'requests' | 'reserved' | 'taken' = 'requests';

  cancellingMap: Map<number, boolean> = new Map();

  private http               = inject(HttpClient);
  private router             = inject(Router);
  private acquisitionService = inject(AcquisitionService);
  private cdr                = inject(ChangeDetectorRef);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void { this.loadMyCollaborations(); }

  // ========================================
  // LOAD
  // ========================================
  loadMyCollaborations(): void {
    this.loading = true;
    this.error   = null;

    this.acquisitionService.getMyAllAcquisitions().subscribe({
      next: (acquisitions: ServiceAcquisition[]) => {
        const collab = acquisitions.filter(a => a.serviceType === 'COLLABORATION');

        this.pendingRequests  = collab.filter(a => a.paymentStatus === 'PENDING_PARTNER_APPROVAL');
        this.reservedServices = collab.filter(a => a.paymentStatus === 'AWAITING_VALIDATION');
        this.takenServices    = collab.filter(a => a.paymentStatus === 'COMPLETED');

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.error   = 'Impossible de charger vos collaborations';
        this.loading = false;
      }
    });
  }

  // ========================================
  // CANCEL REQUEST
  // ========================================
  cancelRequest(acq: any): void {
    const reason = prompt('Reason for cancellation:', '');
    if (reason === null) return;

    this.cancellingMap.set(acq.id, true);
    this.acquisitionService.cancelRequest(acq.id, reason || 'Cancelled by user').subscribe({
      next: () => {
        this.cancellingMap.delete(acq.id);
        this.success = '✅ Request cancelled successfully';
        setTimeout(() => this.success = null, 3000);
        setTimeout(() => this.loadMyCollaborations(), 500);
      },
      error: (err: any) => {
        this.cancellingMap.delete(acq.id);
        this.error = err.error?.error || 'Error cancelling request';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  // ========================================
  // CANCEL RESERVATION
  // ========================================
  cancelReservation(acq: any): void {
    const reason = prompt('Reason for cancellation:', '');
    if (reason === null) return;

    this.cancellingMap.set(acq.id, true);
    this.acquisitionService.cancelRequest(acq.id, reason || 'Reservation cancelled').subscribe({
      next: () => {
        this.cancellingMap.delete(acq.id);
        this.success = '✅ Reservation cancelled successfully';
        setTimeout(() => this.success = null, 3000);
        setTimeout(() => this.loadMyCollaborations(), 500);
      },
      error: (err: any) => {
        this.cancellingMap.delete(acq.id);
        this.error = err.error?.error || 'Error cancelling reservation';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  // ========================================
  // HELPERS
  // ========================================
  setTab(tab: 'requests' | 'reserved' | 'taken'): void {
    this.activeTab = tab;
  }

  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-TN').format(amount) + ' TND';
  }

  goToServices(): void {

    this.router.navigate(['/partenaire-economique/services']);
  }
}