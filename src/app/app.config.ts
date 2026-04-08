import { ApplicationConfig, importProvidersFrom, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { TokenExpirationService } from './core/services/token-expiration.service';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    TokenExpirationService,
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: () => {
            const http = inject(HttpClient);
            return {
              getTranslation: (lang: string) =>
                http.get(`/assets/i18n/${lang}.json`)
            };
          }
        },
        defaultLanguage: 'en'
      })
    )
  ]
};