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
  payUrl: string;        // ✅ Konnect utilise "payUrl" pas "paymentUrl"
  paymentRef: string;    // ✅ Ajout du paymentRef Konnect
  amount: number;
  description: string;
}

export interface SubscriptionConfirmResult {
  success: boolean;
  subscriberEmail?: string;
  expiresAt?: string;
  daysRemaining?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {

  private apiUrl = 'http://localhost:8089/api/messagerie';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    // ✅ Cherche le token dans localStorage ET sessionStorage
    const token = localStorage.getItem('auth_token')
               || sessionStorage.getItem('auth_token')
               || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Vérifie si l'utilisateur a un abonnement actif.
   */
  checkSubscription(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(
      `${this.apiUrl}/subscription/check`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Initie le paiement Konnect → retourne payUrl + paymentRef.
   */
  initiateSubscription(): Observable<SubscriptionPaymentInit> {
    return this.http.post<SubscriptionPaymentInit>(
      `${this.apiUrl}/subscription/subscribe`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Confirme le paiement après callback Konnect.
   * ✅ Nécessite paymentId + paymentRef (plus transactionId optionnel)
   */
  confirmPayment(
    paymentId: string,
    paymentRef: string,          // ✅ Ajout obligatoire
    transactionId?: string
  ): Observable<SubscriptionConfirmResult> {
    let url = `${this.apiUrl}/subscription/payment-success`
            + `?paymentId=${paymentId}`
            + `&paymentRef=${paymentRef}`;  // ✅ Ajout dans l'URL

    if (transactionId) {
      url += `&transaction_id=${transactionId}`;
    }

    return this.http.get<SubscriptionConfirmResult>(url, {
      headers: this.getHeaders()
    });
  }

  /**
   * Callback si paiement échoué.
   */
  paymentFailed(paymentId?: string): Observable<any> {
    let url = `${this.apiUrl}/subscription/payment-failed`;
    if (paymentId) url += `?paymentId=${paymentId}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }
}