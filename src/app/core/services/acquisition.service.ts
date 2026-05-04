import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AcquisitionRequest {
  serviceType: string;
  serviceId: number;
  amount: number;
}

export interface TouristAcquisitionRequest {
  serviceId: number;
  amount: number;
}

export interface ServiceAcquisition {
  id: number;
  serviceType: string;           // "INVESTMENT", "COLLABORATION" ou "TOURIST"
  serviceId: number;
  serviceName: string;
  acquirerRole: string;          // "INVESTOR", "INTERNATIONAL_COMPANY", "TOURIST"
  acquirerId: number;
  acquirerEmail: string;
  paymentStatus: string;         // "PENDING_PARTNER_APPROVAL", "AWAITING_VALIDATION", "COMPLETED", "CANCELLED", "PARTNER_REJECTED"
  amount: number;
  orderId: string;
  rejectionReason: string | null;
  partnerId: number;
  reservationExpiresAt: string | null;
  acquiredAt: string | null;
  paidAt: string | null;
  approvedAt: string | null;
  reminderSent: boolean;

  // Pour l'UI uniquement (optionnels)
  serviceDetails?: any;
  detailsLoading?: boolean;
  cancelLoading?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AcquisitionService {

  private apiUrl = 'http://localhost:8089/api/acquisitions';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── USER (INVESTOR / INTERNATIONAL_COMPANY / PARTNER) ──────────────────

  /** Soumettre une demande d'acquisition */
  initiate(body: AcquisitionRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/initiate`, body, {
      headers: this.getHeaders()
    });
  }

  /** Toutes les acquisitions de l'utilisateur (tous statuts) */
  getMyAllAcquisitions(): Observable<ServiceAcquisition[]> {
    return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/my-all`, {
      headers: this.getHeaders()
    });
  }

  /** Uniquement les acquisitions COMPLETED */
  getMyCompletedServices(): Observable<ServiceAcquisition[]> {
    return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/my-services`, {
      headers: this.getHeaders()
    });
  }

  /** Annuler une demande en attente */
  cancelRequest(acquisitionId: number, reason: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/cancel-request/${acquisitionId}`,
      { reason },
      { headers: this.getHeaders() }
    );
  }

  // ─── TOURIST ────────────────────────────────────────────────────────────

  /** Touriste: Soumettre une demande d'acquisition d'un service touristique */
  touristInitiate(body: TouristAcquisitionRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/tourist/initiate`, body, {
      headers: this.getHeaders()
    });
  }

  /** Touriste: Voir ses services acquis (COMPLETED uniquement) */
  getTouristMyServices(): Observable<ServiceAcquisition[]> {
    return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/tourist/my-services`, {
      headers: this.getHeaders()
    });
  }

  /** Touriste: Voir toutes ses demandes (tous statuts) */
  getTouristMyAll(): Observable<ServiceAcquisition[]> {
    return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/tourist/my-all`, {
      headers: this.getHeaders()
    });
  }

  // ─── PARTNER ────────────────────────────────────────────────────────────

  /** Demandes en attente d'approbation (PENDING) */
  getPartnerPendingRequests(): Observable<ServiceAcquisition[]> {
    return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/partner/pending`, {
      headers: this.getHeaders()
    });
  }

  /** Approuver une demande → passe en RESERVED */
  approveRequest(acquisitionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/approve/${acquisitionId}`, {}, {
      headers: this.getHeaders()
    });
  }

  /** Refuser une demande */
  rejectRequest(acquisitionId: number, reason: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/partner/reject/${acquisitionId}`,
      { reason },
      { headers: this.getHeaders() }
    );
  }

  /** Demandes en attente de validation du paiement (AWAITING_VALIDATION) */
  getPartnerAwaitingValidation(): Observable<ServiceAcquisition[]> {
    return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/partner/awaiting-validation`, {
      headers: this.getHeaders()
    });
  }

  /** Valider le paiement reçu → passe en COMPLETED */
  validatePayment(acquisitionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/validate/${acquisitionId}`, {}, {
      headers: this.getHeaders()
    });
  }

  // ─── VÉRIFICATIONS ──────────────────────────────────────────────────────

  /** Vérifier si un service est déjà pris */
  checkTaken(serviceId: number, serviceType: string): Observable<{ taken: boolean }> {
    return this.http.get<{ taken: boolean }>(`${this.apiUrl}/check`, {
      params: { serviceId: serviceId.toString(), serviceType }
    });
  }

  /** Vérifier si un utilisateur a accès à un service */
  checkUserAccess(
    serviceId: number,
    serviceType: string,
    userId: number
  ): Observable<{ hasAccess: boolean }> {
    return this.http.get<{ hasAccess: boolean }>(`${this.apiUrl}/access/user`, {
      headers: this.getHeaders(),
      params: {
        serviceId: serviceId.toString(),
        serviceType,
        userId: userId.toString()
      }
    });
  }

  /** Vérifier si un partenaire a accès à un service */
  checkPartnerAccess(
    serviceId: number,
    serviceType: string,
    partnerId: number
  ): Observable<{ hasAccess: boolean }> {
    return this.http.get<{ hasAccess: boolean }>(`${this.apiUrl}/access/partner`, {
      headers: this.getHeaders(),
      params: {
        serviceId: serviceId.toString(),
        serviceType,
        partnerId: partnerId.toString()
      }
    });
  }

  // ─── ADMIN ──────────────────────────────────────────────────────────────

  /** Supprimer une acquisition */
  deleteAcquisition(acquisitionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${acquisitionId}`, {
      headers: this.getHeaders()
    });
  }
}