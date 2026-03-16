import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class LocalPartnerServiceManager {
  private readonly API_URL = 'http://localhost:8089/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private getJsonHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  // ─── Regions ────────────────────────────────────────────────
  getRegions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/regions`, { headers: this.getJsonHeaders() });
  }

  // ─── Economic Sectors ────────────────────────────────────────
  getEconomicSectors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/economic-sectors`, { headers: this.getJsonHeaders() });
  }

  // ─── Collaboration Services ───────────────────────────────────
createCollaborationService(service: any, files?: File[]): Observable<any> {
  // Avec fichiers
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('service', JSON.stringify(service));
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    return this.http.post(
      `${this.API_URL}/collaboration-services`,
      formData,
      { headers: this.getHeaders() } // ⚠️ Sans Content-Type pour multipart
    );
  } 
  // Sans fichiers
  else {
    return this.http.post(
      `${this.API_URL}/collaboration-services`,
      service,
      { headers: this.getJsonHeaders() }
    );
  }
}

  getCollaborationServicesByProvider(providerId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.API_URL}/collaboration-services/provider/${providerId}`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of([])));
  }

  deleteCollaborationService(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/collaboration-services/${id}`, { headers: this.getJsonHeaders() });
  }

 /**
 * ✅ UNE SEULE MÉTHODE pour mettre à jour un service de collaboration
 * Détecte automatiquement si des fichiers sont présents (comme Investment)
 */
updateCollaborationService(id: number, service: any, files?: File[]): Observable<any> {
  console.log('📤 updateCollaborationService appelé', { id, service, filesCount: files?.length });
  
  // ✅ TOUJOURS créer un FormData, même sans fichiers
  const formData = new FormData();
  formData.append('service', JSON.stringify(service));
  
  // Ajouter les fichiers s'il y en a
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  }

  // Headers avec seulement Authorization (pas de Content-Type)
  const token = this.authService.getToken();
  let headers = new HttpHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return this.http.put(
    `${this.API_URL}/collaboration-services/${id}`,
    formData,
    { headers: headers }
  );
}
/**
 * ✅ Supprimer un document d'un service de collaboration
 */
/**
 * ✅ Supprimer un document d'un service de collaboration
 * CORRIGÉ : Utilise getHeaders() au lieu de getJsonHeaders()
 */
deleteCollaborationDocument(documentId: number): Observable<any> {
  console.log('🗑️ deleteCollaborationDocument appelé pour ID:', documentId);
  
  // ✅ Utiliser getHeaders() qui n'a que Authorization, pas de Content-Type
  return this.http.delete(
    `${this.API_URL}/collaboration-services/documents/${documentId}`,
    { headers: this.getHeaders() }  // ← Changé de getJsonHeaders() à getHeaders()
  );
}

/**
 * ✅ Récupérer l'URL de la première image d'un service de collaboration
 */
getCollaborationFirstImageUrl(service: any): string | null {
  if (service.firstImageUrl) {
    return service.firstImageUrl;
  }
  if (service.documents && service.documents.length > 0) {
    return service.documents[0].downloadUrl;
  }
  return null;
}

/**
 * ✅ Récupérer toutes les images d'un service de collaboration
 */
getCollaborationImages(service: any): any[] {
  return service.images || (service.documents ? 
    service.documents.filter((doc: any) => doc.fileType?.startsWith('image/')) : []);
}

/**
 * ✅ Récupérer les documents non-images d'un service de collaboration
 */
getCollaborationOtherDocuments(service: any): any[] {
  return service.otherDocuments || (service.documents ?
    service.documents.filter((doc: any) => !doc.fileType?.startsWith('image/')) : []);
}

  // ─── Investment Services ──────────────────────────────────────
  
  /**
   * ✅ UNE SEULE MÉTHODE pour créer un service d'investissement
   * Détecte automatiquement si des fichiers sont présents
   */
 // ─── Investment Services ──────────────────────────────────────

/**
 * ✅ UNE SEULE MÉTHODE pour créer un service d'investissement
 * UTILISE L'URL /api/investment-services (qui fonctionne)
 */
createInvestmentService(service: any, files?: File[]): Observable<any> {
  // Avec fichiers
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('service', JSON.stringify(service));
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    return this.http.post(
      `${this.API_URL}/investment-services`,  // ✅ URL corrigée
      formData,
      { headers: this.getHeaders() }
    );
  } 
  // Sans fichiers
  else {
    return this.http.post(
      `${this.API_URL}/investment-services`,  // ✅ URL corrigée
      service,
      { headers: this.getJsonHeaders() }
    );
  }
}

  getInvestmentServicesByProvider(providerId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.API_URL}/investment-services/provider/${providerId}`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of([])));
  }

  deleteInvestmentService(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/investment-services/${id}`, { headers: this.getJsonHeaders() });
  }

  /**
   * ✅ UNE SEULE MÉTHODE pour mettre à jour un service
   * Détecte automatiquement si des fichiers sont présents
   */
 /**
 * ✅ UNE SEULE MÉTHODE pour mettre à jour un service d'investissement
 * TOUJOURS avec FormData, comme dans Postman
 */
updateInvestmentService(id: number, service: any, files?: File[]): Observable<any> {
  console.log('📤 updateInvestmentService appelé', { id, service, filesCount: files?.length });
  
  // ✅ TOUJOURS créer un FormData, même sans fichiers
  const formData = new FormData();
  formData.append('service', JSON.stringify(service));
  
  // Ajouter les fichiers s'il y en a
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
      console.log(`📤 Fichier ${i}:`, files[i].name, files[i].type, files[i].size);
    }
  } else {
    console.log('📤 Aucun fichier à ajouter');
  }

  // Headers avec seulement Authorization (pas de Content-Type)
  const token = this.authService.getToken();
  let headers = new HttpHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return this.http.put(
    `${this.API_URL}/investment-services/${id}`,
    formData,
    { headers: headers }
  );
}

  /**
   * ✅ NOUVEAU : Récupérer l'URL de la première image d'un service
   */
  getFirstImageUrl(service: any): string | null {
    if (service.firstImageUrl) {
      return service.firstImageUrl;
    }
    if (service.documents && service.documents.length > 0) {
      return service.documents[0].downloadUrl;
    }
    return null;
  }

  /**
   * ✅ NOUVEAU : Récupérer toutes les images d'un service
   */
  getServiceImages(service: any): any[] {
    return service.images || (service.documents ? 
      service.documents.filter((doc: any) => doc.fileType?.startsWith('image/')) : []);
  }

  /**
   * ✅ NOUVEAU : Récupérer les documents non-images d'un service
   */
  getServiceOtherDocuments(service: any): any[] {
    return service.otherDocuments || (service.documents ?
      service.documents.filter((doc: any) => !doc.fileType?.startsWith('image/')) : []);
  }

 createTouristService(service: any, files?: File[]): Observable<any> {
  console.log('📝 createTouristService appelé', { 
    service, 
    filesCount: files?.length 
  });
  
  // CAS 1: Avec fichiers
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('service', JSON.stringify(service));
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
      console.log(`📎 Fichier ${i}:`, files[i].name, files[i].type, files[i].size);
    }

    // Headers avec seulement Authorization
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post(
      `${this.API_URL}/tourist-services`,  // ⚠️ Note: pas /create
      formData,
      { headers: headers }
    ).pipe(
      tap(response => console.log('✅ Service touristique créé avec succès (avec fichiers)', response)),
      catchError(error => {
        console.error('❌ Erreur création service touristique:', error);
        return throwError(() => error);
      })
    );
  } 
  
  // CAS 2: Sans fichiers
  else {
    return this.http.post(
      `${this.API_URL}/tourist-services`,  // ⚠️ Même URL, pas /create
      service,
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(response => console.log('✅ Service touristique créé avec succès (sans fichiers)', response)),
      catchError(error => {
        console.error('❌ Erreur création service touristique:', error);
        return throwError(() => error);
      })
    );
  }
}

  getTouristServicesByProvider(providerId: number): Observable<any[]> {
    console.log(`📋 Récupération des services du provider ${providerId}`);
    return this.http.get<any[]>(
      `${this.API_URL}/tourist-services/provider/${providerId}`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of([])));
  }

  deleteTouristService(id: number): Observable<any> {
    console.log(`🗑️ Suppression du service ${id}`);
    return this.http.delete(`${this.API_URL}/tourist-services/${id}`, { headers: this.getJsonHeaders() });
  }

 updateTouristService(id: number, service: any, files?: File[]): Observable<any> {
  console.log('📝 updateTouristService appelé', { 
    id, 
    service, 
    filesCount: files?.length 
  });
  
  // Toujours créer un FormData (même sans fichiers)
  const formData = new FormData();
  
  // Ajouter les données du service (peuvent être partielles)
  if (service) {
    formData.append('service', JSON.stringify(service));
    console.log('📦 Données service:', service);
  }
  
  // Ajouter les fichiers s'il y en a
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
      console.log(`📎 Fichier ${i}:`, files[i].name, files[i].type, files[i].size);
    }
  } else {
    console.log('📎 Aucun nouveau fichier à ajouter');
  }

  // Headers avec seulement Authorization (pas de Content-Type)
  const token = this.authService.getToken();
  let headers = new HttpHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return this.http.put(
    `${this.API_URL}/tourist-services/${id}`,
    formData,
    { headers: headers }
  ).pipe(
    tap(response => {
      console.log('✅ Service touristique mis à jour avec succès', response);
    }),
    catchError(error => {
      console.error('❌ Erreur mise à jour service touristique:', error);
      return throwError(() => error);
    })
  );
}

  // ─── FAVORIS ──────────────────────────────────────────────────
  addInvestorFavorite(serviceId: number): Observable<any> {
    return this.http.post(
      `${this.API_URL}/investors/favorites/${serviceId}`,
      {},
      { headers: this.getJsonHeaders() }
    );
  }

  removeInvestorFavorite(serviceId: number): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/investors/favorites/${serviceId}`,
      { headers: this.getJsonHeaders() }
    );
  }

  getInvestorFavorites(): Observable<{ success: boolean; favorites: any[]; count: number }> {
    return this.http.get<{ success: boolean; favorites: any[]; count: number }>(
      `${this.API_URL}/investors/favorites`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of({ success: false, favorites: [], count: 0 })));
  }

  checkInvestorFavorite(serviceId: number): Observable<{ success: boolean; isFavorite: boolean; serviceId: number }> {
    return this.http.get<{ success: boolean; isFavorite: boolean; serviceId: number }>(
      `${this.API_URL}/investors/favorites/check/${serviceId}`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of({ success: false, isFavorite: false, serviceId })));
  }

  countInvestorFavorites(): Observable<{ success: boolean; count: number }> {
    return this.http.get<{ success: boolean; count: number }>(
      `${this.API_URL}/investors/favorites/count`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of({ success: false, count: 0 })));
  }

  addCompanyFavorite(serviceId: number): Observable<any> {
    return this.http.post(
      `${this.API_URL}/international-companies/favorites/${serviceId}`,
      {},
      { headers: this.getJsonHeaders() }
    );
  }

  removeCompanyFavorite(serviceId: number): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/international-companies/favorites/${serviceId}`,
      { headers: this.getJsonHeaders() }
    );
  }

  getCompanyFavorites(): Observable<{ success: boolean; favorites: any[]; count: number }> {
    return this.http.get<{ success: boolean; favorites: any[]; count: number }>(
      `${this.API_URL}/international-companies/favorites`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of({ success: false, favorites: [], count: 0 })));
  }

  checkCompanyFavorite(serviceId: number): Observable<{ success: boolean; isFavorite: boolean; serviceId: number }> {
    return this.http.get<{ success: boolean; isFavorite: boolean; serviceId: number }>(
      `${this.API_URL}/international-companies/favorites/check/${serviceId}`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of({ success: false, isFavorite: false, serviceId })));
  }

  countCompanyFavorites(): Observable<{ success: boolean; count: number }> {
    return this.http.get<{ success: boolean; count: number }>(
      `${this.API_URL}/international-companies/favorites/count`,
      { headers: this.getJsonHeaders() }
    ).pipe(catchError(() => of({ success: false, count: 0 })));
  }

  // ─── APPROBATION ──────────────────────────────────────────────
  approveInvestmentService(serviceId: number): Observable<any> {
    console.log(`📝 Approbation du service d'investissement ID: ${serviceId}`);
    
    return this.http.put(
      `${this.API_URL}/investment-services/${serviceId}/approve`,
      {},
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Service approuvé avec succès', response);
        console.log('📬 Notifications envoyées à: LOCAL_PARTNER, INVESTOR, INTERNATIONAL_COMPANY');
      }),
      catchError((error) => {
        console.error('❌ Erreur lors de l\'approbation:', error);
        return throwError(() => error);
      })
    );
  }

/**
 * ✅ Rejeter un service d'investissement avec une raison
 * @param serviceId ID du service à rejeter
 * @param rejectionReason Raison du rejet
 * @returns Observable avec le service rejeté
 */
rejectInvestmentService(serviceId: number, rejectionReason: string): Observable<any> {
  console.log(`📝 Rejet du service d'investissement ID: ${serviceId} avec raison:`, rejectionReason);
  
  const body = { rejectionReason };
  
  return this.http.put(
    `${this.API_URL}/investment-services/${serviceId}/reject`,
    body,
    { headers: this.getJsonHeaders() }
  ).pipe(
    tap(response => {
      console.log('✅ Service rejeté avec succès', response);
      console.log('📬 Notification envoyée au partenaire local avec la raison');
    }),
    catchError((error) => {
      console.error('❌ Erreur lors du rejet:', error);
      return throwError(() => error);
    })
  );
}

  getPendingInvestmentServices(): Observable<any[]> {
    console.log('📋 Récupération des services en attente');
    
    return this.http.get<any[]>(
      `${this.API_URL}/investment-services/pending`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(services => console.log(`✅ ${services.length} services en attente trouvés`)),
      catchError((error) => {
        console.error('❌ Erreur lors de la récupération des services en attente:', error);
        return of([]);
      })
    );
  }

  getApprovedInvestmentServices(): Observable<any[]> {
    console.log('📋 Récupération des services approuvés');
    
    return this.http.get<any[]>(
      `${this.API_URL}/investment-services/approved`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(services => console.log(`✅ ${services.length} services approuvés trouvés`)),
      catchError((error) => {
        console.error('❌ Erreur lors de la récupération des services approuvés:', error);
        return of([]);
      })
    );
  }

  getRejectedInvestmentServices(): Observable<any[]> {
    console.log('📋 Récupération des services rejetés');
    
    return this.http.get<any[]>(
      `${this.API_URL}/investment-services/rejected`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(services => console.log(`✅ ${services.length} services rejetés trouvés`)),
      catchError((error) => {
        console.error('❌ Erreur lors de la récupération des services rejetés:', error);
        return of([]);
      })
    );
  }

  getInvestmentServicesStats(): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/investment-services/stats`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      catchError((error) => {
        console.error('❌ Erreur lors de la récupération des statistiques:', error);
        return of({ total: 0, pending: 0, approved: 0, rejected: 0 });
      })
    );
  }

  // ─── SERVICE REQUESTS ─────────────────────────────────────────
  getPendingServiceRequests(): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/service-requests/admin/pending`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      catchError(() => of({ requests: [], count: 0 }))
    );
  }

  getServiceRequestsByType(type: 'EDIT' | 'DELETE'): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/service-requests/admin/type/${type}`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      catchError(() => of({ requests: [], count: 0 }))
    );
  }

  approveEditRequest(requestId: number): Observable<any> {
    return this.http.post(
      `${this.API_URL}/service-requests/admin/${requestId}/approve-edit`,
      {},
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande de modification approuvée', response)),
      catchError((error) => {
        console.error('❌ Erreur approbation modification:', error);
        return throwError(() => error);
      })
    );
  }

  approveDeleteRequest(requestId: number): Observable<any> {
    return this.http.post(
      `${this.API_URL}/service-requests/admin/${requestId}/approve-delete`,
      {},
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande de suppression approuvée', response)),
      catchError((error) => {
        console.error('❌ Erreur approbation suppression:', error);
        return throwError(() => error);
      })
    );
  }

  rejectServiceRequest(requestId: number, reason: string): Observable<any> {
    return this.http.post(
      `${this.API_URL}/service-requests/admin/${requestId}/reject`,
      { reason },
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande rejetée', response)),
      catchError((error) => {
        console.error('❌ Erreur rejet demande:', error);
        return throwError(() => error);
      })
    );
  }

  getServiceRequestsStats(): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/service-requests/admin/statistics`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      catchError(() => of({
        total: 0, pending: 0, approved: 0, rejected: 0,
        editRequests: 0, deleteRequests: 0
      }))
    );
  }

  getMyServiceRequests(): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/service-requests/partner/my-requests`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      catchError(() => of({ requests: [], count: 0 }))
    );
  }

  cancelServiceRequest(requestId: number): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/service-requests/partner/${requestId}/cancel`,
      { headers: this.getJsonHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande annulée', response)),
      catchError((error) => {
        console.error('❌ Erreur annulation demande:', error);
        return throwError(() => error);
      })
    );
  }

  /**
 * ✅ Supprimer un document d'un service d'investissement
 */
deleteInvestmentDocument(documentId: number): Observable<any> {
  console.log('🗑️ deleteInvestmentDocument appelé pour ID:', documentId);
  
  const token = this.authService.getToken();
  let headers = new HttpHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return this.http.delete(
    `${this.API_URL}/investment-services/documents/${documentId}`,
    { headers: headers }
  );
}

// ================ TOURIST SERVICES - GESTION DES DOCUMENTS ================

/**
 * ✅ Supprimer un document d'un service touristique
 * Correspond à @DeleteMapping("/documents/{documentId}") dans le contrôleur
 */
deleteTouristServiceDocument(documentId: number): Observable<any> {
  console.log('🗑️ deleteTouristServiceDocument appelé pour ID:', documentId);
  
  const token = this.authService.getToken();
  let headers = new HttpHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return this.http.delete(
    `${this.API_URL}/tourist-services/documents/${documentId}`,
    { headers: headers }
  ).pipe(
    tap(response => console.log('✅ Document touristique supprimé avec succès', response)),
    catchError(error => {
      console.error('❌ Erreur suppression document touristique:', error);
      return throwError(() => error);
    })
  );
}

/**
 * ✅ Télécharger un fichier (pour prévisualisation)
 * Correspond à @GetMapping("/files/{fileName}") dans le contrôleur
 */
downloadTouristServiceFile(fileName: string): Observable<Blob> {
  console.log('📥 Téléchargement du fichier touristique:', fileName);
  
  const token = this.authService.getToken();
  let headers = new HttpHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return this.http.get(
    `${this.API_URL}/tourist-services/files/${fileName}`,
    { 
      headers: headers,
      responseType: 'blob' 
    }
  ).pipe(
    tap(() => console.log('✅ Fichier touristique téléchargé avec succès')),
    catchError(error => {
      console.error('❌ Erreur téléchargement fichier touristique:', error);
      return throwError(() => error);
    })
  );
}

/**
 * ✅ Récupérer l'URL de téléchargement d'un fichier
 */
getTouristServiceFileUrl(fileName: string): string {
  return `${this.API_URL}/tourist-services/files/${fileName}`;
}

/**
 * ✅ Récupérer l'URL de la première image d'un service touristique
 */
getTouristServiceFirstImageUrl(service: any): string | null {
  if (service.firstImageUrl) {
    return service.firstImageUrl;
  }
  if (service.documents && service.documents.length > 0) {
    // Chercher d'abord l'image principale
    const primaryDoc = service.documents.find((doc: any) => doc.isPrimary === true);
    if (primaryDoc) {
      return primaryDoc.downloadUrl;
    }
    // Sinon prendre la première image
    const firstImage = service.documents.find((doc: any) => doc.fileType?.startsWith('image/'));
    return firstImage ? firstImage.downloadUrl : null;
  }
  return null;
}

/**
 * ✅ Récupérer toutes les images d'un service touristique
 */
getTouristServiceImages(service: any): any[] {
  if (service.images) {
    return service.images;
  }
  if (service.documents) {
    return service.documents.filter((doc: any) => doc.fileType?.startsWith('image/'));
  }
  return [];
}

/**
 * ✅ Récupérer les documents non-images d'un service touristique
 */
getTouristServiceOtherDocuments(service: any): any[] {
  if (service.otherDocuments) {
    return service.otherDocuments;
  }
  if (service.documents) {
    return service.documents.filter((doc: any) => !doc.fileType?.startsWith('image/'));
  }
  return [];
}

/**
 * ✅ Vérifier si un service a des documents
 */
hasTouristServiceDocuments(service: any): boolean {
  return service.documents && service.documents.length > 0;
}

/**
 * ✅ Compter le nombre de documents d'un service
 */
countTouristServiceDocuments(service: any): number {
  return service.documents ? service.documents.length : 0;
}

/**
 * ✅ Compter le nombre d'images d'un service
 */
countTouristServiceImages(service: any): number {
  return this.getTouristServiceImages(service).length;
}

/**
 * ✅ Compter le nombre de documents non-images
 */
countTouristServiceOtherDocuments(service: any): number {
  return this.getTouristServiceOtherDocuments(service).length;
}
}