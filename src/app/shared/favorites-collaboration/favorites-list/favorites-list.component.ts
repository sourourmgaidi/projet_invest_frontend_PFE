// src/app/shared/favorites-collaboration/favorites-list/favorites-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FavoriteCollaborationService } from '../../../core/services/favorite-collaboration.service';
import { AuthService } from '../../../core/services/auth';
import { Role } from '../../models/user.model';
import { NavbarComponent } from '../../navbar/navbar';

@Component({
  selector: 'app-favorites-collaboration-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './favorites-list.component.html',
  styleUrls: ['./favorites-list.component.css']
})
export class FavoritesCollaborationListComponent implements OnInit {
  favorites: any[] = [];
  loading = true;
  removingIds = new Set<number>();
  userRole: Role | null = null;
  error: string | null = null;

  // Propriétés pour les images
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();

  constructor(
    private favoriteService: FavoriteCollaborationService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUserRole();
    
    // Vérifier que l'utilisateur a le droit d'accéder à cette page
    if (this.userRole !== Role.INTERNATIONAL_COMPANY && this.userRole !== Role.PARTNER) {
      this.router.navigate(['/dashboard']);
      return;
    }
    
    this.loadFavorites();
  }

  // Charger les favoris selon le rôle
  private loadFavorites(): void {
    this.loading = true;
    this.error = null;
    
    if (this.userRole === Role.INTERNATIONAL_COMPANY) {
      this.favoriteService.getCompanyFavorites().subscribe({
        next: (response: any) => {
          this.favorites = response.favorites || [];
          this.loading = false;
          console.log(`✅ ${this.favorites.length} favoris collaboration chargés pour société internationale`);
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement favoris collaboration société:', error);
          this.error = 'Erreur lors du chargement des favoris';
          this.favorites = [];
          this.loading = false;
        }
      });
    } 
    else if (this.userRole === Role.PARTNER) {
      this.favoriteService.getPartnerFavorites().subscribe({
        next: (response: any) => {
          this.favorites = response.favorites || [];
          this.loading = false;
          console.log(`✅ ${this.favorites.length} favoris collaboration chargés pour partenaire économique`);
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement favoris collaboration partenaire:', error);
          this.error = 'Erreur lors du chargement des favoris';
          this.favorites = [];
          this.loading = false;
        }
      });
    }
  }

  // Retour au dashboard selon le rôle
  goToDashboard(): void {
    if (this.userRole === Role.INTERNATIONAL_COMPANY) {
      this.router.navigate(['/societe-international/dashboard']);
    } else if (this.userRole === Role.PARTNER) {
      this.router.navigate(['/partenaire-economique/dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  // Aller à la page des services
  goToServices(): void {
    if (this.userRole === Role.INTERNATIONAL_COMPANY) {
      this.router.navigate(['/societe-international/services']);
    } else if (this.userRole === Role.PARTNER) {
      this.router.navigate(['/partenaire-economique/services']);
    }
  }

  // Supprimer un favori
  removeFavorite(serviceId: number): void {
    this.removingIds.add(serviceId);
    
    if (this.userRole === Role.INTERNATIONAL_COMPANY) {
      this.favoriteService.removeCompanyFavorite(serviceId).subscribe({
        next: () => {
          this.favorites = this.favorites.filter(s => s.id !== serviceId);
          this.removingIds.delete(serviceId);
          console.log(`✅ Service ${serviceId} retiré des favoris`);
        },
        error: (error: any) => {
          console.error('❌ Erreur suppression:', error);
          this.removingIds.delete(serviceId);
        }
      });
    } 
    else if (this.userRole === Role.PARTNER) {
      this.favoriteService.removePartnerFavorite(serviceId).subscribe({
        next: () => {
          this.favorites = this.favorites.filter(s => s.id !== serviceId);
          this.removingIds.delete(serviceId);
          console.log(`✅ Service ${serviceId} retiré des favoris`);
        },
        error: (error: any) => {
          console.error('❌ Erreur suppression:', error);
          this.removingIds.delete(serviceId);
        }
      });
    }
  }

  // Rafraîchir la liste
  refreshFavorites(): void {
    this.loadFavorites();
  }

  // Obtenir le nom du dashboard
  getDashboardName(): string {
    if (this.userRole === Role.INTERNATIONAL_COMPANY) {
      return 'Société Internationale';
    } else if (this.userRole === Role.PARTNER) {
      return 'Partenaire Économique';
    }
    return 'Dashboard';
  }

  // Formater le prix
  formatPrice(price: number): string {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2
    }).format(price);
  }

  // Classe CSS pour le statut
  getStatusClass(status: string): string {
    if (!status) return '';
    return 'status-' + status.toLowerCase();
  }

  // Vérifier si en cours de suppression
  isRemoving(serviceId: number): boolean {
    return this.removingIds.has(serviceId);
  }

  // Formater les enums
  formatEnum(value: string): string {
    if (!value) return '';
    
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Formater les dates
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // ========================================
  // MÉTHODES POUR LES DOCUMENTS
  // ========================================

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
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