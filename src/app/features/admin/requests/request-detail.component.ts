import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ServiceRequestService, ServiceRequest } from '../../../core/services/service-request.service';
import { AuthService } from '../../../core/services/auth'; // À importer

@Component({
  selector: 'app-admin-request-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.css']
})
export class AdminRequestDetailComponent implements OnInit, OnDestroy {
  request: ServiceRequest | null = null;
  loading = true;
  error = '';
  requestId: number;
  showRejectModal = false;
  rejectReason = '';

  // ✅ NOUVELLE PROPRIÉTÉ
  showSimpleRejectModal = false;

  // ========================================
  // ✅ PROPRIÉTÉS POUR LES IMAGES
  // ========================================
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requestService: ServiceRequestService,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.requestId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.loadRequest();
  }

  ngOnDestroy(): void {
    // Nettoyer les URLs blob
    this.imageBlobUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
    this.imageBlobUrls.clear();
  }

  loadRequest(): void {
    this.loading = true;
    this.requestService.getAdminRequestById(this.requestId).subscribe({
      next: (response) => {
        this.request = response.request;
        this.loading = false;
        console.log('📥 Détails de la demande avec documents:', this.request);
      },
      error: (error) => {
        console.error('Erreur chargement demande:', error);
        this.error = 'Impossible de charger les détails de la demande';
        this.loading = false;
      }
    });
  }

  approveRequest(): void {
    if (!this.request) return;

    const action = this.request.requestType === 'EDIT' 
      ? this.requestService.approveEditRequest(this.request.id)
      : this.requestService.approveDeleteRequest(this.request.id);

    action.subscribe({
      next: () => {
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('Erreur approbation:', error);
        this.error = 'Impossible d\'approuver la demande';
      }
    });
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectReason = '';
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
  }

  rejectRequest(): void {
    if (!this.request || !this.rejectReason.trim()) return;

    this.requestService.rejectRequest(this.request.id, this.rejectReason).subscribe({
      next: () => {
        this.closeRejectModal();
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('Erreur rejet:', error);
        this.error = 'Impossible de rejeter la demande';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/requests']);
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Inconnu';
    switch(status) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvée';
      case 'REJECTED': return 'Rejetée';
      default: return status;
    }
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    return status.toLowerCase();
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPrice(price: number | undefined): string {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND'
    }).format(price);
  }

  // ✅ NOUVELLE MÉTHODE - Ouvrir la modal simple
  openSimpleRejectModal(): void {
    this.showSimpleRejectModal = true;
  }

  // ✅ NOUVELLE MÉTHODE - Fermer la modal simple
  closeSimpleRejectModal(): void {
    this.showSimpleRejectModal = false;
  }

  // ✅ NOUVELLE MÉTHODE - Confirmer le rejet sans raison
  confirmRejectWithoutReason(): void {
    if (!this.request) return;
    
    this.closeSimpleRejectModal();
    
    this.requestService.rejectRequest(this.request.id, 'Rejeté sans raison').subscribe({
      next: () => {
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('Erreur rejet:', error);
        this.error = 'Impossible de rejeter la demande';
      }
    });
  }

  /**
   * Rejeter une demande sans raison (avec confirmation simple)
   */
  rejectRequestWithoutReason(): void {
    if (!this.request) return;
    
    // Confirmation simple
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette demande ?')) {
      return;
    }

    // Appel au service avec une raison par défaut
    this.requestService.rejectRequest(this.request.id, 'Rejeté sans raison').subscribe({
      next: () => {
        // Redirection vers la liste des demandes
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('Erreur rejet:', error);
        this.error = 'Impossible de rejeter la demande';
      }
    });
  }

  // ========================================
  // ✅ MÉTHODES POUR LES IMAGES
  // ========================================

  loadImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageLoading.has(docId)) {
      return;
    }
    
    this.imageLoading.add(docId);
    
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        this.imageBlobUrls.set(docId, url);
        this.imageLoading.delete(docId);
        console.log(`✅ Image ${doc.fileName} chargée avec succès`);
      },
      error: (err) => {
        console.error(`❌ Erreur chargement image ${doc.fileName}:`, err);
        this.imageLoading.delete(docId);
      }
    });
  }

  getImageUrl(doc: any): string {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      return this.imageBlobUrls.get(docId)!;
    } else {
      this.loadImage(doc);
      return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23f1f5f9\'/%3E%3Ctext x=\'50\' y=\'50\' font-size=\'30\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%2394a3b8\'%3E🖼️%3C/text%3E%3C/svg%3E';
    }
  }

  openImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      this.selectedImage = {
        url: this.imageBlobUrls.get(docId)!,
        name: doc.fileName,
        doc: doc
      };
    } else {
      const token = this.authService.getToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
        headers: headers,
        responseType: 'blob'
      }).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          this.imageBlobUrls.set(docId, url);
          this.selectedImage = {
            url: url,
            name: doc.fileName,
            doc: doc
          };
        },
        error: (err) => console.error('Erreur chargement image', err)
      });
    }
  }

  closeImage(): void {
    this.selectedImage = null;
  }

  downloadFile(doc: any): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
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
      error: (err) => console.error('Erreur téléchargement', err)
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}