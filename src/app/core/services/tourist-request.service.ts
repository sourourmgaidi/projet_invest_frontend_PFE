import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth';

export interface TouristRequest {
  id: number;
  service: any;
  partner: any;
  requestType: 'EDIT' | 'DELETE';
  reason: string;
  requestedChanges?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  responseDate?: string;
  executionDate?: string;
  admin?: any;
  adminComment?: string;
}

export interface TouristRequestsResponse {
  requests: TouristRequest[];
  count: number;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TouristRequestService {
  private readonly API_URL = 'http://localhost:8089/api/tourist-services';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  // ================ MÉTHODES POUR LES PARTENAIRES ================

  /**
   * Demander la modification d'un service touristique approuvé
   * Endpoint: POST /api/tourist-services/{id}/request-edit
   */
  requestEdit(serviceId: number, reason: string, requestedChanges: string): Observable<any> {
    console.log(`📝 Demande de modification pour le service touristique ${serviceId}`);
    
    if (!reason || reason.trim() === '') {
      return throwError(() => new Error('La raison est requise'));
    }
    
    if (!requestedChanges || requestedChanges.trim() === '') {
      return throwError(() => new Error('Les changements demandés sont requis'));
    }
    
    return this.http.post(
      `${this.API_URL}/${serviceId}/request-edit`,
      { reason, requestedChanges },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande de modification envoyée', response)),
      catchError(error => {
        console.error('❌ Erreur lors de la demande de modification:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Demander la suppression d'un service touristique approuvé
   * Endpoint: POST /api/tourist-services/{id}/request-delete
   */
  requestDelete(serviceId: number, reason: string): Observable<any> {
    console.log(`🗑️ Demande de suppression pour le service touristique ${serviceId}`);
    
    if (!reason || reason.trim() === '') {
      return throwError(() => new Error('La raison est requise'));
    }
    
    return this.http.post(
      `${this.API_URL}/${serviceId}/request-delete`,
      { reason },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande de suppression envoyée', response)),
      catchError(error => {
        console.error('❌ Erreur lors de la demande de suppression:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer toutes les demandes du partenaire connecté
   * Endpoint: GET /api/tourist-services/my-requests
   */
  getMyRequests(): Observable<TouristRequestsResponse> {
    console.log('📋 Récupération de mes demandes touristiques');
    
    return this.http.get<TouristRequestsResponse>(
      `${this.API_URL}/my-requests`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log(`✅ ${response.requests?.length || 0} demandes trouvées`)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des demandes:', error);
        return of({ requests: [], count: 0, success: false });
      })
    );
  }

  /**
   * Annuler une demande en attente
   * Endpoint: DELETE /api/tourist-services/requests/{requestId}/cancel
   */
  cancelRequest(requestId: number): Observable<any> {
    console.log(`🗑️ Annulation de la demande ${requestId}`);
    
    return this.http.delete(
      `${this.API_URL}/requests/${requestId}/cancel`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande annulée', response)),
      catchError(error => {
        console.error('❌ Erreur lors de l\'annulation:', error);
        return throwError(() => error);
      })
    );
  }

  // ================ MÉTHODES POUR L'ADMIN ================

  /**
   * Récupérer toutes les demandes (admin)
   * Endpoint: GET /api/tourist-services/admin/requests
   */
  getAllRequests(): Observable<TouristRequestsResponse> {
    console.log('👑 Récupération de toutes les demandes touristiques');
    
    return this.http.get<TouristRequestsResponse>(
      `${this.API_URL}/admin/requests`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log(`✅ ${response.requests?.length || 0} demandes trouvées`)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des demandes:', error);
        return of({ requests: [], count: 0, success: false });
      })
    );
  }

  /**
   * Récupérer les demandes en attente (admin)
   * Endpoint: GET /api/tourist-services/admin/requests/pending
   */
  getPendingRequests(): Observable<TouristRequestsResponse> {
    console.log('👑 Récupération des demandes en attente');
    
    return this.http.get<TouristRequestsResponse>(
      `${this.API_URL}/admin/requests/pending`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log(`✅ ${response.requests?.length || 0} demandes en attente`)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des demandes en attente:', error);
        return of({ requests: [], count: 0, success: false });
      })
    );
  }

  /**
   * Récupérer les demandes par type (admin)
   * Endpoint: GET /api/tourist-services/admin/requests/type/{type}
   */
  getRequestsByType(type: 'EDIT' | 'DELETE'): Observable<TouristRequestsResponse> {
    console.log(`👑 Récupération des demandes de type ${type}`);
    
    return this.http.get<TouristRequestsResponse>(
      `${this.API_URL}/admin/requests/type/${type}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log(`✅ ${response.requests?.length || 0} demandes de type ${type}`)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des demandes par type:', error);
        return of({ requests: [], count: 0, success: false });
      })
    );
  }

  /**
   * Récupérer une demande par ID (admin)
   * Endpoint: GET /api/tourist-services/admin/requests/{requestId}
   */
  getRequestById(requestId: number): Observable<any> {
    console.log(`👑 Récupération de la demande ${requestId}`);
    
    return this.http.get<any>(
      `${this.API_URL}/admin/requests/${requestId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande récupérée', response)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération de la demande:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Approuver une demande de modification (admin)
   * Endpoint: PUT /api/tourist-services/admin/requests/{requestId}/approve-edit
   */
  approveEditRequest(requestId: number): Observable<any> {
    console.log(`👑 Approbation de la demande de modification ${requestId}`);
    
    return this.http.put(
      `${this.API_URL}/admin/requests/${requestId}/approve-edit`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande de modification approuvée', response)),
      catchError(error => {
        console.error('❌ Erreur lors de l\'approbation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Approuver une demande de suppression (admin)
   * Endpoint: PUT /api/tourist-services/admin/requests/{requestId}/approve-delete
   */
  approveDeleteRequest(requestId: number): Observable<any> {
    console.log(`👑 Approbation de la demande de suppression ${requestId}`);
    
    return this.http.put(
      `${this.API_URL}/admin/requests/${requestId}/approve-delete`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Demande de suppression approuvée', response)),
      catchError(error => {
        console.error('❌ Erreur lors de l\'approbation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ CORRIGÉ : Rejeter une demande avec raison (admin)
   * Endpoint: PUT /api/tourist-services/admin/requests/{requestId}/reject
   * @param requestId ID de la demande
   * @param rejectionReason Raison du rejet
   */
  rejectRequest(requestId: number, rejectionReason: string): Observable<any> {
    console.log(`👑 Rejet de la demande touristique ${requestId} avec raison:`, rejectionReason);
    
    if (!rejectionReason || rejectionReason.trim() === '') {
      return throwError(() => new Error('La raison du rejet est requise'));
    }
    
    // ✅ Corps avec 'rejectionReason' (attendu par le backend)
    const body = { rejectionReason };
    
    return this.http.put(
      `${this.API_URL}/admin/requests/${requestId}/reject`,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Demande touristique rejetée avec succès', response);
      }),
      catchError(error => {
        console.error('❌ Erreur lors du rejet de la demande touristique:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtenir les statistiques des demandes (admin)
   * Endpoint: GET /api/tourist-services/admin/requests/stats
   */
  getRequestStatistics(): Observable<any> {
    console.log('👑 Récupération des statistiques des demandes');
    
    return this.http.get<any>(
      `${this.API_URL}/admin/requests/stats`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(stats => console.log('✅ Statistiques récupérées', stats)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des statistiques:', error);
        return of({ total: 0, pending: 0, editRequests: 0, deleteRequests: 0 });
      })
    );
  }

  // ================ MÉTHODES UTILITAIRES ================

  /**
   * Formater le type de requête pour l'affichage
   */
  formatRequestType(type: 'EDIT' | 'DELETE'): string {
    return type === 'EDIT' ? 'Modification' : 'Suppression';
  }

  /**
   * Obtenir la couleur du statut pour l'affichage
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return '#f59e0b'; // orange
      case 'APPROVED': return '#10b981'; // vert
      case 'REJECTED': return '#ef4444'; // rouge
      default: return '#6b7280'; // gris
    }
  }

  /**
   * Obtenir l'icône du statut
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return '⏳';
      case 'APPROVED': return '✅';
      case 'REJECTED': return '❌';
      default: return '❓';
    }
  }
}