import { Component, OnInit ,OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NavbarComponent } from '../../../shared/navbar/navbar';
import { AuthService } from '../../../core/services/auth';
import { LocalPartnerServiceManager } from '../../../core/services/local-partner-service-manager';
import { ServiceRequestService } from '../../../core/services/service-request.service';
import { TouristRequestService } from '../../../core/services/tourist-request.service';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { Router } from '@angular/router';
import { CollaborationRequestService } from '../../../core/services/collaboration-request.service';

type ServiceType = 'COLLABORATION' | 'INVESTMENT' | 'TOURIST';
type ViewMode = 'list' | 'form';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, HttpClientModule, NotificationBellComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit ,OnDestroy {
  searchQuery = '';
  activeTab: ServiceType = 'COLLABORATION';
  viewMode: ViewMode = 'list';
  loading = false;
  saving = false;
  error = '';
  success = '';
  editingService: any = null;

  // Propriétés pour les demandes
  showEditModal = false;
  showDeleteModal = false;
  selectedService: any = null;
  editReason = '';
  editChanges = '';
  deleteReason = '';
  submitting = false;
  deletingRejectedId: number | null = null;
  touristRequests: any[] = []; 
  collaborationServices: any[] = [];
  investmentServices: any[] = [];
  touristServices: any[] = [];
  regions: any[] = [];
  economicSectors: any[] = [];
  partnerId: number | null = null;

  // ✅ NOUVELLE PROPRIÉTÉ AJOUTÉE
  pendingRequestsCount: number = 0;
  pendingAcquisitionCount: number = 0;

  collaborationForm: any = this.emptyCollaborationForm();
  investmentForm: any = this.emptyInvestmentForm();
  touristForm: any = this.emptyTouristForm();

  skillInput = '';
  includedServiceInput = '';
  languageInput = '';

  readonly SERVICE_TYPES: { key: ServiceType; label: string; icon: string; color: string }[] = [
    { key: 'COLLABORATION', label: 'Collaboration', icon: '🤝', color: '#6366f1' },
    { key: 'INVESTMENT',    label: 'Investment',    icon: '📈', color: '#10b981' },
    { key: 'TOURIST',       label: 'Tourism',       icon: '🌍', color: '#f59e0b' }
  ];

  readonly AVAILABILITY_OPTIONS = ['IMMEDIATE', 'ON_DEMAND', 'UPCOMING'];
  readonly COLLAB_TYPES = ['PARTNERSHIP', 'JOINT_VENTURE', 'SUBCONTRACTING', 'FRANCHISE', 'LICENSING', 'OTHER'];
  readonly CATEGORIES = ['HOTEL', 'GUIDE', 'TRANSPORT', 'ACTIVITY', 'EVENT', 'RESTAURANT'];
  readonly TARGET_AUDIENCES = ['BUSINESS', 'TOURIST', 'STUDENT', 'FAMILY', 'VIP'];
  readonly ACTIVITY_DOMAINS = [
  'HOTEL', 'GUEST_HOUSE', 'TRAVEL_AGENCY', 'TOUR_GUIDE', 
  'TRANSPORT', 'RESTAURANT', 'CRAFTS', 'TOURISM',
  'AGRICULTURE', 'AGRI_FOOD', 'INDUSTRY', 'MANUFACTURING', 
  'TEXTILE', 'ENERGY', 'RENEWABLE_ENERGY', 'TECHNOLOGY', 
  'IT', 'REAL_ESTATE', 'CONSTRUCTION', 'TRADE', 'SERVICES',
  'OTHER'
];

  constructor(
    private authService: AuthService,
    private serviceManager: LocalPartnerServiceManager,
    private http: HttpClient,
    private requestService: ServiceRequestService,
    private collaborationRequestService: CollaborationRequestService,
    private touristRequestService: TouristRequestService, 
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPartnerIdAndData();
    this.loadRegions();
    this.loadEconomicSectors();
  }

  private decodeJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(json);
    } catch { return null; }
  }

  async loadPartnerIdAndData() {
    this.loading = true;
    this.error = '';

    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Not authenticated. Please log in again.';
      this.loading = false;
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    try {
      const profile: any = await lastValueFrom(
        this.http.get<any>('http://localhost:8089/api/partenaires-locaux/profile', { headers })
      );
      console.log('✅ Profile response:', profile);

      if (profile?.id) {
        this.partnerId = Number(profile.id);
        console.log('✅ partnerId set to:', this.partnerId);
        await this.loadAllServices();
      } else {
        console.warn('⚠️ Profile returned no id, trying fallback...');
        await this.fallbackFindPartner(headers, token);
      }
    } catch (e: any) {
      console.warn('⚠️ Profile call failed:', e?.status, e?.message);
      await this.fallbackFindPartner(headers, token);
    } finally {
      this.loading = false;
    }
  }

  private async fallbackFindPartner(headers: HttpHeaders, token: string) {
    try {
      const jwtPayload = this.decodeJwt(token);
      const email = jwtPayload?.email || jwtPayload?.preferred_username || '';
      console.log('🔍 Fallback: looking for email', email);

      const partners: any[] = await lastValueFrom(
        this.http.get<any[]>('http://localhost:8089/api/partenaires-locaux', { headers })
      );
      console.log('📋 All partners:', partners.map((p: any) => ({ id: p.id, email: p.email })));

      const match = partners.find((p: any) =>
        p.email?.toLowerCase() === email?.toLowerCase()
      );

      if (match?.id) {
        this.partnerId = Number(match.id);
        console.log('✅ Partner found via fallback, id:', this.partnerId);
        await this.loadAllServices();
      } else {
        this.error = 'Partner account not found. Please contact support.';
      }
    } catch (e) {
      console.error('❌ Fallback also failed:', e);
      this.error = 'Failed to load partner data. Please refresh.';
    }
  }
 async loadPendingAcquisitionCount() {
    try {
      const token = this.authService.getToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const requests = await lastValueFrom(
        this.http.get<any[]>('http://localhost:8089/api/acquisitions/partner/pending', { headers })
      );
      
      this.pendingAcquisitionCount = requests.length;
      console.log('📊 Pending acquisition requests:', this.pendingAcquisitionCount);
    } catch (error) {
      console.error('❌ Error loading acquisition requests:', error);
      this.pendingAcquisitionCount = 0;
    }
  }
  async loadAllServices() {
    if (!this.partnerId) {
      console.warn('⚠️ loadAllServices called with no partnerId!');
      return;
    }
    console.log('📡 Fetching services for partnerId:', this.partnerId);

    const [collabs, investments, tourists] = await Promise.allSettled([
      lastValueFrom(this.serviceManager.getCollaborationServicesByProvider(this.partnerId!)),
      lastValueFrom(this.serviceManager.getInvestmentServicesByProvider(this.partnerId!)),
      lastValueFrom(this.serviceManager.getTouristServicesByProvider(this.partnerId!))
    ]);

    if (collabs.status === 'fulfilled') {
      this.collaborationServices = Array.isArray(collabs.value) ? collabs.value : [];
    } else {
      console.warn('⚠️ Collaboration services failed:', (collabs as any).reason);
      this.collaborationServices = [];
    }

    if (investments.status === 'fulfilled') {
      this.investmentServices = Array.isArray(investments.value) ? investments.value : [];
    } else {
      console.warn('⚠️ Investment services failed:', (investments as any).reason);
      this.investmentServices = [];
    }

    if (tourists.status === 'fulfilled') {
      this.touristServices = Array.isArray(tourists.value) ? tourists.value : [];
      console.log('🔍 PREMIER SERVICE TOURISTIQUE:', JSON.stringify(this.touristServices[0], null, 2));
      console.log('🔍 includedServices:', this.touristServices[0]?.includedServices);
      console.log('🔍 availableLanguages:', this.touristServices[0]?.availableLanguages);
      console.log('TOURIST DATA:', JSON.stringify(this.touristServices[0], null, 2));
    } else {
      console.warn('⚠️ Tourist services failed:', (tourists as any).reason);
      this.touristServices = [];
    }

    await Promise.all([
      this.checkPendingRequests(),              // Pour l'investissement
      this.checkCollaborationPendingRequests(), // Pour la collaboration
      this.loadTouristRequests() ,
       this.loadPendingAcquisitionCount()                // Pour le tourisme
    ]);

    // ✅ NOUVEL APPEL AJOUTÉ
    this.loadPendingRequestsCount();

    console.log('✅ Services loaded:', {
      collaboration: this.collaborationServices.length,
      investment: this.investmentServices.length,
      tourist: this.touristServices.length
    });
  }

  // ✅ NOUVELLE MÉTHODE AJOUTÉE
  loadPendingRequestsCount() {
    // Réinitialiser le compteur
    this.pendingRequestsCount = 0;
    
    // Compter les demandes en attente pour chaque type de service
    if (this.collaborationServices) {
      const collabPending = this.collaborationServices.filter(s => s.hasPendingRequest).length;
      this.pendingRequestsCount += collabPending;
    }
    
    if (this.investmentServices) {
      const investPending = this.investmentServices.filter(s => s.hasPendingRequest).length;
      this.pendingRequestsCount += investPending;
    }
    
    if (this.touristServices) {
      const touristPending = this.touristServices.filter(s => s.hasPendingRequest).length;
      this.pendingRequestsCount += touristPending;
    }
    
    console.log('📊 Total pending requests:', this.pendingRequestsCount);
  }

  async checkPendingRequests() {
    try {
      const response = await lastValueFrom(this.requestService.getMyRequests());
      
      const pendingRequests = response.requests.filter(r => r.status === 'PENDING');
      const approvedRequests = response.requests.filter(r => r.status === 'APPROVED');
      
      console.log('📊 Requests status:', {
        pending: pendingRequests.length,
        approved: approvedRequests.length
      });
      
      // Mettre à jour les services d'investissement
      this.investmentServices = this.investmentServices.map(service => {
        const pendingRequest = pendingRequests.find(r => r.service?.id === service.id);
        const approvedRequest = approvedRequests.find(r => r.service?.id === service.id);
        
        let updatedStatus = service.status;
        let deleteAuthorized = service.deleteAuthorized || false;
        let editAuthorized = service.editAuthorized || false;
        
        // Si une demande de modification est approuvée
        if (approvedRequest && approvedRequest.requestType === 'EDIT') {
          updatedStatus = 'PENDING'; // Ou un statut spécial
          editAuthorized = true;
        }
        
        // Si une demande de suppression est approuvée
        if (approvedRequest && approvedRequest.requestType === 'DELETE') {
          deleteAuthorized = true;
          // Le service reste APPROVED mais avec deleteAuthorized = true
        }
        
        return {
          ...service,
          hasPendingRequest: !!pendingRequest,
          requestId: pendingRequest?.id || null,
          status: updatedStatus,
          deleteAuthorized: deleteAuthorized,
          editAuthorized: editAuthorized
        };
      });
      
      console.log('✅ Investment services updated with request statuses');
      
    } catch (error) {
      console.error('❌ Error checking pending requests:', error);
    }
  }

  loadRegions() {
    this.serviceManager.getRegions().subscribe({
      next: (data) => { this.regions = data || []; },
      error: (e) => console.error('Regions error:', e)
    });
  }

  loadEconomicSectors() {
    this.serviceManager.getEconomicSectors().subscribe({
      next: (data) => { this.economicSectors = data || []; },
      error: (e) => console.error('Sectors error:', e)
    });
  }

  setTab(tab: ServiceType) { this.activeTab = tab; this.cancelForm(); }

  get activeServices(): any[] {
    let services: any[] = [];
    if (this.activeTab === 'COLLABORATION') services = this.collaborationServices;
    else if (this.activeTab === 'INVESTMENT') services = this.investmentServices;
    else services = this.touristServices;

    if (!this.searchQuery.trim()) return services;

    const words = this.searchQuery
      .toLowerCase()
      .trim()
      .replace(/[\s,]+/g, ' ')
      .split(' ')
      .filter(w => w.length >= 1);

    return services.filter(s => words.every(word => this.matchesSearch(s, word)));
  }

  private matchesSearch(obj: any, query: string, depth: number = 0): boolean {
    if (depth > 2) return false;
    if (obj === null || obj === undefined) return false;
    if (typeof obj === 'string') return obj.toLowerCase().includes(query);
    if (typeof obj === 'number') return String(obj).includes(query);
    if (typeof obj === 'boolean') return false;
    if (Array.isArray(obj)) {
      return obj.some(item => this.matchesSearch(item, query, depth + 1));
    }
    if (typeof obj === 'object') {
      const ignored = ['id', 'createdAt', 'publicationDate', 'providerId',
                       'regionId', 'economicSectorId', 'provider',
                       'collaborationServices', 'investmentServices', 'touristServices',
                       'interestedInvestors', 'attachedDocuments'];
      return Object.entries(obj).some(([key, val]) => {
        if (ignored.includes(key)) return false;
        return this.matchesSearch(val, query, depth + 1);
      });
    }
    return false;
  }

  get activeTabConfig() {
    return this.SERVICE_TYPES.find(t => t.key === this.activeTab)!;
  }

  showAddForm() {
    this.editingService = null;
    this.resetForms();
    this.viewMode = 'form';
    this.error = '';
    this.success = '';
      this.selectedFiles = [];
  this.filePreviews = [];
  this.existingDocuments.forEach(doc => {
  if (doc.url.startsWith('blob:')) {
    window.URL.revokeObjectURL(doc.url);
  }
});
this.existingDocuments = [];
  }

  editService(service: any) {
      this.selectedFiles = [];
      this.filePreviews = [];
      this.imagesToDelete = [];
  
    this.editingService = service;
    if (this.activeTab === 'COLLABORATION') {
      this.collaborationForm = {
        name: service.name || '', description: service.description || '',
        regionId: service.region?.id || '',  requestedBudget: service.requestedBudget || 0,
        availability: service.availability || 'IMMEDIATE',
        contactPerson: service.contactPerson || '',
        collaborationType: service.collaborationType || '',
        activityDomain: service.activityDomain || '',
        expectedBenefits: service.expectedBenefits || '',
        requiredSkills: [...(service.requiredSkills || [])],
        collaborationDuration: service.collaborationDuration || '',
        address: service.address || ''
      };
       this.loadExistingDocuments(service);
    } else if (this.activeTab === 'INVESTMENT') {
      this.investmentForm = {
        name: service.name || '', 
        title: service.title || '',
        description: service.description || '',
        regionId: service.region?.id || '',
        availability: service.availability || 'IMMEDIATE',
        contactPerson: service.contactPerson || '',
        zone: service.zone || '',
        economicSectorId: service.economicSector?.id || '',
        totalAmount: service.totalAmount || 0,
        minimumAmount: service.minimumAmount || 0,
        deadlineDate: service.deadlineDate || '',
        projectDuration: service.projectDuration || ''
      };
       this.loadExistingDocuments(service);
    } else {
      this.touristForm = {
        name: service.name || '', description: service.description || '',
        regionId: service.region?.id || '', price: service.price || 0,
        groupPrice: service.groupPrice || 0,
        availability: service.availability || 'IMMEDIATE',
        contactPerson: service.contactPerson || '',
        category: service.category || '',
        targetAudience: service.targetAudience || '',
        durationHours: service.durationHours || 0,
        maxCapacity: service.maxCapacity || 0,
        includedServices: [...(service.includedServices || [])],
        availableLanguages: [...(service.availableLanguages || [])]
      };
       this.loadTouristExistingDocuments(service);
    }
    this.viewMode = 'form';
    this.error = '';
    this.success = '';
  }

  cancelForm() {
    this.viewMode = 'list';
    this.editingService = null;
    this.resetForms();
    this.error = '';
    this.success = '';
     this.selectedFiles = [];
  this.filePreviews = [];
    this.existingDocuments.forEach(doc => {
  if (doc.url.startsWith('blob:')) {
    window.URL.revokeObjectURL(doc.url);
  }
});
this.existingDocuments = [];

  }

  resetForms() {
    this.collaborationForm = this.emptyCollaborationForm();
    this.investmentForm    = this.emptyInvestmentForm();
    this.touristForm       = this.emptyTouristForm();
    this.skillInput = '';
    this.includedServiceInput = '';
    this.languageInput = '';
  }

  addSkill() {
    const s = this.skillInput.trim();
    if (s && !this.collaborationForm.requiredSkills.includes(s)) this.collaborationForm.requiredSkills.push(s);
    this.skillInput = '';
  }
  removeSkill(skill: string) {
    this.collaborationForm.requiredSkills = this.collaborationForm.requiredSkills.filter((s: string) => s !== skill);
  }
  addIncludedService() {
    const s = this.includedServiceInput.trim();
    if (s && !this.touristForm.includedServices.includes(s)) this.touristForm.includedServices.push(s);
    this.includedServiceInput = '';
  }
  removeIncludedService(svc: string) {
    this.touristForm.includedServices = this.touristForm.includedServices.filter((s: string) => s !== svc);
  }
  addLanguage() {
    const lang = this.languageInput.trim();
    if (lang && !this.touristForm.availableLanguages.includes(lang)) this.touristForm.availableLanguages.push(lang);
    this.languageInput = '';
  }
  removeLanguage(lang: string) {
    this.touristForm.availableLanguages = this.touristForm.availableLanguages.filter((l: string) => l !== lang);
  }

  async submitForm() {
    if (!this.partnerId) { this.error = 'Partner ID not loaded. Please refresh the page.'; return; }
    this.saving = true;
    this.error = '';
    this.success = '';

    try {
      const isEdit = !!this.editingService;

      if (this.activeTab === 'COLLABORATION') {
      const payload = {
        ...this.collaborationForm,
        region: this.collaborationForm.regionId ? { id: +this.collaborationForm.regionId } : null
      };
      delete payload.regionId;
      
      if (isEdit) {
        // ✅ Édition - UN SEUL APPEL avec ou sans fichiers
        console.log('📤 Mise à jour collaboration ID:', this.editingService.id);
        console.log('📤 Payload:', payload);
        console.log('📤 Fichiers:', this.selectedFiles?.length || 0);
        
        // Appel unique - le service gère FormData dans tous les cas
        await lastValueFrom(this.serviceManager.updateCollaborationService(
          this.editingService.id, 
          payload, 
          this.selectedFiles  // ← Peut être vide, c'est OK
        ));
        
        // ✅ Supprimer les documents marqués (après le succès)
        if (this.imagesToDelete.length > 0) {
          console.log('🗑️ Suppression des documents:', this.imagesToDelete);
          
          const token = this.authService.getToken();
          const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
          
          const deletePromises = this.imagesToDelete.map(docId => 
            lastValueFrom(this.http.delete(`http://localhost:8089/api/collaboration-services/documents/${docId}`, { headers }))
              .catch(err => console.error(`❌ Erreur suppression document ${docId}:`, err))
          );
          
          await Promise.all(deletePromises);
          console.log('✅ Tous les documents marqués ont été supprimés');
        }
        
      } else {
        // ✅ Création - UN SEUL APPEL avec ou sans fichiers
        console.log('📤 Création collaboration');
        console.log('📤 Payload:', payload);
        console.log('📤 Fichiers:', this.selectedFiles?.length || 0);
        
        await lastValueFrom(this.serviceManager.createCollaborationService(
          payload, 
          this.selectedFiles  // ← Peut être vide
        ));
      }
    } else if (this.activeTab === 'INVESTMENT') {
  const payload = {
    ...this.investmentForm,
    region: this.investmentForm.regionId ? { id: +this.investmentForm.regionId } : null,
    economicSector: this.investmentForm.economicSectorId ? { id: +this.investmentForm.economicSectorId } : null
  };
  delete payload.regionId;
  delete payload.economicSectorId;
  
  // Afficher ce qu'on envoie pour déboguer
  console.log('📤 Édition service ID:', this.editingService?.id);
  console.log('📤 Payload:', payload);
  console.log('📤 Fichiers à ajouter:', this.selectedFiles.length);
  console.log('📤 Images à supprimer:', this.imagesToDelete);
  
  if (isEdit) {
    // ✅ 1. D'abord supprimer les images marquées (optionnel - à faire avant ou après ?)
    // Idéalement, le backend devrait gérer ça en une seule requête, mais pour l'instant :
    
    // Édition avec nouveaux fichiers
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      await lastValueFrom(this.serviceManager.updateInvestmentService(
        this.editingService.id, 
        payload, 
        this.selectedFiles
      ));
    } else {
      // Édition sans nouveaux fichiers
      await lastValueFrom(this.serviceManager.updateInvestmentService(
        this.editingService.id, 
        payload
      ));
    }
    
    // ✅ 2. Ensuite supprimer les images (si la mise à jour a réussi)
    if (this.imagesToDelete.length > 0) {
      console.log('🗑️ Suppression des images:', this.imagesToDelete);
      
      const token = this.authService.getToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      // Utiliser Promise.all pour les supprimer en parallèle (plus rapide)
      const deletePromises = this.imagesToDelete.map(imageId => 
        lastValueFrom(this.http.delete(`http://localhost:8089/api/investment-services/documents/${imageId}`, { headers }))
          .catch(err => console.error(`❌ Erreur suppression image ${imageId}:`, err))
      );
      
      await Promise.all(deletePromises);
      console.log('✅ Toutes les images marquées ont été supprimées');
    }
    
  } else {
    // Création
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      await lastValueFrom(this.serviceManager.createInvestmentService(
        payload, 
        this.selectedFiles
      ));
    } else {
      await lastValueFrom(this.serviceManager.createInvestmentService(payload));
    }
  }
} else {
  console.log('🔍 partnerId avant création:', this.partnerId);
  console.log('🔍 TOURIST FORM COMPLET:', JSON.stringify(this.touristForm, null, 2));
  console.log('🔍 Fichiers sélectionnés:', this.selectedFiles?.length || 0);
  
  const payload = {
    ...this.touristForm,
    region: this.touristForm.regionId ? { id: +this.touristForm.regionId } : null,
  };
  delete payload.regionId;
  console.log('📦 Payload touristique complet:', JSON.stringify(payload, null, 2));
  
  if (isEdit) {
    // ✅ Édition avec ou sans fichiers
    console.log('📤 Mise à jour service touristique ID:', this.editingService.id);
    console.log('📤 Fichiers à ajouter:', this.selectedFiles?.length || 0);
    
    await lastValueFrom(this.serviceManager.updateTouristService(
      this.editingService.id, 
      payload, 
      this.selectedFiles  // ← Peut être vide, c'est OK
    ));
    
    // ✅ Supprimer les documents marqués (après le succès)
    if (this.imagesToDelete.length > 0) {
      console.log('🗑️ Suppression des documents touristiques:', this.imagesToDelete);
      
      const token = this.authService.getToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const deletePromises = this.imagesToDelete.map(docId => 
        lastValueFrom(this.http.delete(`http://localhost:8089/api/tourist-services/documents/${docId}`, { headers }))
          .catch(err => console.error(`❌ Erreur suppression document ${docId}:`, err))
      );
      
      await Promise.all(deletePromises);
      console.log('✅ Tous les documents touristiques marqués ont été supprimés');
    }
    
  } else {
    // ✅ Création avec ou sans fichiers
    console.log('📤 Création service touristique');
    console.log('📤 Fichiers à ajouter:', this.selectedFiles?.length || 0);
    
    await lastValueFrom(this.serviceManager.createTouristService(
      payload, 
      this.selectedFiles  // ← Peut être vide, c'est OK
    ));
  }
}
    this.selectedFiles = [];
    this.filePreviews = [];
    this.imagesToDelete = [];
    this.existingDocuments = [];
      this.viewMode = 'list';
      this.editingService = null;
      this.resetForms();
      await this.loadAllServices();
      this.success = isEdit ? 'Service updated successfully!' : '✅ Service created! Awaiting admin approval.';
      setTimeout(() => { this.success = ''; }, 4000);

    } catch (e: any) {
      console.error('❌ Submit error:', e);
      this.error = e?.error?.error || e?.error?.message || e?.message || 'An error occurred.';
    } finally {
      this.saving = false;
    }
  }

  async deleteService(service: any) {
    if (!confirm(`Delete "${service.name}"?`)) return;
    try {
      if (this.activeTab === 'COLLABORATION') {
        await lastValueFrom(this.serviceManager.deleteCollaborationService(service.id));
        this.collaborationServices = this.collaborationServices.filter(s => s.id !== service.id);
      } else if (this.activeTab === 'INVESTMENT') {
        await lastValueFrom(this.serviceManager.deleteInvestmentService(service.id));
        this.investmentServices = this.investmentServices.filter(s => s.id !== service.id);
      } else {
        await lastValueFrom(this.serviceManager.deleteTouristService(service.id));
        this.touristServices = this.touristServices.filter(s => s.id !== service.id);
      }
    } catch (e: any) {
      this.error = e?.error?.error || 'Failed to delete service';
    }
  }

  viewRequest(requestId: number) {
    this.router.navigate(['/partenaire-local/requests', requestId]);
  }

  openEditRequestDialog(service: any) {
    this.selectedService = service;
    this.editReason = '';
    this.editChanges = '';
    this.showEditModal = true;
  }

  openDeleteRequestDialog(service: any) {
    this.selectedService = service;
    this.deleteReason = '';
    this.showDeleteModal = true;
  }

  closeModals() {
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedService = null;
    this.editReason = '';
    this.editChanges = '';
    this.deleteReason = '';
    this.submitting = false;
  }

  submitEditRequest() {
    if (!this.selectedService || !this.editReason.trim() || !this.editChanges.trim()) return;
    
    this.submitting = true;
    
    // Choisir le bon service selon l'onglet
    if (this.activeTab === 'TOURIST') {
      this.submitTouristEditRequest();
    } else {
      const requestService = this.activeTab === 'COLLABORATION' 
        ? this.collaborationRequestService 
        : this.requestService;
      
      requestService.requestEdit(
        this.selectedService.id, 
        this.editReason, 
        this.editChanges
      ).subscribe({
        next: (response) => {
          console.log('✅ Edit request sent', response);
          this.success = 'Modification request sent to admin';
          this.closeModals();
          this.submitting = false;
          this.loadAllServices();
          setTimeout(() => this.success = '', 4000);
        },
        error: (error) => {
          console.error('❌ Error sending request:', error);
          this.error = error.error?.error || 'Error sending modification request';
          this.submitting = false;
          setTimeout(() => this.error = '', 4000);
        }
      });
    }
  }

  submitDeleteRequest() {
    if (!this.selectedService || !this.deleteReason.trim()) return;
    
    this.submitting = true;
    
    // Choisir le bon service selon l'onglet
    if (this.activeTab === 'TOURIST') {
      this.submitTouristDeleteRequest();
    } else {
      const requestService = this.activeTab === 'COLLABORATION' 
        ? this.collaborationRequestService 
        : this.requestService;
      
      requestService.requestDelete(
        this.selectedService.id, 
        this.deleteReason
      ).subscribe({
        next: (response) => {
          console.log('✅ Delete request sent', response);
          this.success = 'Deletion request sent to admin';
          this.closeModals();
          this.submitting = false;
          this.loadAllServices();
          setTimeout(() => this.success = '', 4000);
        },
        error: (error) => {
          console.error('❌ Error sending request:', error);
          this.error = error.error?.error || 'Error sending deletion request';
          this.submitting = false;
          setTimeout(() => this.error = '', 4000);
        }
      });
    }
  }

  async deleteRejectedService(service: any) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le service rejeté "${service.name}" ?`)) {
      return;
    }

    this.deletingRejectedId = service.id;
    this.error = '';
    this.success = '';

    try {
      if (this.activeTab === 'COLLABORATION') {
        await lastValueFrom(this.serviceManager.deleteCollaborationService(service.id));
        this.collaborationServices = this.collaborationServices.filter(s => s.id !== service.id);
      } else if (this.activeTab === 'INVESTMENT') {
        // Utiliser le nouvel endpoint pour les services rejetés
        const token = this.authService.getToken();
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        
        await lastValueFrom(
          this.http.delete(`http://localhost:8089/api/investment-services/rejected/${service.id}`, { headers })
        );
        this.investmentServices = this.investmentServices.filter(s => s.id !== service.id);
      } else {
        await lastValueFrom(this.serviceManager.deleteTouristService(service.id));
        this.touristServices = this.touristServices.filter(s => s.id !== service.id);
      }

      this.success = 'Service rejeté supprimé avec succès.';
      setTimeout(() => this.success = '', 4000);
    } catch (e: any) {
      console.error('❌ Erreur suppression service rejeté:', e);
      this.error = e?.error?.error || e?.error?.message || 'Erreur lors de la suppression du service rejeté';
    } finally {
      this.deletingRejectedId = null;
    }
  }

  getStatusClass(s: string) { return s === 'APPROVED' ? 'badge-approved' : s === 'REJECTED' ? 'badge-rejected' : 'badge-pending'; }
  getStatusIcon(s: string)  { return s === 'APPROVED' ? '✅' : s === 'REJECTED' ? '❌' : '⏳'; }

  private emptyCollaborationForm() {
    return { 
      name: '', 
      description: '', 
      regionId: '', 
      requestedBudget: 0,
      availability: 'IMMEDIATE', 
      contactPerson: '', 
      collaborationType: '', 
      activityDomain: '', 
      expectedBenefits: '', 
      requiredSkills: [], 
      collaborationDuration: '', 
      address: '' 
    };
  }
  
  private emptyInvestmentForm() {
    return { 
      name: '', 
      title: '', 
      description: '', 
      regionId: '', 
      availability: 'IMMEDIATE', 
      contactPerson: '', 
      zone: '', 
      economicSectorId: '', 
      totalAmount: 0, 
      minimumAmount: 0, 
      deadlineDate: '', 
      projectDuration: '' 
    };
  }
  
  private emptyTouristForm() {
    return { 
      name: '', 
      description: '', 
      regionId: '', 
      price: 0, 
      groupPrice: 0, 
      availability: 'IMMEDIATE', 
      contactPerson: '', 
      category: '', 
      targetAudience: '', 
      durationHours: 0, 
      maxCapacity: 0, 
      includedServices: [], 
      availableLanguages: [] 
    };
  }

  // ================ MÉTHODES POUR LES DEMANDES TOURISTIQUES ================

  /**
   * Charger les demandes touristiques du partenaire connecté
   */
async loadTouristRequests() {
  try {
    const response = await lastValueFrom(this.touristRequestService.getMyRequests());
    
    // ✅ Vérifier la structure de la réponse
    console.log('📥 Réponse brute tourist requests:', response);
    
    // Adapter selon la structure (response.requests ou response directement)
    const requests = response.requests || response || [];
    
    const pendingRequests = requests.filter((r: any) => r.status === 'PENDING');
    const approvedRequests = requests.filter((r: any) => r.status === 'APPROVED');
    
    console.log('📊 Tourist requests status:', {
      pending: pendingRequests.length,
      approved: approvedRequests.length,
      all: requests.length
    });
    
    // ✅ METTRE À JOUR les services touristiques
    this.touristServices = this.touristServices.map(service => {
      const pendingRequest = pendingRequests.find((r: any) => r.service?.id === service.id);
      const approvedRequest = approvedRequests.find((r: any) => r.service?.id === service.id);
      
      let deleteAuthorized = service.deleteAuthorized || false;
      let editAuthorized = service.editAuthorized || false;
      
      if (approvedRequest && approvedRequest.requestType === 'EDIT') {
        editAuthorized = true;
      }
      
      if (approvedRequest && approvedRequest.requestType === 'DELETE') {
        deleteAuthorized = true;
      }
      
      // ✅ Ajouter hasPendingRequest et requestId
      const updatedService = {
        ...service,
        hasPendingRequest: !!pendingRequest,
        requestId: pendingRequest?.id || null,
        deleteAuthorized: deleteAuthorized,
        editAuthorized: editAuthorized
      };
      
      // Log pour vérifier
      if (service.id === 31) {
        console.log('🔍 Service 31 mis à jour:', updatedService);
      }
      
      return updatedService;
    });
    
    console.log('✅ Tourist services updated with request statuses');
    this.touristRequests = requests;
    
  } catch (error) {
    console.error('❌ Error checking tourist pending requests:', error);
  }
}

  /**
   * Soumettre une demande de modification pour un service touristique
   */
  submitTouristEditRequest() {
    if (!this.selectedService || !this.editReason.trim() || !this.editChanges.trim()) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }
    
    this.submitting = true;
    
    this.touristRequestService.requestEdit(
      this.selectedService.id,
      this.editReason,
      this.editChanges
    ).subscribe({
      next: (response) => {
        console.log('✅ Touriste edit request sent', response);
        this.success = 'Demande de modification envoyée à l\'admin';
        this.closeModals();
        this.submitting = false;
        this.loadAllServices(); // Recharger pour mettre à jour les statuts
        setTimeout(() => this.success = '', 4000);
      },
      error: (error) => {
        console.error('❌ Error sending tourist edit request:', error);
        this.error = error.error?.error || error.message || 'Erreur lors de l\'envoi de la demande';
        this.submitting = false;
        setTimeout(() => this.error = '', 4000);
      }
    });
  }

  /**
   * Soumettre une demande de suppression pour un service touristique
   */
  submitTouristDeleteRequest() {
    if (!this.selectedService || !this.deleteReason.trim()) {
      this.error = 'Veuillez fournir une raison';
      return;
    }
    
    this.submitting = true;
    
    this.touristRequestService.requestDelete(
      this.selectedService.id,
      this.deleteReason
    ).subscribe({
      next: (response) => {
        console.log('✅ Touriste delete request sent', response);
        this.success = 'Demande de suppression envoyée à l\'admin';
        this.closeModals();
        this.submitting = false;
        this.loadAllServices(); // Recharger pour mettre à jour les statuts
        setTimeout(() => this.success = '', 4000);
      },
      error: (error) => {
        console.error('❌ Error sending tourist delete request:', error);
        this.error = error.error?.error || error.message || 'Erreur lors de l\'envoi de la demande';
        this.submitting = false;
        setTimeout(() => this.error = '', 4000);
      }
    });
  }

  async checkCollaborationPendingRequests() {
    try {
      const response = await lastValueFrom(this.collaborationRequestService.getMyRequests());
      
      const pendingRequests = response.requests.filter(r => r.status === 'PENDING');
      const approvedRequests = response.requests.filter(r => r.status === 'APPROVED');
      
      console.log('📊 Collaboration requests status:', {
        pending: pendingRequests.length,
        approved: approvedRequests.length
      });
      
      this.collaborationServices = this.collaborationServices.map(service => {
        const pendingRequest = pendingRequests.find(r => r.service?.id === service.id);
        const approvedRequest = approvedRequests.find(r => r.service?.id === service.id);
        
        let deleteAuthorized = service.deleteAuthorized || false;
        let editAuthorized = service.editAuthorized || false;
        
        if (approvedRequest && approvedRequest.requestType === 'EDIT') {
          editAuthorized = true;
        }
        
        if (approvedRequest && approvedRequest.requestType === 'DELETE') {
          deleteAuthorized = true;
        }
        
        return {
          ...service,
          hasPendingRequest: !!pendingRequest,
          requestId: pendingRequest?.id || null,
          deleteAuthorized: deleteAuthorized,
          editAuthorized: editAuthorized
        };
      });
      
      console.log('✅ Collaboration services updated with request statuses');
      
    } catch (error) {
      console.error('❌ Error checking collaboration pending requests:', error);
    }
  }

  formatEnum(value: string): string {
    if (!value) return '';
    
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Vérifie si une date est expirée
   * Accepte Date | string | null | undefined
   */
  isExpired(dateValue: Date | string | null | undefined): boolean {
    if (!dateValue) return false;
    
    // Convertir en Date si c'est une string
    const expiryDate = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    const now = new Date();
    
    return expiryDate < now;
  }

  /**
   * Calcule la deadline de suppression (3 jours après la date d'approbation)
   * Retourne une Date ou null
   */
  getDeleteDeadline(approvalDate: string | null | undefined): Date | null {
    if (!approvalDate) return null;
    const date = new Date(approvalDate);
    date.setDate(date.getDate() + 3); // +3 jours
    return date;
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(dateValue: Date | string | null | undefined): string {
    if (!dateValue) return '';
    
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatShortDate(dateValue: Date | string | null | undefined): string {
    if (!dateValue) return '';
    
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getDeleteDeadlineFromEdit(editAuthorizedUntil: string | Date | null | undefined): Date | null {
    if (!editAuthorizedUntil) return null;
    
    const editDeadline = new Date(editAuthorizedUntil);
    // Soustraire 7 jours pour obtenir la date d'approbation estimée
    const estimatedApproval = new Date(editDeadline);
    estimatedApproval.setDate(estimatedApproval.getDate() - 7);
    // Ajouter 3 jours pour la deadline de suppression
    const deleteDeadline = new Date(estimatedApproval);
    deleteDeadline.setDate(deleteDeadline.getDate() + 3);
    
    return deleteDeadline;
  }

  /**
   * Calcule une deadline de suppression fixe (par exemple +3 jours à partir d'aujourd'hui)
   * Ou utilise la logique existante avec fallback
   */
  getDeleteDeadlineFixed(service: any): Date | null {
    if (!service.deleteAuthorized) return null;
    
    // Si on a editAuthorizedUntil, l'utiliser pour calculer
    if (service.editAuthorizedUntil) {
      const editDeadline = new Date(service.editAuthorizedUntil);
      const estimatedApproval = new Date(editDeadline);
      estimatedApproval.setDate(estimatedApproval.getDate() - 7);
      const deleteDeadline = new Date(estimatedApproval);
      deleteDeadline.setDate(deleteDeadline.getDate() + 3);
      return deleteDeadline;
    }
    
    // Sinon, utiliser createdAt ou une date par défaut
    if (service.createdAt) {
      const created = new Date(service.createdAt);
      // Supposons approbation 7 jours après création
      const estimatedApproval = new Date(created);
      estimatedApproval.setDate(estimatedApproval.getDate() + 7);
      const deleteDeadline = new Date(estimatedApproval);
      deleteDeadline.setDate(deleteDeadline.getDate() + 3);
      return deleteDeadline;
    }
    
    // Fallback: +3 jours à partir de maintenant
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 3);
    return defaultDeadline;
  }

  /**
   * Version formatée de la deadline
   */
  getDeleteDeadlineFixedFormatted(service: any): string {
    const deadline = this.getDeleteDeadlineFixed(service);
    return deadline ? this.formatShortDate(deadline) : 'N/A';
  }
  
  // Dans DashboardComponent
cancelRequest(requestId: number, service: any) {
  if (!confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
    return;
  }

  this.saving = true;
  this.error = '';
  this.success = '';

  // Déterminer quel service utiliser selon l'onglet actif
  let requestService;
  
  if (this.activeTab === 'TOURIST') {
    requestService = this.touristRequestService;
  } else if (this.activeTab === 'COLLABORATION') {
    requestService = this.collaborationRequestService;
  } else { // INVESTMENT
    requestService = this.requestService;
  }

  requestService.cancelRequest(requestId).subscribe({
    next: (response) => {
      console.log('✅ Demande annulée:', response);
      this.success = 'Demande annulée avec succès';
      this.saving = false;
      
      // Mettre à jour le service localement
      this.updateServiceAfterCancellation(service);
      
      // ✅ NOUVEL APPEL AJOUTÉ POUR METTRE À JOUR LE COMPTEUR
      this.loadPendingRequestsCount();
      
      setTimeout(() => this.success = '', 4000);
    },
    error: (error) => {
      console.error('❌ Erreur annulation:', error);
      this.error = error.error?.message || error.message || 'Erreur lors de l\'annulation';
      this.saving = false;
      setTimeout(() => this.error = '', 4000);
    }
  });
}

// Méthode utilitaire pour mettre à jour le service après annulation
private updateServiceAfterCancellation(service: any) {
  service.hasPendingRequest = false;
  service.requestId = null;
  
  // Forcer la détection de changement en réaffectant le tableau
  if (this.activeTab === 'TOURIST') {
    this.touristServices = [...this.touristServices];
  } else if (this.activeTab === 'COLLABORATION') {
    this.collaborationServices = [...this.collaborationServices];
  } else {
    this.investmentServices = [...this.investmentServices];
  }
}
navigateToRequests() {
  console.log('Tentative de navigation vers /partenaire-local/requests');
  this.router.navigate(['/partenaire-local/requests']).then(
    success => {
      console.log('Navigation réussie:', success);
    },
    error => {
      console.error('Erreur de navigation:', error);
    }
  );
}
// ========================================
// ✅ NOUVELLES MÉTHODES POUR LES FICHIERS (À AJOUTER)
// ========================================

// Propriétés pour les fichiers
selectedFiles: File[] = [];
filePreviews: string[] = [];
// REMPLACEZ existingImages par existingDocuments
existingDocuments: { 
  id: number; 
  url: string; 
  fileName: string; 
  isPrimary: boolean;
  fileType?: string;
  fileSize?: number;
  downloadUrl?: string;
  isImage?: boolean;
  isPdf?: boolean;
}[] = [];
imagesToDelete: number[] = [];
maxFileSize = 10 * 1024 * 1024; // 10MB
allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Gérer la sélection de fichiers
 */
onFileSelected(event: any) {
  const files: FileList = event.target.files;
  
  // ✅ NE PAS réinitialiser, mais AJOUTER
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Vérifier la taille
    if (file.size > this.maxFileSize) {
      this.error = `Le fichier ${file.name} dépasse la taille maximale de 10MB`;
      setTimeout(() => this.error = '', 4000);
      continue;
    }
    
    // Vérifier le type
    if (!this.allowedFileTypes.includes(file.type)) {
      this.error = `Le type de fichier ${file.type} n'est pas autorisé`;
      setTimeout(() => this.error = '', 4000);
      continue;
    }
    
    // Vérifier si le fichier n'est pas déjà dans la liste (optionnel)
    const alreadyExists = this.selectedFiles.some(
      existingFile => existingFile.name === file.name && existingFile.size === file.size
    );
    
    if (alreadyExists) {
      this.error = `Le fichier ${file.name} est déjà sélectionné`;
      setTimeout(() => this.error = '', 4000);
      continue;
    }
    
    // AJOUTER le fichier à la liste existante
    this.selectedFiles.push(file);
    
    // Créer une prévisualisation pour les images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.filePreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      // Pour les PDF, ajouter une icône
      this.filePreviews.push('📄');
    }
  }
  
  // ✅ Réinitialiser l'input file pour permettre de sélectionner le même fichier plus tard
  event.target.value = '';
  
  console.log('✅ Fichiers sélectionnés maintenant:', this.selectedFiles.length);
}

/**
 * Supprimer un fichier de la sélection
 */
removeFile(index: number) {
  this.selectedFiles.splice(index, 1);
  this.filePreviews.splice(index, 1);
}
/**
 * Charger les documents existants (images ET PDF) pour le service en cours d'édition
 */
loadExistingDocuments(service: any) {
  console.log('📄 Chargement des documents existants pour le service:', service.id);
  
  // Nettoyer les anciens documents
  this.existingDocuments.forEach(doc => {
    if (doc.url.startsWith('blob:')) {
      window.URL.revokeObjectURL(doc.url);
    }
  });
  
  this.existingDocuments = [];
  this.imagesToDelete = [];
  
  // Utiliser "documents" au lieu de "images" car c'est le tableau qui contient TOUT
  if (service.documents && service.documents.length > 0) {
    console.log('📄 Documents existants trouvés:', service.documents.length);
    
    // Trier : images d'abord, puis PDF
    const sortedDocs = [...service.documents].sort((a, b) => {
      const aIsImage = a.fileType?.startsWith('image/');
      const bIsImage = b.fileType?.startsWith('image/');
      if (aIsImage && !bIsImage) return -1;
      if (!aIsImage && bIsImage) return 1;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
    
    sortedDocs.forEach((doc: any, index: number) => {
      this.loadExistingDocument(doc, index === 0); // Le premier est "primary"
    });
  } else {
    console.log('📄 Aucun document existant pour ce service');
  }
}

/**
 * Charger un document existant (image ou PDF)
 */

loadExistingDocument(doc: any, isPrimary: boolean) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  // 📸 CAS 1: C'est une IMAGE
  if (doc.fileType?.startsWith('image/')) {
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        
        this.existingDocuments.push({
          id: doc.id,
          url: url,
          fileName: doc.fileName,
          isPrimary: isPrimary,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          downloadUrl: doc.downloadUrl,
          isImage: true,
          isPdf: false
        });
        
        console.log(`✅ Image existante chargée: ${doc.fileName}`);
      },
      error: (err) => {
        console.error(`❌ Erreur chargement image ${doc.fileName}:`, err);
      }
    });
  } 
  
  // 📄 CAS 2: C'est un PDF
  else if (doc.fileType === 'application/pdf') {
    // Pour les PDF, on ne charge pas le blob, on utilise une icône
    this.existingDocuments.push({
      id: doc.id,
      url: 'assets/icons/pdf-icon.png', // Vous pouvez mettre le chemin vers votre icône PDF
      fileName: doc.fileName,
      isPrimary: false, // Les PDF ne sont jamais "primary"
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      downloadUrl: doc.downloadUrl,
      isImage: false,
      isPdf: true
    });
    
    console.log(`✅ PDF existant chargé: ${doc.fileName}`);
  }
  
  // 📁 CAS 3: Autre type de fichier (si nécessaire)
  else {
    this.existingDocuments.push({
      id: doc.id,
      url: 'assets/icons/file-icon.png', // Icône générique
      fileName: doc.fileName,
      isPrimary: false,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      downloadUrl: doc.downloadUrl,
      isImage: false,
      isPdf: false
    });
    
    console.log(`📄 Fichier chargé: ${doc.fileName}`);
  }
}
/**
 * Marquer un document pour suppression
 */
/**
 * Marquer un document pour suppression - CORRIGÉ : Supprime immédiatement
 */
markDocumentForDeletion(doc: any) {
  if (confirm(`Voulez-vous supprimer le document "${doc.fileName}" ?`)) {
    
    console.log('🗑️ Suppression immédiate du document ID:', doc.id);
    
    // Appel direct à l'API pour supprimer le document
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.delete(`http://localhost:8089/api/collaboration-services/documents/${doc.id}`, { headers })
      .subscribe({
        next: (response: any) => {
          console.log('✅ Document supprimé avec succès:', response);
          
          // Retirer de l'affichage local
          this.existingDocuments = this.existingDocuments.filter(d => d.id !== doc.id);
          
          // Nettoyer l'URL blob si c'est une image
          if (doc.url.startsWith('blob:')) {
            window.URL.revokeObjectURL(doc.url);
          }
          
          // Afficher un message de succès
          this.success = 'Document supprimé avec succès';
          setTimeout(() => this.success = '', 3000);
          
          // ✅ Recharger le service pour mettre à jour editAuthorized (qui reste true)
          this.loadAllServices();
        },
        error: (err) => {
          console.error('❌ Erreur suppression document:', err);
          this.error = err.error?.message || 'Erreur lors de la suppression du document';
          setTimeout(() => this.error = '', 4000);
        }
      });
  }
}
removeNewFile(index: number) {
  // Nettoyer l'URL de prévisualisation si c'est une image
  if (this.filePreviews[index] && this.filePreviews[index].startsWith('blob:')) {
    window.URL.revokeObjectURL(this.filePreviews[index]);
  }
  
  this.selectedFiles.splice(index, 1);
  this.filePreviews.splice(index, 1);
}
/**
 * Obtenir l'URL complète d'une image
 */
getFullImageUrl(relativeUrl: string): string {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `http://localhost:8089${relativeUrl}`;
}
// ========================================
// ✅ GESTION DES IMAGES AVEC AUTHENTIFICATION (comme dans le chat)
// ========================================

ngOnDestroy(): void {
  // Nettoyer les URLs blob pour éviter les fuites mémoire
  this.imageBlobUrls.forEach(url => {
    window.URL.revokeObjectURL(url);
  });
  this.imageBlobUrls.clear();
  
  this.existingDocuments.forEach(doc => {
    if (doc.url.startsWith('blob:')) {
      window.URL.revokeObjectURL(doc.url);
    }
  });
}

// Propriétés pour les images
selectedImage: { url: string; name: string; doc: any } | null = null;
imageBlobUrls: Map<string, string> = new Map();  // Clé = document.id
imageLoading: Set<string> = new Set();

/**
 * Charger une image avec authentification
 */
loadImage(doc: any): void {
  const docId = doc.id.toString();
  
  if (this.imageLoading.has(docId)) {
    return;
  }
  
  this.imageLoading.add(docId);
  
  // Récupérer le token
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

/**
 * Obtenir l'URL d'une image (avec gestion du chargement)
 */
getImageUrl(doc: any): string {
  const docId = doc.id.toString();
  
  if (this.imageBlobUrls.has(docId)) {
    return this.imageBlobUrls.get(docId)!;
  } else {
    this.loadImage(doc);
    return 'assets/images/loading-image.png'; // Image de chargement
  }
}

/**
 * Ouvrir une image en grand
 */
openImage(doc: any): void {
  const docId = doc.id.toString();
  
  // Ouvrir la modal immédiatement avec état de chargement
  this.selectedImage = {
    url: 'loading',
    name: doc.fileName,
    doc: doc
  };
  
  // Si déjà en cache, afficher directement
  if (this.imageBlobUrls.has(docId)) {
    this.selectedImage = {
      url: this.imageBlobUrls.get(docId)!,
      name: doc.fileName,
      doc: doc
    };
    return;
  }
  
  // Sinon charger l'image
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
    headers: headers,
    responseType: 'blob'
  }).subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      this.imageBlobUrls.set(docId, url);
      
      // Mettre à jour la modal si elle est encore ouverte
      if (this.selectedImage && this.selectedImage.name === doc.fileName) {
        this.selectedImage = {
          url: url,
          name: doc.fileName,
          doc: doc
        };
      }
    },
    error: (err) => {
      console.error('Erreur chargement image', err);
      this.selectedImage = null;
      this.error = 'Impossible de charger l\'image';
      setTimeout(() => this.error = '', 3000);
    }
  });
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
 * Ouvrir un document (image ou PDF)
 */
openDocument(doc: any): void {
  if (doc.fileType?.startsWith('image/')) {
    // Pour les images, ouvrir dans la modal
    this.selectedImage = {
      url: doc.url,
      name: doc.fileName,
      doc: doc
    };
  } else {
    // Pour les PDF, télécharger
    this.downloadFile(doc);
  }
}
/**
 * Marquer un document pour suppression - Version Investment
 */
/**
 * Marquer un document pour suppression - Version Investment
 */
markInvestmentDocumentForDeletion(doc: any) {
  if (confirm(`Voulez-vous supprimer le document "${doc.fileName}" ?`)) {
    
    console.log('🗑️ Suppression document investment ID:', doc.id);
    console.log('📄 Document:', doc);
    
    this.serviceManager.deleteInvestmentDocument(doc.id).subscribe({
      next: (response: any) => {
        console.log('✅ Document supprimé avec succès:', response);
        
        // Retirer de l'affichage local
        this.existingDocuments = this.existingDocuments.filter(d => d.id !== doc.id);
        
        // Nettoyer l'URL blob si c'est une image
        if (doc.url && doc.url.startsWith('blob:')) {
          window.URL.revokeObjectURL(doc.url);
        }
        
        this.success = 'Document supprimé avec succès';
        setTimeout(() => this.success = '', 3000);
        
        // Recharger les services pour mettre à jour l'affichage
        this.loadAllServices();
      },
      error: (err) => {
        console.error('❌ Erreur suppression document:', err);
        console.error('❌ Status:', err.status);
        console.error('❌ Message:', err.message);
        console.error('❌ Error object:', err.error);
        
        // Si l'erreur est 400 ou 404, le document n'existe probablement plus
        if (err.status === 400 || err.status === 404) {
          console.log('⚠️ Document déjà supprimé, nettoyage de l\'interface');
          
          // Retirer quand même de l'affichage local
          this.existingDocuments = this.existingDocuments.filter(d => d.id !== doc.id);
          
          if (doc.url && doc.url.startsWith('blob:')) {
            window.URL.revokeObjectURL(doc.url);
          }
          
          this.success = 'Document déjà supprimé';
          this.loadAllServices();
        } else {
          this.error = err.error?.message || err.message || 'Erreur lors de la suppression du document';
        }
        
        setTimeout(() => {
          this.error = '';
          this.success = '';
        }, 4000);
      }
    });
  }
}
// ================ GESTION DES DOCUMENTS TOURISTIQUES ================

/**
 * Charger les documents existants pour un service touristique
 */
loadTouristExistingDocuments(service: any) {
  console.log('📄 Chargement des documents touristiques pour le service:', service.id);
  
  // Nettoyer les anciens documents
  this.existingDocuments.forEach(doc => {
    if (doc.url.startsWith('blob:')) {
      window.URL.revokeObjectURL(doc.url);
    }
  });
  
  this.existingDocuments = [];
  this.imagesToDelete = [];
  
  if (service.documents && service.documents.length > 0) {
    console.log('📄 Documents touristiques trouvés:', service.documents.length);
    
    // Trier : images d'abord, puis PDF
    const sortedDocs = [...service.documents].sort((a, b) => {
      const aIsImage = a.fileType?.startsWith('image/');
      const bIsImage = b.fileType?.startsWith('image/');
      if (aIsImage && !bIsImage) return -1;
      if (!aIsImage && bIsImage) return 1;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
    
    sortedDocs.forEach((doc: any, index: number) => {
      this.loadTouristExistingDocument(doc, index === 0);
    });
  } else {
    console.log('📄 Aucun document touristique existant pour ce service');
  }
}

/**
 * Charger un document touristique existant
 */
loadTouristExistingDocument(doc: any, isPrimary: boolean) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  // 📸 CAS 1: C'est une IMAGE
  if (doc.fileType?.startsWith('image/')) {
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        
        this.existingDocuments.push({
          id: doc.id,
          url: url,
          fileName: doc.fileName,
          isPrimary: isPrimary,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          downloadUrl: doc.downloadUrl,
          isImage: true,
          isPdf: false
        });
        
        console.log(`✅ Image touristique chargée: ${doc.fileName}`);
      },
      error: (err) => {
        console.error(`❌ Erreur chargement image touristique ${doc.fileName}:`, err);
      }
    });
  } 
  
  // 📄 CAS 2: C'est un PDF
  else if (doc.fileType === 'application/pdf') {
    this.existingDocuments.push({
      id: doc.id,
      url: 'assets/icons/pdf-icon.png',
      fileName: doc.fileName,
      isPrimary: false,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      downloadUrl: doc.downloadUrl,
      isImage: false,
      isPdf: true
    });
    
    console.log(`✅ PDF touristique chargé: ${doc.fileName}`);
  }
  
  // 📁 CAS 3: Autre type de fichier
  else {
    this.existingDocuments.push({
      id: doc.id,
      url: 'assets/icons/file-icon.png',
      fileName: doc.fileName,
      isPrimary: false,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      downloadUrl: doc.downloadUrl,
      isImage: false,
      isPdf: false
    });
    
    console.log(`📄 Fichier touristique chargé: ${doc.fileName}`);
  }
}

/**
 * Marquer un document touristique pour suppression
 */
markTouristDocumentForDeletion(doc: any) {
  if (confirm(`Voulez-vous supprimer le document "${doc.fileName}" ?`)) {
    
    console.log('🗑️ Suppression document touristique ID:', doc.id);
    
    this.serviceManager.deleteTouristServiceDocument(doc.id).subscribe({
      next: (response: any) => {
        console.log('✅ Document touristique supprimé avec succès:', response);
        
        // Retirer de l'affichage local
        this.existingDocuments = this.existingDocuments.filter(d => d.id !== doc.id);
        
        // Nettoyer l'URL blob si c'est une image
        if (doc.url && doc.url.startsWith('blob:')) {
          window.URL.revokeObjectURL(doc.url);
        }
        
        this.success = 'Document supprimé avec succès';
        setTimeout(() => this.success = '', 3000);
        
        // Recharger les services pour mettre à jour l'affichage
        this.loadAllServices();
      },
      error: (err) => {
        console.error('❌ Erreur suppression document touristique:', err);
        
        // Si l'erreur est 400 ou 404, le document n'existe probablement plus
        if (err.status === 400 || err.status === 404) {
          console.log('⚠️ Document déjà supprimé, nettoyage de l\'interface');
          
          this.existingDocuments = this.existingDocuments.filter(d => d.id !== doc.id);
          
          if (doc.url && doc.url.startsWith('blob:')) {
            window.URL.revokeObjectURL(doc.url);
          }
          
          this.success = 'Document déjà supprimé';
          this.loadAllServices();
        } else {
          this.error = err.error?.message || err.message || 'Erreur lors de la suppression du document';
        }
        
        setTimeout(() => {
          this.error = '';
          this.success = '';
        }, 4000);
      }
    });
  }
}

/**
 * Télécharger un fichier touristique
 */
downloadTouristFile(doc: any): void {
  const fileName = doc.downloadUrl.split('/').pop();
  if (!fileName) return;
  
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  this.http.get(`http://localhost:8089/api/tourist-services/files/${fileName}`, {
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
    error: (err) => console.error('❌ Erreur téléchargement fichier touristique:', err)
  });
}
getTouristImageUrl(doc: any): string {
  const docId = `tourist-${doc.id}`;
  
  if (this.imageBlobUrls.has(docId)) {
    return this.imageBlobUrls.get(docId)!;
  }
  
  // Extraire le nom du fichier de l'URL
  const fileName = doc.downloadUrl.split('/').pop();
  if (!fileName) return 'assets/images/loading-image.png';
  
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  this.http.get(`http://localhost:8089/api/tourist-services/files/${fileName}`, {
    headers: headers,
    responseType: 'blob'
  }).subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      this.imageBlobUrls.set(docId, url);
      // Forcer la détection de changement
      this.touristServices = [...this.touristServices];
    },
    error: (err) => {
      console.error(`❌ Erreur chargement image touristique ${doc.fileName}:`, err);
    }
  });
  
  return 'assets/images/loading-image.png';
}
/**
 * Vérifie si un service a des images dans ses documents
 */
hasImages(service: any): boolean {
  if (!service.documents || service.documents.length === 0) {
    return false;
  }
  return service.documents.some((doc: any) => 
    doc.fileType && doc.fileType.startsWith('image/')
  );
}
navigateToAcquisitionRequests() {
  this.router.navigate(['/partenaire-local/acquisition-requests']);
}
}