// core/services/collaboration-request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth';

export interface CollaborationServiceRequest {
  id: number;
  requestType: 'EDIT' | 'DELETE';
  reason: string;
  requestedChanges?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  responseDate?: string;
  executionDate?: string;
  service: any;
  partner: any;
  admin?: any;
  rejectionReason?: string; // ✅ AJOUT (optionnel)
  rejectedAt?: string;      // ✅ AJOUT (optionnel)
}

@Injectable({
  providedIn: 'root'
})
export class CollaborationRequestService {
  private apiUrl = 'http://localhost:8089/api/collaboration-services/requests';

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

  // ========================================
  // PARTENAIRE LOCAL
  // ========================================

  /**
   * Demander la modification d'un service de collaboration
   */
  requestEdit(serviceId: number, reason: string, changes: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/edit/${serviceId}`,
      { reason, changes },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Demander la suppression d'un service de collaboration
   */
  requestDelete(serviceId: number, reason: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/delete/${serviceId}`,
      { reason },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Voir mes demandes de collaboration
   */
  getMyRequests(): Observable<{ success: boolean; requests: CollaborationServiceRequest[]; count: number }> {
    return this.http.get<{ success: boolean; requests: CollaborationServiceRequest[]; count: number }>(
      `${this.apiUrl}/partner/my-requests`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Voir le détail d'une demande de collaboration
   */
  getRequestById(requestId: number): Observable<{ success: boolean; request: CollaborationServiceRequest }> {
    return this.http.get<{ success: boolean; request: CollaborationServiceRequest }>(
      `${this.apiUrl}/partner/${requestId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Annuler une demande en attente
   */
  cancelRequest(requestId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/partner/${requestId}/cancel`,
      { headers: this.getHeaders() }
    );
  }

  // ========================================
  // ADMIN
  // ========================================

  /**
   * Voir toutes les demandes en attente
   */
  getPendingRequests(): Observable<{ success: boolean; requests: CollaborationServiceRequest[]; count: number }> {
    return this.http.get<{ success: boolean; requests: CollaborationServiceRequest[]; count: number }>(
      `${this.apiUrl}/admin/pending`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Voir toutes les demandes (avec filtres)
   */
  getAllRequests(type?: string, status?: string): Observable<{ success: boolean; requests: CollaborationServiceRequest[]; count: number }> {
    let url = `${this.apiUrl}/admin/all`;
    const params: string[] = [];
    if (type) params.push(`type=${type}`);
    if (status) params.push(`status=${status}`);
    if (params.length > 0) url += '?' + params.join('&');
    
    return this.http.get<{ success: boolean; requests: CollaborationServiceRequest[]; count: number }>(
      url,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Voir le détail d'une demande (admin)
   */
  getAdminRequestById(requestId: number): Observable<{ success: boolean; request: CollaborationServiceRequest }> {
    return this.http.get<{ success: boolean; request: CollaborationServiceRequest }>(
      `${this.apiUrl}/admin/${requestId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Approuver une demande de modification
   */
  approveEditRequest(requestId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/admin/${requestId}/approve-edit`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Approuver une demande de suppression
   */
  approveDeleteRequest(requestId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/admin/${requestId}/approve-delete`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * ✅ CORRIGÉ : Rejeter une demande de collaboration avec raison
   * @param requestId ID de la demande
   * @param rejectionReason Raison du rejet
   */
  rejectRequest(requestId: number, rejectionReason: string): Observable<any> {
    console.log(`📝 Rejet de la demande collaboration ID: ${requestId} avec raison:`, rejectionReason);
    
    if (!rejectionReason || rejectionReason.trim() === '') {
      return throwError(() => new Error('La raison du rejet est requise'));
    }
    
    // ✅ Corps avec 'rejectionReason' (attendu par le backend - RejectRequestDto)
    const body = { rejectionReason };
    
    return this.http.post(
      `${this.apiUrl}/admin/${requestId}/reject`,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Demande collaboration rejetée avec succès', response);
      }),
      catchError(error => {
        console.error('❌ Erreur lors du rejet de la demande collaboration:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Compter les demandes en attente
   */
  countPendingRequests(): Observable<{ success: boolean; total: number; editRequests: number; deleteRequests: number }> {
    return this.http.get<{ success: boolean; total: number; editRequests: number; deleteRequests: number }>(
      `${this.apiUrl}/admin/count-pending`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtenir des statistiques sur les demandes
   */
  getRequestStatistics(): Observable<{ success: boolean; statistics: any }> {
    return this.http.get<{ success: boolean; statistics: any }>(
      `${this.apiUrl}/admin/statistics`,
      { headers: this.getHeaders() }
    );
  }
}