import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ AJOUT IMPORTANT
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';

interface PendingServices {
  collaboration: any[];
  investment: any[];
  tourist: any[];
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent], // ✅ AJOUT DE FormsModule
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class AdminNotificationsComponent implements OnInit, OnDestroy {

  pendingServices: PendingServices = {
    collaboration: [],
    investment: [],
    tourist: []
  };

  loading = false;
  processingId: number | null = null;
  successMsg = '';
  errorMsg = '';

  // ✅ Propriétés pour la modal de rejet
  showRejectModal = false;
  selectedService: any = null;
  selectedServiceType: 'collaboration' | 'investment' | 'tourist' | null = null;
  rejectionReason = '';

  // ✅ Propriétés pour les images
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageUrls: Map<string, string> = new Map();
  maxConcurrentLoads = 5;
  imageQueue: { doc: any; docId: string; serviceId: number }[] = [];
  isLoading = false;
   activeTab: string = 'collaboration';

  private apiBase = 'http://localhost:8089/api/admin/services';
  private apiBaseInvestment = 'http://localhost:8089/api/investment-services';
  private apiBaseCollaboration = 'http://localhost:8089/api/collaboration-services';
  private apiBaseTourist = 'http://localhost:8089/api/tourist-services';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPendingServices();
  }

  ngOnDestroy(): void {
    this.imageUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
    this.imageUrls.clear();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private getJsonHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  get totalPending(): number {
    return (
      this.pendingServices.collaboration.length +
      this.pendingServices.investment.length +
      this.pendingServices.tourist.length
    );
  }

  loadPendingServices(): void {
    this.loading = true;
    this.errorMsg = '';

    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<PendingServices>(`${this.apiBase}/pending`, { headers }).subscribe({
      next: (data) => {
        this.pendingServices = {
          collaboration: data.collaboration || [],
          investment: data.investment || [],
          tourist: data.tourist || []
        };
        this.loading = false;
        this.prepareImageLoading();
      },
      error: (err) => {
        console.error('Error loading pending services:', err);
        this.errorMsg = 'Failed to load pending services. Please try again.';
        this.loading = false;
      }
    });
  }

 prepareImageLoading(): void {
  // Charger les images pour les 3 types de services
  const serviceTypes = ['collaboration', 'investment', 'tourist'];
  
  serviceTypes.forEach(type => {
    this.pendingServices[type as keyof PendingServices].forEach((service: any) => {
      if (service.documents && service.documents.length > 0) {
        service.documents.forEach((doc: any) => {
          // Ne charger que les images, pas les PDF
          if (doc.fileType?.startsWith('image/')) {
            const docId = doc.id.toString();
            if (!this.imageUrls.has(docId)) {
              this.imageQueue.push({ doc, docId, serviceId: service.id });
            }
          }
        });
      }
    });
  });
  
  console.log(`📸 ${this.imageQueue.length} images à charger`);
  this.processQueue();
}
  processQueue(): void {
    if (this.isLoading || this.imageQueue.length === 0) return;
    
    this.isLoading = true;
    const batch = this.imageQueue.splice(0, this.maxConcurrentLoads);
    
    Promise.all(batch.map(item => this.loadImage(item.doc, item.docId)))
      .finally(() => {
        this.isLoading = false;
        if (this.imageQueue.length > 0) {
          this.processQueue();
        }
      });
  }

  loadImage(doc: any, docId: string): Promise<void> {
    return new Promise((resolve) => {
      this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
        headers: this.getHeaders(),
        responseType: 'blob'
      }).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          this.imageUrls.set(docId, url);
          resolve();
        },
        error: (err) => {
          console.error(`❌ Erreur chargement image ${doc.fileName}:`, err);
          this.imageUrls.set(docId, this.getErrorImageUrl());
          resolve();
        }
      });
    });
  }

  getImageUrl(doc: any): string {
    const docId = doc.id.toString();
    
    if (this.imageUrls.has(docId)) {
      return this.imageUrls.get(docId)!;
    }
    
    return this.getPlaceholderImageUrl();
  }

  getPlaceholderImageUrl(): string {
    return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23f3f4f6\'/%3E%3Ctext x=\'50\' y=\'55\' font-size=\'30\' text-anchor=\'middle\' fill=\'%239ca3af\'%3E📷%3C/text%3E%3C/svg%3E';
  }

  getErrorImageUrl(): string {
    return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23fee2e2\'/%3E%3Ctext x=\'50\' y=\'55\' font-size=\'30\' text-anchor=\'middle\' fill=\'%23ef4444\'%3E❌%3C/text%3E%3C/svg%3E';
  }

  openImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageUrls.has(docId)) {
      this.selectedImage = {
        url: this.imageUrls.get(docId)!,
        name: doc.fileName,
        doc: doc
      };
    } else {
      this.loadImage(doc, docId).then(() => {
        this.selectedImage = {
          url: this.imageUrls.get(docId)!,
          name: doc.fileName,
          doc: doc
        };
      });
    }
  }

  closeImage(): void {
    this.selectedImage = null;
  }

  downloadFile(doc: any): void {
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('❌ Erreur téléchargement', err)
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ✅ MÉTHODES POUR LA MODAL DE REJET
  openRejectModal(type: 'collaboration' | 'investment' | 'tourist', service: any): void {
    this.selectedService = service;
    this.selectedServiceType = type;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedService = null;
    this.selectedServiceType = null;
    this.rejectionReason = '';
  }

isReasonValid(): boolean {
  return !!(this.rejectionReason && this.rejectionReason.trim().length >= 5);
}

  // ✅ MÉTHODE APPROUVER (inchangée)
  approveService(type: 'collaboration' | 'investment' | 'tourist', id: number): void {
    this.processingId = id;
    this.clearMessages();

    let endpoint = '';
    
    if (type === 'investment') {
      endpoint = `${this.apiBaseInvestment}/${id}/approve`;
      console.log(`📝 Approbation investissement: ${endpoint}`);
    } else if (type === 'collaboration') {
      endpoint = `${this.apiBaseCollaboration}/${id}/approve`;
      console.log(`📝 Approbation collaboration: ${endpoint}`);
    } else if (type === 'tourist') {
      endpoint = `${this.apiBaseTourist}/${id}/approve`;
      console.log(`📝 Approbation touristique: ${endpoint}`);
    }

    this.http.put(endpoint, {}, { headers: this.getHeaders() }).subscribe({
      next: (response) => {
        console.log('✅ Réponse approbation:', response);
        this.removeServiceFromList(type, id);
        this.successMsg = `Service ${type} approuvé avec succès !`;
        this.processingId = null;
        this.autoHideSuccess();
      },
      error: (err) => {
        console.error('Error approving service:', err);
        this.errorMsg = 'Failed to approve service. Please try again.';
        this.processingId = null;
      }
    });
  }

  // ✅ MÉTHODE REJET (modifiée pour ouvrir la modal)
  rejectService(type: 'collaboration' | 'investment' | 'tourist', id: number): void {
    let service = null;
    if (type === 'investment') {
      service = this.pendingServices.investment.find(s => s.id === id);
    } else if (type === 'collaboration') {
      service = this.pendingServices.collaboration.find(s => s.id === id);
    } else if (type === 'tourist') {
      service = this.pendingServices.tourist.find(s => s.id === id);
    }
    
    if (service) {
      this.openRejectModal(type, service);
    } else {
      console.error('Service non trouvé');
    }
  }

  // ✅ MÉTHODE POUR CONFIRMER LE REJET AVEC RAISON
  confirmReject(): void {
    if (!this.selectedService || !this.selectedServiceType || !this.isReasonValid()) {
      return;
    }

    this.processingId = this.selectedService.id;
    this.clearMessages();

    const body = { rejectionReason: this.rejectionReason.trim() };
    let endpoint = '';

    if (this.selectedServiceType === 'investment') {
      endpoint = `${this.apiBaseInvestment}/${this.selectedService.id}/reject`;
    } else if (this.selectedServiceType === 'collaboration') {
      endpoint = `${this.apiBaseCollaboration}/${this.selectedService.id}/reject`;
    } else if (this.selectedServiceType === 'tourist') {
      endpoint = `${this.apiBaseTourist}/${this.selectedService.id}/reject`;
    }

    console.log(`📝 Rejet ${this.selectedServiceType} avec raison:`, body);

    this.http.put(endpoint, body, { headers: this.getJsonHeaders() }).subscribe({
      next: (response: any) => {
        console.log('✅ Réponse rejet:', response);
        this.removeServiceFromList(this.selectedServiceType!, this.selectedService.id);
        this.successMsg = `Service ${this.selectedServiceType} rejeté avec succès.`;
        this.processingId = null;
        this.closeRejectModal();
        this.autoHideSuccess();
      },
      error: (err) => {
        console.error(`❌ Erreur rejet ${this.selectedServiceType}:`, err);
        this.errorMsg = err.error?.error || err.error?.message || 'Échec du rejet du service.';
        this.processingId = null;
      }
    });
  }

  private removeServiceFromList(type: string, id: number): void {
    (this.pendingServices as any)[type] = (this.pendingServices as any)[type].filter(
      (s: any) => s.id !== id
    );
  }

  private clearMessages(): void {
    this.successMsg = '';
    this.errorMsg = '';
  }

  private autoHideSuccess(): void {
    setTimeout(() => {
      this.successMsg = '';
    }, 3000);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}