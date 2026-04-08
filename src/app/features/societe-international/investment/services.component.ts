import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteService } from '../../../core/services/favorite.service';
// ✅ Chemin correct
import { CurrencyConverterComponent } from '../../public/currency-converter/currency-converter.component';
@Component({
  selector: 'app-investment-services',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    NavbarComponent, 
    NotificationBellComponent ,
    CurrencyConverterComponent 
  ],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class InvestmentServicesComponent implements OnInit, OnDestroy {

  services: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // ✅ Propriétés pour les images
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageUrls: Map<string, string> = new Map();
  maxConcurrentLoads = 5;
  imageQueue: { doc: any; docId: string }[] = [];
  isLoading = false;

  private http = inject(HttpClient);
  private router = inject(Router);
  private favoriteService = inject(FavoriteService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadServices();
  }

  ngOnDestroy(): void {
    // ✅ Nettoyer les URLs blob
    this.imageUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
    this.imageUrls.clear();
  }

  loadServices(): void {
    this.loading = true;
    this.error = null;
    
    this.http.get<any[]>('http://localhost:8089/api/international-companies/services/investment',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.services = data;
        this.filtered = data;
        this.checkFavoritesStatus();
        this.loading = false;
        this.prepareImageLoading();
      },
      error: (err) => {
        console.error('❌ Erreur chargement services investment:', err);
        this.error = 'Impossible de charger les services d\'investissement';
        this.loading = false;
      }
    });
  }

  prepareImageLoading(): void {
    // Collecter toutes les images
    this.services.forEach(service => {
      if (service.images) {
        service.images.forEach((doc: any) => {
          const docId = doc.id.toString();
          if (!this.imageUrls.has(docId)) {
            this.imageQueue.push({ doc, docId });
          }
        });
      }
    });
    
    // Démarrer le chargement
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
      const title = s.title || s.name || '';
      const desc = s.description || '';
      const region = s.region?.name || '';
      const contact = s.contactPerson || '';
      const providerName = s.provider ? `${s.provider.firstName} ${s.provider.lastName}` : '';
      const zone = s.zone || '';
      const sector = s.economicSector?.name || '';
      const amount = s.totalAmount?.toString() || '';
      
      return [title, desc, region, contact, providerName, zone, sector, amount]
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
}