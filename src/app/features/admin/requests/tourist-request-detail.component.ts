import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
import { TouristRequestService } from '../../../core/services/tourist-request.service';

@Component({
  selector: 'app-tourist-request-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tourist-request-detail.component.html',
  styleUrls: ['tourist-request-detail.component.css']
})
export class TouristRequestDetailComponent implements OnInit {
  request: any = null;
  loading = true;
  error = '';
  imageUrls: Map<string, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private touristRequestService: TouristRequestService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRequest(+id);
    }
  }

  loadRequest(id: number) {
    this.loading = true;
    this.error = '';

    this.touristRequestService.getRequestById(id).subscribe({
      next: (response: any) => {
        this.request = response.request || response;
        this.loading = false;
        console.log('📥 Détails de la demande:', this.request);
      },
      error: (err) => {
        console.error('❌ Erreur chargement détail:', err);
        this.error = 'Impossible de charger les détails de la demande';
        this.loading = false;
      }
    });
  }

  getImageUrl(doc: any): string {
    const docId = `doc-${doc.id}`;
    
    if (this.imageUrls.has(docId)) {
      return this.imageUrls.get(docId)!;
    }

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
      error: (err) => console.error('❌ Erreur chargement image:', err)
    });

    return 'assets/images/loading-image.png';
  }

  downloadFile(doc: any) {
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

  // Utilitaires
  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvée';
      case 'REJECTED': return 'Rejetée';
      default: return status;
    }
  }

  getTypeIcon(type: 'EDIT' | 'DELETE'): string {
    return type === 'EDIT' ? '✏️' : '🗑️';
  }

  getTypeLabel(type: 'EDIT' | 'DELETE'): string {
    return type === 'EDIT' ? 'Modification' : 'Suppression';
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
}