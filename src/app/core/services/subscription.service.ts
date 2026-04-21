import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  expiresAt?: string;
  daysRemaining?: number;
  requiresPayment?: boolean;
  amount?: number;
  currency?: string;
}

export interface SubscriptionPaymentInit {
  paymentId: string;
  paymentUrl: string;
  amount: number;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {

  private apiUrl = 'http://localhost:8089/api/messagerie';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Vérifie si l'utilisateur connecté a un abonnement actif.
   */
  checkSubscription(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(
      `${this.apiUrl}/subscription/check`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Initie le paiement de l'abonnement mensuel (40 TND).
   * Retourne l'URL de paiement Flouci.
   */
  initiateSubscription(): Observable<SubscriptionPaymentInit> {
    return this.http.post<SubscriptionPaymentInit>(
      `${this.apiUrl}/subscription/subscribe`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Callback appelé par Flouci après le paiement.
   * À appeler depuis SubscriptionSuccessComponent.
   */
 // subscription.service.ts
confirmPayment(paymentId: string, transactionId?: string): Observable<any> {
  // ✅ Priorité à sessionStorage si localStorage est vide
  let token = localStorage.getItem('auth_token');
  if (!token) {
    token = sessionStorage.getItem('auth_token');
  }
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json'
  });
  
  let url = `${this.apiUrl}/subscription/payment-success?paymentId=${paymentId}`;
  if (transactionId) url += `&transaction_id=${transactionId}`;
  return this.http.get(url, { headers });
}
}