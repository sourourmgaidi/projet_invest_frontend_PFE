import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConversionResult {
  from: string;
  to: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {

  private apiUrl = 'http://localhost:8089/api/currency';

  readonly currencies = [
    { code: 'TND', symbol: 'DT', flag: '🇹🇳', name: 'Dinar Tunisien' },
    { code: 'EUR', symbol: '€',  flag: '🇪🇺', name: 'Euro'           },
    { code: 'USD', symbol: '$',  flag: '🇺🇸', name: 'Dollar US'      },
    { code: 'GBP', symbol: '£',  flag: '🇬🇧', name: 'Livre Sterling' },
  ];

  constructor(private http: HttpClient) {}

  convert(amount: number, from: string, to: string): Observable<ConversionResult> {
    return this.http.get<ConversionResult>(`${this.apiUrl}/convert`, {
      params: { amount: amount.toString(), from, to }
    });
  }

  getSymbol(code: string): string {
    return this.currencies.find(c => c.code === code)?.symbol || code;
  }
}