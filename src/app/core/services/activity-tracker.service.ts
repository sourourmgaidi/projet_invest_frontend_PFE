import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export type ActivityType =
  | 'LOGIN'
  | 'SERVICE_VIEWED'
  | 'SERVICE_REQUESTED'
  | 'FAVORITE_ADDED'
  | 'MESSAGE_SENT'
  | 'PAYMENT_COMPLETED';

@Injectable({ providedIn: 'root' })
export class ActivityTrackerService {

  private apiUrl = 'http://localhost:8089/api/activity/track';
  private http = inject(HttpClient);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  track(type: ActivityType): void {
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const role = localStorage.getItem('user_role') || '';
    if (!userInfo.id || !role) return;

    this.http.post(this.apiUrl, {
      userId: userInfo.id.toString(),
      role,
      type
    }, { headers: this.getHeaders() }).subscribe({
      error: () => {} // Silencieux — ne pas bloquer l'UX
    });
  }
}