import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StatsService } from '../../../core/services/stats.service';
import { MonthlyRegistrationsChartComponent } from '../monthly-registrations-chart/monthly-registrations-chart.component';
import { RegistrationsChartComponent } from '../registrations-chart/registrations-chart.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-stats-dashboard',
  standalone: true,
  imports: [
    CommonModule,
     RouterModule,
    MonthlyRegistrationsChartComponent,
    RegistrationsChartComponent
  ],
  templateUrl: './stats-dashboard.component.html',
  styleUrls: ['./stats-dashboard.component.scss']
})
export class StatsDashboardComponent implements OnInit, OnDestroy {
  
  summary: any = null;
  regionStats: any[] = [];
  isLoading: boolean = true;
  hasError: boolean = false;

  // Propriétés pour les services par région
  regionServices: any[] = [];
  selectedRegion: any = null;
  showServicesModal: boolean = false;
  servicesLoading: boolean = false;
  servicesError: string = '';

  // Propriétés pour les modales
  showUserDetails: boolean = false;
  selectedUser: any = null;
  showImageModal: boolean = false;
  selectedImage: { url: string; name: string; doc: any } | null = null;
  
  // Propriétés pour l'affichage des services
  activeTab: 'investment' | 'collaboration' | 'tourist' = 'investment';
  selectedService: any = null;
  showDetail: boolean = false;
  
  // Cache pour les URLs d'images
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();
  
  // Cache pour les photos de profil
  photoCache: Map<string, string> = new Map();
  photoLoading: Set<string> = new Set();

  // Couleurs pour les rôles
  roleColors: { [key: string]: string } = {
    'INVESTOR': '#27AE60',
    'TOURIST': '#4A90E2',
    'PARTNER': '#F39C12',
    'LOCAL_PARTNER': '#9B59B6',
    'INTERNATIONAL_COMPANY': '#E74C3C',
    'ADMIN': '#C62828'
  };

  constructor(
    private statsService: StatsService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadRegionStats();
  }

  ngOnDestroy(): void {
    // Nettoyer les URLs blob des images
    this.imageBlobUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
    this.imageBlobUrls.clear();
    
    // Nettoyer les URLs blob des photos de profil
    this.photoCache.forEach(url => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
    this.photoCache.clear();
  }

  loadSummary(): void {
    this.statsService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
      },
      error: (err) => {
        console.error('Error loading summary', err);
      }
    });
  }

  loadRegionStats(): void {
    this.statsService.getRegionStats().subscribe({
      next: (data) => {
        this.regionStats = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading region stats', err);
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  viewRegionServices(regionId: number, regionName: string): void {
    console.log(`📋 Chargement des services pour la région: ${regionName} (ID: ${regionId})`);
    this.selectedRegion = { id: regionId, name: regionName };
    this.showServicesModal = true;
    this.loadAllRegionServices(regionId);
  }

  loadAllRegionServices(regionId: number): void {
    this.servicesLoading = true;
    this.servicesError = '';
    this.regionServices = [];

    const url = `http://localhost:8089/api/public/regions/${regionId}/services`;
    console.log('🌐 Fetching services from:', url);
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const investmentServices = data.investmentServices || [];
        const collaborationServices = data.collaborationServices || [];
        const touristServices = data.touristServices || [];
        
        this.regionServices = [
          ...this.enrichServices(investmentServices, 'INVESTMENT'),
          ...this.enrichServices(collaborationServices, 'COLLABORATION'),
          ...this.enrichServices(touristServices, 'TOURIST')
        ];
        
        this.servicesLoading = false;
      })
      .catch(error => {
        console.error('❌ Error loading services:', error);
        this.servicesError = 'Impossible de charger les services de cette région';
        this.servicesLoading = false;
      });
  }

  enrichServices(services: any[], type: string): any[] {
    if (!services || services.length === 0) return [];
    
    return services.map(service => {
      let status = 'APPROVED';
      if (service.status === 'TAKEN') {
        status = 'TAKEN';
      } else if (service.status === 'RESERVED') {
        status = 'RESERVED';
      }
      
      return {
        ...service,
        type: type,
        status: status,
        owner: {
          id: service.provider?.id,
          firstName: service.provider?.firstName,
          lastName: service.provider?.lastName,
          email: service.provider?.email,
          role: 'LOCAL_PARTNER'
        },
        reservedBy: service.reservedBy || null,
        takenBy: service.takenBy || null,
        isReserved: status === 'RESERVED',
        isTaken: status === 'TAKEN'
      };
    });
  }

  // ========================================
  // MÉTHODES POUR LES STATUTS
  // ========================================

  isServiceReserved(service: any): boolean {
    return service.status === 'RESERVED';
  }

  isServiceTaken(service: any): boolean {
    return service.status === 'TAKEN';
  }

  isServiceAvailable(service: any): boolean {
    return service.status === 'APPROVED';
  }

  getServiceStatusClass(service: any): string {
    if (this.isServiceReserved(service)) return 'status-reserved';
    if (this.isServiceTaken(service)) return 'status-taken';
    return 'status-approved';
  }

  getServiceStatusIcon(service: any): string {
    if (this.isServiceReserved(service)) return '🕒';
    if (this.isServiceTaken(service)) return '🔒';
    return '✅';
  }

  getServiceStatusText(service: any): string {
    if (this.isServiceReserved(service)) return 'RESERVED';
    if (this.isServiceTaken(service)) return 'TAKEN';
    return 'APPROVED';
  }

  // ========================================
  // MÉTHODES POUR L'AFFICHAGE DES SERVICES
  // ========================================

  getCurrentServices(): any[] {
    if (!this.regionServices || this.regionServices.length === 0) return [];
    
    return this.regionServices.filter(service => {
      if (this.activeTab === 'investment') return service.type === 'INVESTMENT';
      if (this.activeTab === 'collaboration') return service.type === 'COLLABORATION';
      return service.type === 'TOURIST';
    });
  }

  getInvestmentCount(): number {
    return this.regionServices.filter(s => s.type === 'INVESTMENT').length;
  }

  getCollaborationCount(): number {
    return this.regionServices.filter(s => s.type === 'COLLABORATION').length;
  }

  getTouristCount(): number {
    return this.regionServices.filter(s => s.type === 'TOURIST').length;
  }

  selectTab(tab: 'investment' | 'collaboration' | 'tourist'): void {
    this.activeTab = tab;
    this.showDetail = false;
    this.selectedService = null;
  }

  viewServiceDetails(service: any): void {
    this.selectedService = service;
    this.showDetail = true;
  }

  backToList(): void {
    this.showDetail = false;
    this.selectedService = null;
  }

  closeServicesModal(): void {
    this.showServicesModal = false;
    this.selectedRegion = null;
    this.regionServices = [];
    this.showDetail = false;
    this.selectedService = null;
    this.activeTab = 'investment';
  }

  getServiceTitle(service: any): string {
    return service.title || service.name || 'Service';
  }

  getServiceType(): string {
    if (this.activeTab === 'investment') return 'Investment Service';
    if (this.activeTab === 'collaboration') return 'Collaboration Service';
    return 'Tourist Service';
  }

  getProviderName(service: any): string {
    if (service.owner) {
      return `${service.owner.firstName || ''} ${service.owner.lastName || ''}`.trim() || 'N/A';
    }
    if (service.provider) {
      if (service.provider.companyName) {
        return service.provider.companyName;
      }
      return `${service.provider.firstName || ''} ${service.provider.lastName || ''}`.trim() || 'N/A';
    }
    return 'N/A';
  }

  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return 'N/A';
    return amount.toLocaleString() + ' TND';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ========================================
  // MÉTHODES POUR LES UTILISATEURS
  // ========================================

  openUserProfile(email: string, role: string): void {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ No token found');
      return;
    }
    
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>(`http://localhost:8089/api/admin/users?email=${email}`, { headers }).subscribe({
      next: (response: any) => {
        console.log('✅ User data from admin endpoint:', response);
        
        let userData = null;
        if (response.users && Array.isArray(response.users)) {
          userData = response.users.find((u: any) => u.email === email);
        } else if (response.user) {
          userData = response.user;
        }
        
        if (userData) {
          let profilePhoto = '';
          if (role === 'LOCAL_PARTNER') {
            profilePhoto = userData.photoProfil || userData.profilePhoto || userData.photo;
          } else if (role === 'INVESTOR') {
            profilePhoto = userData.profilePicture || userData.photo;
          } else {
            profilePhoto = userData.profilePhoto || userData.profilePicture || userData.photo;
          }
          
          this.selectedUser = {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName || userData.firstname || '',
            lastName: userData.lastName || userData.lastname || '',
            phone: userData.phone || userData.telephone || 'Not Provided',
            active: userData.active !== undefined ? userData.active : true,
            registrationDate: userData.registrationDate || userData.dateInscription,
            role: role,
            profilePhoto: profilePhoto,
            profilePicture: profilePhoto,
            company: userData.company,
            originCountry: userData.originCountry,
            activitySector: userData.activitySector,
            nationality: userData.nationality,
            website: userData.website,
            linkedinProfile: userData.linkedinProfile,
            region: userData.region,
            address: userData.address || userData.adresse,
            activityDomain: userData.activityDomain || userData.domaineActivite,
            businessRegistrationNumber: userData.businessRegistrationNumber,
            professionalTaxNumber: userData.professionalTaxNumber,
            countryOfOrigin: userData.countryOfOrigin,
            businessSector: userData.businessSector,
            headquartersAddress: userData.headquartersAddress,
            companyName: userData.companyName,
            siret: userData.siret
          };
          
          this.showUserDetails = true;
        } else {
          this.fetchProfileByRole(email, role, headers);
        }
      },
      error: (err) => {
        console.error('❌ Erreur admin endpoint:', err);
        this.fetchProfileByRole(email, role, headers);
      }
    });
  }

  private fetchProfileByRole(email: string, role: string, headers: HttpHeaders): void {
    let endpoint = '';
    
    switch(role) {
      case 'INVESTOR':
        endpoint = `http://localhost:8089/api/investors/profile?email=${email}`;
        break;
      case 'TOURIST':
        endpoint = `http://localhost:8089/api/tourists/profile?email=${email}`;
        break;
      case 'LOCAL_PARTNER':
        endpoint = `http://localhost:8089/api/partenaires-locaux/profile?email=${email}`;
        break;
      case 'PARTNER':
        endpoint = `http://localhost:8089/api/economic-partners/profile?email=${email}`;
        break;
      case 'INTERNATIONAL_COMPANY':
        endpoint = `http://localhost:8089/api/international-companies/profile?email=${email}`;
        break;
      default:
        endpoint = `http://localhost:8089/api/investors/profile?email=${email}`;
    }
    
    console.log(`📡 Fetching profile from: ${endpoint}`);
    
    this.http.get(endpoint, { headers }).subscribe({
      next: (userData: any) => {
        console.log('✅ Profile loaded:', userData);
        
        let profilePhoto = '';
        if (role === 'LOCAL_PARTNER') {
          profilePhoto = userData.photoProfil || userData.profilePhoto || userData.photo;
        } else if (role === 'INVESTOR') {
          profilePhoto = userData.profilePicture || userData.photo;
        } else {
          profilePhoto = userData.profilePhoto || userData.profilePicture || userData.photo;
        }
        
        this.selectedUser = {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || userData.firstname || '',
          lastName: userData.lastName || userData.lastname || '',
          phone: userData.phone || userData.telephone || 'Not Provided',
          active: userData.active !== undefined ? userData.active : true,
          registrationDate: userData.registrationDate || userData.dateInscription,
          role: role,
          profilePhoto: profilePhoto,
          profilePicture: profilePhoto,
          region: userData.region,
          address: userData.address || userData.adresse,
          activityDomain: userData.activityDomain || userData.domaineActivite,
          website: userData.website,
          linkedinProfile: userData.linkedinProfile
        };
        
        this.showUserDetails = true;
      },
      error: (err) => {
        console.error('❌ Erreur chargement profil:', err);
        this.selectedUser = { 
          email: email, 
          role: role, 
          firstName: '', 
          lastName: '',
          error: 'Impossible de charger les détails du profil',
          phone: 'Not Provided',
          registrationDate: null,
          active: false,
          profilePhoto: ''
        };
        this.showUserDetails = true;
      }
    });
  }

  closeUserDetails(): void {
    this.showUserDetails = false;
    this.selectedUser = null;
  }

  getRoleColor(role: string): string {
    return this.roleColors[role] || '#666';
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'INVESTOR': 'INVESTOR',
      'TOURIST': 'TOURIST',
      'PARTNER': 'PARTNER',
      'LOCAL_PARTNER': 'LOCAL PARTNER',
      'INTERNATIONAL_COMPANY': 'INTERNATIONAL COMPANY',
      'ADMIN': 'ADMIN'
    };
    return labels[role] || role;
  }

  getUserInitials(firstName: string, lastName: string): string {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  // ========================================
  // MÉTHODES POUR LES PHOTOS DE PROFIL
  // ========================================

  getUserProfilePhoto(user: any): string {
    if (!user) return '';
    
    const photoFilename = user.profilePhoto || user.profilePicture || user.photo || '';
    
    if (!photoFilename) return this.getDefaultAvatarSvg();
    
    let fullUrl = '';
    if (photoFilename.startsWith('http')) {
      fullUrl = photoFilename;
    } else {
      fullUrl = `http://localhost:8089/uploads/profile-photos/${photoFilename}`;
    }
    
    const cacheKey = `user-${user.id || user.email}`;
    
    if (this.photoCache.has(cacheKey)) {
      return this.photoCache.get(cacheKey)!;
    }
    
    this.loadUserProfilePhoto(fullUrl, cacheKey);
    return this.getDefaultAvatarSvg();
  }

  private getDefaultAvatarSvg(): string {
    return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%239ca3af\'/%3E%3Ctext x=\'50\' y=\'65\' font-size=\'40\' text-anchor=\'middle\' fill=\'white\'%3E?%3C/text%3E%3C/svg%3E';
  }

  loadUserProfilePhoto(photoUrl: string, cacheKey: string): void {
    if (this.photoLoading.has(cacheKey)) return;
    
    this.photoLoading.add(cacheKey);
    
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get(photoUrl, { headers, responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        this.photoCache.set(cacheKey, url);
        this.photoLoading.delete(cacheKey);
      },
      error: (err) => {
        console.error('❌ Erreur chargement photo:', err);
        this.photoLoading.delete(cacheKey);
      }
    });
  }

  // ========================================
  // MÉTHODES POUR LES DOCUMENTS
  // ========================================

  getImageUrl(doc: any): string {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      return this.imageBlobUrls.get(docId)!;
    } else {
      this.loadImage(doc);
      return 'assets/images/loading-image.png';
    }
  }

  loadImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageLoading.has(docId)) {
      return;
    }
    
    this.imageLoading.add(docId);
    
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
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

  openImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      this.selectedImage = {
        url: this.imageBlobUrls.get(docId)!,
        name: doc.fileName,
        doc: doc
      };
      this.showImageModal = true;
    } else {
      const token = localStorage.getItem('auth_token');
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
          this.showImageModal = true;
        },
        error: (err) => console.error('Erreur chargement image', err)
      });
    }
  }

  closeImage(): void {
    this.selectedImage = null;
    this.showImageModal = false;
  }

  downloadFile(doc: any): void {
    const token = localStorage.getItem('auth_token');
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

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'APPROVED': return 'status-approved';
      case 'RESERVED': return 'status-reserved';
      case 'TAKEN': return 'status-taken';
      default: return 'status-unknown';
    }
  }

  getStatusIcon(status: string): string {
    switch(status) {
      case 'APPROVED': return '✅';
      case 'RESERVED': return '🕒';
      case 'TAKEN': return '🔒';
      default: return '❓';
    }
  }

  getServiceTypeIcon(type: string): string {
    switch(type) {
      case 'INVESTMENT': return '📈';
      case 'COLLABORATION': return '🤝';
      case 'TOURIST': return '🌍';
      default: return '📋';
    }
  }

  getServiceTypeClass(type: string): string {
    switch(type) {
      case 'INVESTMENT': return 'type-investment';
      case 'COLLABORATION': return 'type-collaboration';
      case 'TOURIST': return 'type-tourist';
      default: return 'type-unknown';
    }
  }

  getServiceName(service: any): string {
    return service.name || service.title || 'Sans nom';
  }

  openProviderProfile(service: any): void {
    const providerEmail = service.owner?.email;
    const providerRole = service.owner?.role || 'LOCAL_PARTNER';
    
    if (providerEmail) {
      console.log(`🔍 Opening provider profile: ${providerEmail} (${providerRole})`);
      this.openUserProfile(providerEmail, providerRole);
    } else {
      console.error('❌ No provider email found for service:', service);
    }
  }

  getServicePrice(service: any): string {
    if (service.price) return `${service.price} TND`;
    if (service.totalAmount) return `${service.totalAmount} TND`;
    return 'N/A';
  }
}