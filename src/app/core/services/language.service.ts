import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root' // Ceci rend le service disponible dans toute l'application
})
export class LanguageService {
  private translate = inject(TranslateService);
  private currentLangSubject = new BehaviorSubject<string>('en');
  
  // Observable que les composants peuvent écouter
  currentLang$ = this.currentLangSubject.asObservable();

  constructor() {
    // Initialiser la langue depuis localStorage
    const savedLang = localStorage.getItem('lang') || 'en';
    this.setLanguage(savedLang);
  }

  setLanguage(lang: string): void {
    // Changer la langue dans ngx-translate
    this.translate.use(lang);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('lang', lang);
    
    // Notifier tous les composants abonnés
    this.currentLangSubject.next(lang);
    
    // Gérer la direction RTL/LTR
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', lang);
    }
  }

  getCurrentLanguage(): string {
    return this.currentLangSubject.value;
  }
}