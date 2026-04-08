import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; // ← ajouter HttpHeaders, HttpParams
import { Observable } from 'rxjs';
import { StatsSummary } from '../../shared/models/stats.model';
import { RegionStats } from '../../shared/models/region-stats.model';
import { RegistrationBarDTO } from '../../shared/models/RegistrationBarDTO';
import { MonthlyRegistrationDTO } from '../../shared/models/monthly-registration.model';

@Injectable({ providedIn: 'root' })
export class StatsService {

  private apiUrl = 'http://localhost:8089/api/stats';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<StatsSummary> {
    return this.http.get<StatsSummary>(`${this.apiUrl}/summary`);
  }

  getRegionStats(): Observable<RegionStats[]> {
    return this.http.get<RegionStats[]>(`${this.apiUrl}/regions`);
  }

  // ← AJOUTER cette méthode
  getDailyRegistrations(year?: number, month?: number): Observable<RegistrationBarDTO[]> {
    let params = new HttpParams();
    if (year)  params = params.set('year',  year.toString());
    if (month) params = params.set('month', month.toString());

    const token = localStorage.getItem('admin_token'); // ← clé de votre token admin
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<RegistrationBarDTO[]>(
      `${this.apiUrl}/daily`,
      { params, headers }
    );
  }

  getMonthlyRegistrations(months: number = 12): Observable<MonthlyRegistrationDTO[]> {
    let params = new HttpParams().set('months', months.toString());

    const token = localStorage.getItem('admin_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<MonthlyRegistrationDTO[]>(
      `${this.apiUrl}/monthly`,
      { params, headers }
    );
  }

  getMonthOverMonthNotification(): Observable<string> {
    const token = localStorage.getItem('admin_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<string>(
      `${this.apiUrl}/notification`,
      { headers, responseType: 'text' as 'json' }
    );
  }
}