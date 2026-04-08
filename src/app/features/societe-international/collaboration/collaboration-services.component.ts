import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteCollaborationService } from '../../../core/services/favorite-collaboration.service';
import { CurrencyConverterComponent } from '../../../features/public/currency-converter/currency-converter.component';

@Component({
  selector: 'app-collaboration-services',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    NavbarComponent, 
    NotificationBellComponent , CurrencyConverterComponent
  ],
  templateUrl: './collaboration-services.component.html',
  styleUrls: ['./collaboration-services.component.css']
})
export class CollaborationServicesComponent implements OnInit {

  services: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // ✅ Propriétés pour les images (AJOUT)
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();

  private http = inject(HttpClient);
  private router = inject(Router);
  private favoriteService = inject(FavoriteCollaborationService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.error = null;
    
    this.http.get<any[]>('http://localhost:8089/api/international-companies/services/collaboration',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.services = data;
        this.filtered = data;
        this.checkFavoritesStatus();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement services collaboration:', err);
        this.error = 'Impossible de charger les services de collaboration';
        this.loading = false;
      }
    });
  }

  checkFavoritesStatus(): void {
    this.services.forEach(service => {
      this.favoriteService.checkCompanyFavorite(service.id).subscribe({
        next: (res) => {
          service.isFavorite = res.isFavorite;
        },
        error: () => {
          service.isFavorite = false;
        }
      });
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filtered = this.services;
      return;
    }
    
    this.filtered = this.services.filter(s => {
      const name = s.name || '';
      const desc = s.description || '';
      const region = s.region?.name || '';
      const contact = s.contactPerson || '';
      const providerName = s.provider ? `${s.provider.firstName} ${s.provider.lastName}` : '';
      const collabType = s.collaborationType || '';
      const domain = s.activityDomain || '';
      const benefits = s.expectedBenefits || '';
      
      return [name, desc, region, contact, providerName, collabType, domain, benefits]
        .some(val => val.toLowerCase().includes(q));
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filtered = this.services;
  }

  toggleFavorite(service: any): void {
    if (service.favoriteLoading) return;
    
    service.favoriteLoading = true;
    
    if (service.isFavorite) {
      // Retirer des favoris
      this.favoriteService.removeCompanyFavorite(service.id).subscribe({
        next: () => {
          service.isFavorite = false;
          service.favoriteLoading = false;
          this.success = 'Service retiré des favoris';
          setTimeout(() => this.success = null, 3000);
        },
        error: (err) => {
          console.error('❌ Erreur retrait favori:', err);
          this.error = err.error?.error || 'Erreur lors du retrait';
          service.favoriteLoading = false;
          setTimeout(() => this.error = null, 3000);
        }
      });
    } else {
      // Ajouter aux favoris
      this.favoriteService.addCompanyFavorite(service.id).subscribe({
        next: () => {
          service.isFavorite = true;
          service.favoriteLoading = false;
          this.success = 'Service ajouté aux favoris';
          setTimeout(() => this.success = null, 3000);
        },
        error: (err) => {
          console.error('❌ Erreur ajout favori:', err);
          this.error = err.error?.error || 'Erreur lors de l\'ajout';
          service.favoriteLoading = false;
          setTimeout(() => this.error = null, 3000);
        }
      });
    }
  }

  contactProvider(provider: any): void {
    if (!provider?.email) return;
    const name = provider.firstName && provider.lastName
      ? `${provider.firstName} ${provider.lastName}` : 'Local Partner';
    this.router.navigate(['/societe-international/messagerie'], {
      queryParams: { contact: provider.email, name }
    });
  }

  // ========================================
  // ✅ NOUVELLES MÉTHODES POUR LES DOCUMENTS
  // ========================================

  formatEnum(value: string): string {
    if (!value) return '';
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Charger une image avec authentification
   */
  loadImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageLoading.has(docId)) {
      return;
    }
    
    this.imageLoading.add(docId);
    
    const headers = this.getHeaders();
    
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        this.imageBlobUrls.set(docId, url);
        this.imageLoading.delete(docId);
      },
      error: (err) => {
        console.error(`❌ Erreur chargement image ${doc.fileName}:`, err);
        this.imageLoading.delete(docId);
      }
    });
  }

  /**
   * Obtenir l'URL d'une image (avec gestion du chargement)
   */
  getImageUrl(doc: any): string {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      return this.imageBlobUrls.get(docId)!;
    } else {
      this.loadImage(doc);
      return 'assets/images/loading-image.png';
    }
  }

  /**
   * Ouvrir une image en grand
   */
  openImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      this.selectedImage = {
        url: this.imageBlobUrls.get(docId)!,
        name: doc.fileName,
        doc: doc
      };
    } else {
      const headers = this.getHeaders();
      
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

  /**
   * Fermer l'image agrandie
   */
  closeImage(): void {
    this.selectedImage = null;
  }

  /**
   * Télécharger un fichier
   */
  downloadFile(doc: any): void {
    const headers = this.getHeaders();
    
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

  /**
   * Formater la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Nettoyer les URLs blob à la destruction du composant
   */
  ngOnDestroy(): void {
    this.imageBlobUrls.forEach(url => {
      window.URL.revokeObjectURL(url);
    });
    this.imageBlobUrls.clear();
  }
}