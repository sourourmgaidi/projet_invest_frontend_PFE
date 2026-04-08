import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// ✅ AcquisitionRequest simplifié — plus d'acquirerId/email/role (viennent du JWT)
export interface AcquisitionRequest {
  serviceType: string;
  serviceId: number;
  amount: number;
}

export interface ServiceAcquisition {
  id: number;
  serviceType: string;
  serviceId: number;
  serviceName: string;
  acquirerRole: string;
  acquirerId: number;
  acquirerEmail: string;
  paymentStatus: string;
  paymentUrl: string;
  amount: number;
  orderId: string;
  rejectionReason: string;
  partnerId: number;
  reservationExpiresAt: string;
  acquiredAt: string;
  paidAt: string;
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

  // ✅ Plus d'acquirerId/email/role dans le body — le backend les extrait du JWT
  initiate(body: AcquisitionRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/initiate`, body,
      { headers: this.getHeaders() });
  }

  // ✅ Plus de params acquirerId/role — le backend les extrait du JWT
 getMyServices(): Observable<ServiceAcquisition[]> {
  return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/my-all`, {
    headers: this.getHeaders()
  });
}

  // ✅ Plus d'acquirerId dans le body — le backend l'extrait du JWT
  cancelRequest(acquisitionId: number, reason: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/cancel-request/${acquisitionId}`,
      { reason },
      { headers: this.getHeaders() }
    );
  }

  checkTaken(serviceId: number, serviceType: string): Observable<{ taken: boolean }> {
    return this.http.get<{ taken: boolean }>(`${this.apiUrl}/check`, {
      params: { serviceId: serviceId.toString(), serviceType }
    });
  }

  checkUserAccess(serviceId: number, serviceType: string,
                  userId: number): Observable<{ hasAccess: boolean }> {
    return this.http.get<{ hasAccess: boolean }>(`${this.apiUrl}/access/user`, {
      headers: this.getHeaders(),
      params: {
        serviceId: serviceId.toString(),
        serviceType,
        userId: userId.toString()
      }
    });
  }

  getPartnerPendingRequests(): Observable<ServiceAcquisition[]> {
    return this.http.get<ServiceAcquisition[]>(`${this.apiUrl}/partner/pending`,
      { headers: this.getHeaders() });
  }

  approveRequest(acquisitionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/approve/${acquisitionId}`, {},
      { headers: this.getHeaders() });
  }

  rejectRequest(acquisitionId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/reject/${acquisitionId}`,
      { reason }, { headers: this.getHeaders() });
  }

  deleteAcquisition(invoiceId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${invoiceId}`,
      { headers: this.getHeaders() });
  }
}