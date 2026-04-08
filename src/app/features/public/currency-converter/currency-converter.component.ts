import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyService, ConversionResult } from '../../../core/services/currency.service';

@Component({
  selector: 'app-currency-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './currency-converter.component.html',
  styleUrls: ['./currency-converter.component.css']
})
export class CurrencyConverterComponent implements OnInit, OnChanges {

  @Input() initialAmount: number = 0;
  @Input() initialCurrency: string = 'TND';

  amount: number = 0;
  fromCurrency: string = 'TND';
  toCurrency: string = 'EUR';

  result: ConversionResult | null = null;
  loading = false;
  error = '';

  // ✅ Déclaration sans initialisation immédiate
  currencies: { code: string; symbol: string; flag: string; name: string }[] = [];

  constructor(private currencyService: CurrencyService) {}

  ngOnInit(): void {
    // ✅ Initialisation ici, après injection du service
    this.currencies = this.currencyService.currencies;
    this.amount = this.initialAmount;
    this.fromCurrency = this.initialCurrency;
    if (this.amount > 0) this.convert();
  }

  ngOnChanges(): void {
    this.amount = this.initialAmount;
    this.fromCurrency = this.initialCurrency;
    if (this.amount > 0) this.convert();
  }

  convert(): void {
    if (!this.amount || this.amount <= 0) {
      this.error = 'Please enter a valid amount.';
      return;
    }
    if (this.fromCurrency === this.toCurrency) {
      this.result = {
        from: this.fromCurrency,
        to: this.toCurrency,
        originalAmount: this.amount,
        convertedAmount: this.amount,
        rate: 1
      };
      return;
    }

    this.loading = true;
    this.error = '';
    this.result = null;

    this.currencyService.convert(this.amount, this.fromCurrency, this.toCurrency).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Conversion failed. Please try again.';
        this.loading = false;
      }
    });
  }

  swap(): void {
    [this.fromCurrency, this.toCurrency] = [this.toCurrency, this.fromCurrency];
    if (this.result) {
      this.amount = this.result.convertedAmount;
    }
    this.convert();
  }

  getSymbol(code: string): string {
    return this.currencyService.getSymbol(code);
  }
}