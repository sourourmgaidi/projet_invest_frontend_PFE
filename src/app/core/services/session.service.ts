// src/app/core/services/session.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserStats, UserStatsList } from '../../shared/models/session.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = 'http://localhost:8089/api/sessions';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  startSession(): Observable<any> {
    return this.http.post(`${this.apiUrl}/start`, {}, {
      headers: this.getHeaders()
    });
  }

  endSession(): Observable<any> {
    return this.http.post(`${this.apiUrl}/end`, {}, {
      headers: this.getHeaders()
    });
  }

  // ✅ CORRIGÉ : retourne Observable
  endSessionByEmail(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/end-by-email`, { email });
  }

  getMyStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/my-stats`, {
      headers: this.getHeaders()
    });
  }

  getAllUsersStats(): Observable<UserStatsList[]> {
    return this.http.get<UserStatsList[]>(`${this.apiUrl}/all-users`, {
      headers: this.getHeaders()
    });
  }
}