import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteCollaborationService } from '../../../core/services/favorite-collaboration.service';
import { CurrencyConverterComponent } from '../../../features/public/currency-converter/currency-converter.component';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionModalComponent } from '../../../shared/models/subscription-modal.component';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';

@Component({
  selector: 'app-collaboration-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SubscriptionModalComponent,
    NotificationBellComponent,
    CurrencyConverterComponent
  ],
  templateUrl: './collaboration-services.component.html',
  styleUrls: ['./collaboration-services.component.css']
})
export class CollaborationServicesComponent implements OnInit, OnDestroy {

  services: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();

  showSubscriptionModal = false;
  private pendingProvider: { email: string; name: string } | null = null;

  cancellingRequests: Map<number, boolean> = new Map();

  private http = inject(HttpClient);
  private router = inject(Router);
  private favoriteService = inject(FavoriteCollaborationService);
  private subscriptionService = inject(SubscriptionService);
  private acquisitionService = inject(AcquisitionService);
  private cdr = inject(ChangeDetectorRef);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void { this.loadServices(); }

  ngOnDestroy(): void {
    this.imageBlobUrls.forEach(url => window.URL.revokeObjectURL(url));
    this.imageBlobUrls.clear();
  }

loadServices(): void {
  this.loading = true;
  this.error = null;

  this.http.get<any[]>(
    'http://localhost:8089/api/collaboration-services',
    { headers: this.getHeaders() }
  ).subscribe({
    next: (data) => {
      console.log('🔍 RAW DATA:', data.map(s => ({ id: s.id, name: s.name, status: s.status })));
      this.services = data
        .filter(s => ['APPROVED', 'PENDING_ACQUISITION', 'RESERVED'].includes(s.status))
        .map(s => ({
          ...s,
          id: Number(s.id),
          status: s.status || 'APPROVED',
          isMyAcquisition: false,
          awaitingMyPayment: false,
          isPendingApproval: false,
          isMyReservation: false,
          // ✅ Set directly from backend status — don't wait for enrichment
          isRequestedByOther:
            s.status === 'PENDING_ACQUISITION' || s.status === 'RESERVED',
          acquisitionId: null,
          amount: null,
          acquiredAt: null
        }));

      this.filtered = [...this.services];
      this.checkFavoritesStatus();
      this.enrichWithAcquisitionStatus();
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur chargement:', err);
      this.error = 'Impossible de charger les services de collaboration';
      this.loading = false;
    }
  });
}

  // ========================================
  // ACQUISITION
  // ========================================
enrichWithAcquisitionStatus(): void {
  this.acquisitionService.getMyAllAcquisitions().subscribe({
    next: (acquisitions: ServiceAcquisition[]) => {
      const collabAcquisitions = acquisitions.filter(
        (a: ServiceAcquisition) => a.serviceType === 'COLLABORATION'
      );

      this.services.forEach((service: any) => {
        // Reset only the "my acquisition" flags — NOT isRequestedByOther
        service.isMyAcquisition   = false;
        service.awaitingMyPayment  = false;
        service.isPendingApproval  = false;
        service.isMyReservation    = false;
        service.acquisitionId      = null;
        service.amount             = null;
        service.acquiredAt         = null;

        const acq = collabAcquisitions.find(
          (a: ServiceAcquisition) => Number(a.serviceId) === Number(service.id)
        );

        if (acq) {
          // ✅ This IS my acquisition — clear the "other user" flag
          service.isRequestedByOther = false;

          switch (acq.paymentStatus) {
            case 'COMPLETED':
              service.isMyAcquisition = true;
              service.acquiredAt      = acq.acquiredAt;
              service.status          = 'TAKEN';
              break;

            case 'AWAITING_VALIDATION':
              service.awaitingMyPayment = true;
              service.amount            = acq.amount;
              service.acquisitionId     = acq.id;
              service.status            = 'AWAITING_VALIDATION';
              break;

            case 'PENDING_PARTNER_APPROVAL':
              service.isPendingApproval = true;
              service.acquisitionId     = acq.id;
              service.status            = 'PENDING_ACQUISITION';
              break;

            case 'PARTNER_APPROVED':
              service.isMyReservation = true;
              service.acquisitionId   = acq.id;
              service.amount          = acq.amount;
              service.status          = 'RESERVED';
              break;

            case 'PARTNER_REJECTED':
            case 'CANCELLED':
              // My request was rejected/cancelled — service is free again
              service.isRequestedByOther = false;
              service.status = 'APPROVED';
              break;
          }
        }
        // ✅ No else needed — isRequestedByOther was already set in loadServices()
      });

      this.filtered = [...this.services];
      this.cdr.detectChanges();
    },
    error: (err) => console.error('❌ Acquisitions error:', err)
  });
}

  takeService(service: any): void {
    service.takeLoading = true;
    this.acquisitionService.initiate({
      serviceType: 'COLLABORATION',
      serviceId: service.id,
      amount: Number(service.requestedBudget || 0)
    }).subscribe({
      next: () => {
        service.takeLoading = false;
        this.success = '✅ Request sent successfully!';
        setTimeout(() => this.success = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
        service.takeLoading = false;
        this.error = err.error?.error || 'Error sending request';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  cancelRequest(service: any): void {
    if (!service.acquisitionId) return;
    const reason = prompt('Reason for cancellation:', '');
    this.cancellingRequests.set(service.id, true);
    this.acquisitionService.cancelRequest(
      service.acquisitionId, reason || 'Cancelled by user'
    ).subscribe({
      next: () => {
        this.cancellingRequests.delete(service.id);
        this.success = '✅ Request cancelled';
        setTimeout(() => this.success = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
        this.cancellingRequests.delete(service.id);
        this.error = err.error?.error || 'Error cancelling';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  cancelReservation(service: any): void {
    if (!service.acquisitionId) return;
    const reason = prompt('Reason for cancellation:', '');
    this.cancellingRequests.set(service.id, true);
    this.acquisitionService.cancelRequest(
      service.acquisitionId, reason || 'Reservation cancelled by user'
    ).subscribe({
      next: () => {
        this.cancellingRequests.delete(service.id);
        this.success = '✅ Reservation cancelled successfully';
        setTimeout(() => this.success = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
        this.cancellingRequests.delete(service.id);
        this.error = err.error?.error || 'Error cancelling reservation';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  // ========================================
  // FAVORIS
  // ========================================
  checkFavoritesStatus(): void {
    this.services.forEach(service => {
      this.favoriteService.checkCompanyFavorite(service.id).subscribe({
        next: (res) => { service.isFavorite = res.isFavorite; },
        error: () => { service.isFavorite = false; }
      });
    });
  }

  toggleFavorite(service: any): void {
    if (service.favoriteLoading) return;
    service.favoriteLoading = true;
    if (service.isFavorite) {
      this.favoriteService.removeCompanyFavorite(service.id).subscribe({
        next: () => { service.isFavorite = false; service.favoriteLoading = false; this.success = 'Service retiré des favoris'; setTimeout(() => this.success = null, 3000); },
        error: (err) => { this.error = err.error?.error || 'Erreur'; service.favoriteLoading = false; setTimeout(() => this.error = null, 3000); }
      });
    } else {
      this.favoriteService.addCompanyFavorite(service.id).subscribe({
        next: () => { service.isFavorite = true; service.favoriteLoading = false; this.success = 'Service ajouté aux favoris'; setTimeout(() => this.success = null, 3000); },
        error: (err) => { this.error = err.error?.error || 'Erreur'; service.favoriteLoading = false; setTimeout(() => this.error = null, 3000); }
      });
    }
  }

  // ========================================
  // RECHERCHE
  // ========================================
  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { this.filtered = this.services; return; }
    this.filtered = this.services.filter(s =>
      [s.name, s.description, s.region?.name, s.contactPerson,
       s.collaborationType, s.activityDomain, s.expectedBenefits,
       `${s.provider?.firstName} ${s.provider?.lastName}`]
      .some(val => val && val.toString().toLowerCase().includes(q))
    );
  }

  clearSearch(): void { this.searchQuery = ''; this.filtered = this.services; }

  // ========================================
  // CONTACT PROVIDER
  // ========================================
  contactProvider(provider: any): void {
    if (!provider?.email) return;
    this.pendingProvider = {
      email: provider.email,
      name: `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Local Partner'
    };
    this.subscriptionService.checkSubscription().subscribe({
      next: (status) => { status.hasActiveSubscription ? this.openChat(provider) : (this.showSubscriptionModal = true); },
      error: () => { this.openChat(provider); }
    });
  }

  private openChat(provider: any): void {
    const name = `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Local Partner';
    this.router.navigate(['/societe-international/messagerie'], { queryParams: { contact: provider.email, name } });
  }

  onSubscribed(): void {
    this.showSubscriptionModal = false;
    if (this.pendingProvider) {
      this.openChat({
        email: this.pendingProvider.email,
        firstName: this.pendingProvider.name.split(' ')[0],
        lastName: this.pendingProvider.name.split(' ')[1] || ''
      });
      this.pendingProvider = null;
    }
  }

  // ========================================
  // DOCUMENTS & IMAGES
  // ========================================
  formatEnum(value: string): string {
    if (!value) return '';
    return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  loadImage(doc: any): void {
    const docId = doc.id.toString();
    if (this.imageLoading.has(docId)) return;
    this.imageLoading.add(docId);
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
      next: (blob: Blob) => { this.imageBlobUrls.set(docId, window.URL.createObjectURL(blob)); this.imageLoading.delete(docId); this.cdr.detectChanges(); },
      error: () => { this.imageLoading.delete(docId); }
    });
  }

  getImageUrl(doc: any): string {
    const docId = doc.id.toString();
    if (this.imageBlobUrls.has(docId)) return this.imageBlobUrls.get(docId)!;
    this.loadImage(doc);
    return 'assets/images/loading-image.png';
  }

  openImage(doc: any): void {
    const docId = doc.id.toString();
    if (this.imageBlobUrls.has(docId)) {
      this.selectedImage = { url: this.imageBlobUrls.get(docId)!, name: doc.fileName, doc };
    } else {
      this.http.get(`http://localhost:8089${doc.downloadUrl}`, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          this.imageBlobUrls.set(docId, url);
          this.selectedImage = { url, name: doc.fileName, doc };
        },
        error: (err) => console.error('Erreur image', err)
      });
    }
  }

  closeImage(): void { this.selectedImage = null; }

  downloadFile(doc: any): void {
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = doc.fileName; a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erreur téléchargement', err)
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  onSubscriptionSuccess(): void {
    this.showSubscriptionModal = false;
    if (this.pendingProvider) {
      this.openMessaging(this.pendingProvider.email, this.pendingProvider.name);
      this.pendingProvider = null;
    }
  }
  onSubscriptionClosed(): void { this.showSubscriptionModal = false; this.pendingProvider = null; }
  openMessaging(email: string, name: string): void {
    this.router.navigate(['/societe-international/messagerie'], { queryParams: { contact: email, name } });
  }
  checkSubscriptionAndContact(provider: any): void { this.contactProvider(provider); }
}