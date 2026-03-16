import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CollaborationRequestService, CollaborationServiceRequest } from '../../../core/services/collaboration-request.service';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-collaboration-request-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: 'collaboration-request-detail.component.html',
  styleUrls: ['collaboration-request-detail.component.css']
})
export class CollaborationRequestDetailComponent implements OnInit, OnDestroy {
  request: CollaborationServiceRequest | null = null;
  loading = true;
  error = '';
  requestId: number;
  showRejectModal = false;
  rejectReason = '';

  // Propriétés pour les documents
  showSimpleRejectModal = false;
  imageUrls: Map<string, string> = new Map();
  selectedImage: { url: string; name: string; doc: any } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collaborationRequestService: CollaborationRequestService,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.requestId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.loadRequest();
  }

  ngOnDestroy(): void {
    // Nettoyer les URLs blob pour éviter les fuites mémoire
    this.imageUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
    this.imageUrls.clear();
  }

  loadRequest(): void {
    this.loading = true;
    this.collaborationRequestService.getAdminRequestById(this.requestId).subscribe({
      next: (response) => {
        this.request = response.request;
        this.loading = false;
        console.log('📥 Détails de la demande avec documents:', this.request);
      },
      error: (error) => {
        console.error('❌ Erreur chargement demande de collaboration:', error);
        this.error = 'Impossible de charger les détails de la demande';
        this.loading = false;
      }
    });
  }

  approveRequest(): void {
    if (!this.request) return;

    const action = this.request.requestType === 'EDIT' 
      ? this.collaborationRequestService.approveEditRequest(this.request.id)
      : this.collaborationRequestService.approveDeleteRequest(this.request.id);

    action.subscribe({
      next: () => {
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('❌ Erreur approbation:', error);
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

    this.collaborationRequestService.rejectRequest(this.request.id, this.rejectReason).subscribe({
      next: () => {
        this.closeRejectModal();
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('❌ Erreur rejet:', error);
        this.error = 'Impossible de rejeter la demande';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/requests']);
  }

  // ========================================
  // MÉTHODES POUR LES DOCUMENTS
  // ========================================

  openSimpleRejectModal(): void {
    this.showSimpleRejectModal = true;
  }

  closeSimpleRejectModal(): void {
    this.showSimpleRejectModal = false;
  }

  confirmRejectWithoutReason(): void {
    if (!this.request) return;
    
    this.closeSimpleRejectModal();
    
    this.collaborationRequestService.rejectRequest(this.request.id, 'Rejeté sans raison').subscribe({
      next: () => {
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('❌ Erreur rejet:', error);
        this.error = 'Impossible de rejeter la demande';
      }
    });
  }

  rejectRequestWithoutReason(): void {
    if (!this.request) return;
    
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette demande ?')) {
      return;
    }

    this.collaborationRequestService.rejectRequest(this.request.id, 'Rejeté sans raison').subscribe({
      next: () => {
        this.router.navigate(['/admin/requests']);
      },
      error: (error) => {
        console.error('❌ Erreur rejet:', error);
        this.error = 'Impossible de rejeter la demande';
      }
    });
  }

 getImageUrl(doc: any): string {
  const docId = `doc-${doc.id}`;
  
  // Si l'image est déjà chargée, retourner l'URL blob
  if (this.imageUrls.has(docId)) {
    return this.imageUrls.get(docId)!;
  }

  // Sinon, charger l'image
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
    headers: headers,
    responseType: 'blob'
  }).subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      this.imageUrls.set(docId, url);
    },
    error: (err) => {
      console.error('❌ Erreur chargement image:', err);
      // En cas d'erreur, mettre un indicateur d'erreur
      this.imageUrls.set(docId, 'error');
    }
  });

  // Retourner une data URL pour le placeholder (pas de fichier physique)
  return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23f1f5f9\'/%3E%3Ctext x=\'50\' y=\'50\' font-size=\'30\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%2394a3b8\'%3E🖼️%3C/text%3E%3C/svg%3E';
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
      error: (err) => console.error('❌ Erreur téléchargement:', err)
    });
  }
openImage(doc: any): void {
  const docId = `doc-${doc.id}`;
  
  // Vérifier si l'image est déjà dans le Map
  if (this.imageUrls.has(docId)) {
    const imageUrl = this.imageUrls.get(docId);
    
    // Si c'est une URL blob valide (pas une erreur)
    if (imageUrl && imageUrl !== 'error' && imageUrl.startsWith('blob:')) {
      this.selectedImage = {
        url: imageUrl,
        name: doc.fileName,
        doc: doc
      };
      console.log('✅ Image affichée depuis le cache:', doc.fileName);
      return;
    }
  }
  
  // Sinon, charger l'image
  console.log('⏳ Chargement de l\'image:', doc.fileName);
  
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
    headers: headers,
    responseType: 'blob'
  }).subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      this.imageUrls.set(docId, url);
      this.selectedImage = {
        url: url,
        name: doc.fileName,
        doc: doc
      };
      console.log('✅ Image chargée et affichée:', doc.fileName);
    },
    error: (err) => {
      console.error('❌ Erreur chargement image:', err);
      this.imageUrls.set(docId, 'error');
      alert('Impossible de charger l\'image');
    }
  });
}

  closeImage(): void {
    this.selectedImage = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

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

  formatBudget(budget: number | undefined): string {
    if (!budget && budget !== 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND'
    }).format(budget);
  }

  getRequestIcon(type: string | undefined): string {
    return type === 'EDIT' ? '✏️' : '🗑️';
  }

  formatActivityDomain(domain: string | undefined): string {
    if (!domain) return '';
    return domain.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  }
}