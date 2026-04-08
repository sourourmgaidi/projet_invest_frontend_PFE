import { Component, HostListener, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/services/language.service';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lang-switcher">
      <button class="lang-btn" (click)="toggleDropdown($event)">
        {{ currentLangLabel() }} <span class="arrow">▾</span>
      </button>
      <ul class="lang-menu" *ngIf="dropdownOpen">
        <li
          *ngFor="let lang of languages"
          (click)="switchLang(lang.code)"
          [class.active]="currentLang === lang.code">
          {{ lang.flag }} {{ lang.label }}
        </li>
      </ul>
    </div>
  `,
 styles: [`
  .lang-switcher {
    position: relative;
    z-index: 1000;
  }

  .lang-btn {
    padding: 8px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 20px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    transition: all 0.2s ease;
    white-space: nowrap;
    font-family: inherit;
  }

  .lang-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .arrow {
    font-size: 10px;
    opacity: 0.5;
  }

  .lang-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    list-style: none;
    margin: 0;
    padding: 6px;
    min-width: 160px;
    z-index: 9999;
    animation: fadeInDown 0.15s ease;
  }

  .lang-menu li {
    padding: 9px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lang-menu li:hover {
    background: #f1f5f9;
  }

  .lang-menu li.active {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: white;
  }

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  [dir="rtl"] .lang-menu {
    right: auto;
    left: 0;
  }

  [dir="rtl"] .arrow {
    margin-left: 0;
    margin-right: 4px;
  }
`]
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  private languageService = inject(LanguageService);
  
  currentLang: string = 'en';
  dropdownOpen: boolean = false;
  private langSubscription: Subscription | null = null;

  languages = [
    { code: 'ar', flag: '🇹🇳', label: 'العربية' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'en', flag: '🇬🇧', label: 'English' }
  ];

  ngOnInit(): void {
    this.langSubscription = this.languageService.currentLang$.subscribe((lang: string) => {
      this.currentLang = lang;
    });
  }

  ngOnDestroy(): void {
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.lang-switcher')) {
      this.dropdownOpen = false;
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  switchLang(lang: string): void {
    this.languageService.setLanguage(lang);
    this.dropdownOpen = false;
  }

  currentLangLabel(): string {
    const lang = this.languages.find(l => l.code === this.currentLang);
    return lang ? `${lang.flag} ${lang.label}` : '';
  }
}