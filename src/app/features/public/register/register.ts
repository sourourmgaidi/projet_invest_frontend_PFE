import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Role, RegisterRequest } from '../../../shared/models/user.model';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

interface RoleOption {
  value: Role;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface Nationality {
  code: string;
  name: string;
}

interface ActivityOption {
  value: string;
  label: string;
  category: string;
}

interface Region {
  value: string;
  label: string;
  governorate: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, TranslateModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  Role = Role;

  step = 1;
  selectedRole: Role | null = null;
  loading = false;
  errorMsg = '';
  successMsg = '';
  showPassword = false;
  confirmPassword = '';
  phoneError = '';
  emailError = '';
  websiteError = '';
  linkedinError = '';
  businessRegError = '';
  taxNumberError = '';
  siretError = '';

  form: RegisterRequest = {
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    role: Role.INVESTOR,
    actif: true,
    dateInscription: new Date().toISOString(),
    telephone: '',
    nationality: '',
    investmentBudget: undefined,
    companyName: '',
    secteurActivite: '',
    region: '',
    adresse: '',
    paysOrigine: '',
    siret: '',
    numeroRegistreCommerce: '',
    taxeProfessionnelle: '',
    siteWeb: '',
    description: '',
    linkedinProfile: '',
    interetPrincipal: ''
  };

  countryCodes: CountryCode[] = [
    { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
    { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
    { code: 'LY', name: 'Libya', dialCode: '+218', flag: '🇱🇾' },
    { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
    { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
    { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
    { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
    { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
    { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
    { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
    { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
    { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  ];

  nationalities: Nationality[] = [
    { code: 'TN', name: 'Tunisian' },
    { code: 'FR', name: 'French' },
    { code: 'DZ', name: 'Algerian' },
    { code: 'MA', name: 'Moroccan' },
    { code: 'LY', name: 'Libyan' },
    { code: 'EG', name: 'Egyptian' },
    { code: 'SA', name: 'Saudi' },
    { code: 'AE', name: 'Emirati' },
    { code: 'QA', name: 'Qatari' },
    { code: 'KW', name: 'Kuwaiti' },
    { code: 'US', name: 'American' },
    { code: 'GB', name: 'British' },
    { code: 'DE', name: 'German' },
    { code: 'IT', name: 'Italian' },
    { code: 'ES', name: 'Spanish' },
    { code: 'BE', name: 'Belgian' },
    { code: 'CH', name: 'Swiss' },
    { code: 'NL', name: 'Dutch' },
    { code: 'SE', name: 'Swedish' },
    { code: 'NO', name: 'Norwegian' },
    { code: 'DK', name: 'Danish' },
    { code: 'FI', name: 'Finnish' },
    { code: 'RU', name: 'Russian' },
    { code: 'CN', name: 'Chinese' },
    { code: 'JP', name: 'Japanese' },
    { code: 'KR', name: 'South Korean' },
    { code: 'IN', name: 'Indian' },
    { code: 'BR', name: 'Brazilian' },
    { code: 'CA', name: 'Canadian' },
    { code: 'AU', name: 'Australian' },
  ];

  tunisianRegions: Region[] = [
    { value: 'TUNIS', label: 'Tunis', governorate: 'Tunis' },
    { value: 'ARIANA', label: 'Ariana', governorate: 'Ariana' },
    { value: 'BEN_AROUS', label: 'Ben Arous', governorate: 'Ben Arous' },
    { value: 'MANOUBA', label: 'Manouba', governorate: 'Manouba' },
    { value: 'NABEUL', label: 'Nabeul', governorate: 'Nabeul' },
    { value: 'ZAGHOUAN', label: 'Zaghouan', governorate: 'Zaghouan' },
    { value: 'BIZERTE', label: 'Bizerte', governorate: 'Bizerte' },
    { value: 'BEJA', label: 'Béja', governorate: 'Béja' },
    { value: 'JENDOUBA', label: 'Jendouba', governorate: 'Jendouba' },
    { value: 'KEF', label: 'Le Kef', governorate: 'Le Kef' },
    { value: 'SILIANA', label: 'Siliana', governorate: 'Siliana' },
    { value: 'SOUSSE', label: 'Sousse', governorate: 'Sousse' },
    { value: 'MONASTIR', label: 'Monastir', governorate: 'Monastir' },
    { value: 'MAHDIA', label: 'Mahdia', governorate: 'Mahdia' },
    { value: 'KAIROUAN', label: 'Kairouan', governorate: 'Kairouan' },
    { value: 'KASSERINE', label: 'Kasserine', governorate: 'Kasserine' },
    { value: 'SIDI_BOUZID', label: 'Sidi Bouzid', governorate: 'Sidi Bouzid' },
    { value: 'GAFSA', label: 'Gafsa', governorate: 'Gafsa' },
    { value: 'TOZEUR', label: 'Tozeur', governorate: 'Tozeur' },
    { value: 'KEBILI', label: 'Kebili', governorate: 'Kebili' },
    { value: 'GABES', label: 'Gabès', governorate: 'Gabès' },
    { value: 'MEDENINE', label: 'Médenine', governorate: 'Médenine' },
    { value: 'TATAOUINE', label: 'Tataouine', governorate: 'Tataouine' },
    { value: 'DOUZ', label: 'Douz', governorate: 'Kebili' },
    { value: 'HAMMAMET', label: 'Hammamet', governorate: 'Nabeul' },
    { value: 'DJERBA', label: 'Djerba', governorate: 'Médenine' },
    { value: 'ZARZIS', label: 'Zarzis', governorate: 'Médenine' },
  ];

  activitySectors: ActivityOption[] = [
    { value: 'HOTEL', label: 'Hotel', category: 'Tourism' },
    { value: 'GUEST_HOUSE', label: 'Guest House', category: 'Tourism' },
    { value: 'TRAVEL_AGENCY', label: 'Travel Agency', category: 'Tourism' },
    { value: 'TOUR_GUIDE', label: 'Tour Guide', category: 'Tourism' },
    { value: 'TRANSPORT', label: 'Transport', category: 'Tourism' },
    { value: 'RESTAURANT', label: 'Restaurant', category: 'Tourism' },
    { value: 'CRAFTS', label: 'Crafts', category: 'Tourism' },
    { value: 'AGRICULTURE', label: 'Agriculture', category: 'Investment' },
    { value: 'AGRI_FOOD', label: 'Agri-food', category: 'Investment' },
    { value: 'INDUSTRY', label: 'Industry', category: 'Investment' },
    { value: 'MANUFACTURING', label: 'Manufacturing', category: 'Investment' },
    { value: 'TEXTILE', label: 'Textile', category: 'Investment' },
    { value: 'ENERGY', label: 'Energy', category: 'Investment' },
    { value: 'RENEWABLE_ENERGY', label: 'Renewable Energy', category: 'Investment' },
    { value: 'TECHNOLOGY', label: 'Technology', category: 'Investment' },
    { value: 'IT', label: 'IT Services', category: 'Investment' },
    { value: 'REAL_ESTATE', label: 'Real Estate', category: 'Investment' },
    { value: 'CONSTRUCTION', label: 'Construction', category: 'Investment' },
    { value: 'TRADE', label: 'Trade', category: 'Investment' },
    { value: 'SERVICES', label: 'Services', category: 'Investment' },
    { value: 'OTHER', label: 'Other', category: 'Other' }
  ];

  selectedCountryCode: string = '+216';
  phoneNumber: string = '';

  roles: RoleOption[] = [
    { value: Role.TOURIST, label: 'Tourist', icon: '✈️', color: '#4A90E2', description: 'Explore Tunisia' },
    { value: Role.INVESTOR, label: 'Investor', icon: '💼', color: '#27AE60', description: 'Invest in Tunisia' },
    { value: Role.PARTNER, label: 'Economic Partner', icon: '🤝', color: '#F39C12', description: 'Develop partnerships' },
    { value: Role.LOCAL_PARTNER, label: 'Local Partner', icon: '🏘️', color: '#9B59B6', description: 'Local development' },
    { value: Role.INTERNATIONAL_COMPANY, label: 'International Company', icon: '🌍', color: '#E74C3C', description: 'International presence' },
  ];

  private roleEndpoints: { [key in Role]: string } = {
    [Role.TOURIST]: 'http://localhost:8089/api/touristes/register',
    [Role.INVESTOR]: 'http://localhost:8089/api/auth/register',
    [Role.PARTNER]: 'http://localhost:8089/api/partenaires-economiques/register',
    [Role.LOCAL_PARTNER]: 'http://localhost:8089/api/partenaires-locaux/register',
    [Role.INTERNATIONAL_COMPANY]: 'http://localhost:8089/api/international-companies/register',
    [Role.ADMIN]: 'http://localhost:8089/api/admin/register',
  };

  constructor(private router: Router, private http: HttpClient) {}

  goToHome(): void {
    this.router.navigate(['/']);
  }

  selectRole(role: Role) {
    this.selectedRole = role;
    this.form.role = role;
    this.form.secteurActivite = '';
  }

  goToStep2() {
    if (!this.selectedRole) {
      this.errorMsg = 'Please choose a role.';
      return;
    }
    this.errorMsg = '';
    this.step = 2;
  }

  goBack() {
    this.step = 1;
    this.errorMsg = '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  getSelectedRoleInfo(): RoleOption | undefined {
    return this.roles.find(r => r.value === this.selectedRole);
  }

  passwordsMatch(): boolean {
    return this.form.motDePasse === this.confirmPassword;
  }

  getActivityCategories(): string[] {
    const categories = new Set(this.activitySectors.map(s => s.category));
    return Array.from(categories);
  }

  getSectorsByCategory(category: string): ActivityOption[] {
    return this.activitySectors.filter(s => s.category === category);
  }

  validateGmail(email: string): boolean {
    if (!email) return false;
    const domain = email.substring(email.indexOf('@') + 1).toLowerCase();
    const gmailDomains = [
      'gmail.com', 'googlemail.com', 'gmail.co.uk', 'gmail.fr',
      'gmail.de', 'gmail.it', 'gmail.es', 'gmail.ca', 'gmail.com.au', 'gmail.co.in'
    ];
    return gmailDomains.includes(domain);
  }

  validateEmail(): boolean {
    if (!this.form.email || this.form.email.trim() === '') {
      this.emailError = 'Email is required';
      return false;
    }
    if (!this.validateGmail(this.form.email)) {
      this.emailError = 'Only Gmail addresses are allowed (e.g., @gmail.com, @gmail.fr, etc.)';
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.emailError = 'Invalid email format';
      return false;
    }
    this.emailError = '';
    return true;
  }

  validatePhoneNumber(): boolean {
    if (!this.phoneNumber || this.phoneNumber.trim() === '') {
      this.phoneError = 'Phone number is required';
      return false;
    }
    const digitsOnly = this.phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length === 0) {
      this.phoneError = 'Phone number must contain only digits';
      return false;
    }
    const phoneLengthByDialCode: { [key: string]: number } = {
      '+216': 8,  '+33': 9,   '+213': 9,  '+212': 9,  '+218': 9,
      '+20': 10,  '+966': 9,  '+971': 9,  '+974': 8,  '+965': 8,
      '+1': 10,   '+44': 10,  '+49': 10,  '+39': 10,  '+34': 9,
      '+32': 9,   '+41': 9,   '+31': 9,   '+46': 9,   '+47': 8,
      '+45': 8,   '+358': 9,  '+7': 10,   '+86': 11,  '+81': 10,
      '+82': 10,  '+91': 10,  '+55': 11,  '+61': 9
    };
    const expectedLength = phoneLengthByDialCode[this.selectedCountryCode];
    if (expectedLength !== undefined && digitsOnly.length !== expectedLength) {
      this.phoneError = `Phone number for ${this.selectedCountryCode} must have exactly ${expectedLength} digits (got ${digitsOnly.length}).`;
      return false;
    }
    if (expectedLength === undefined) {
      if (digitsOnly.length < 8) {
        this.phoneError = 'Phone number must have at least 8 digits';
        return false;
      }
      if (digitsOnly.length > 15) {
        this.phoneError = 'Phone number must not exceed 15 digits';
        return false;
      }
    }
    this.phoneError = '';
    return true;
  }

  validateWebsite(url: string): boolean {
    if (!url || url.trim() === '') return true;
    const urlPattern = /^(https?:\/\/)([\w\-]+\.)+[\w]{2,}(\/.*)?$/;
    return urlPattern.test(url.trim());
  }

  validateLinkedin(url: string): boolean {
    if (!url || url.trim() === '') return true;
    const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w\-]+\/?$/;
    return linkedinPattern.test(url.trim());
  }

  // ✅ Méthodes appelées depuis le HTML sur (blur)
  onWebsiteBlur(): void {
    this.websiteError = (this.form.siteWeb && !this.validateWebsite(this.form.siteWeb))
      ? 'Invalid website URL. Expected: https://www.example.com'
      : '';
  }

  onLinkedinBlur(): void {
    this.linkedinError = (this.form.linkedinProfile && !this.validateLinkedin(this.form.linkedinProfile))
      ? 'Invalid LinkedIn URL. Expected: https://www.linkedin.com/in/your-profile'
      : '';
  }

  updatePhoneNumber(): void {
    if (this.phoneNumber) {
      const digitsOnly = this.phoneNumber.replace(/\D/g, '');
      this.form.telephone = this.selectedCountryCode + digitsOnly;
      this.phoneNumber = digitsOnly;
      this.validatePhoneNumber();
    } else {
      this.form.telephone = '';
    }
  }

  onPhoneInput(event: any): void {
    const input = event.target;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.phoneNumber = input.value;
    this.updatePhoneNumber();
  }

  onEmailInput(): void {
    this.validateEmail();
  }

  prepareUserData(): any {
    const userData: any = {
      email: this.form.email,
      password: this.form.motDePasse,
      role: this.form.role
    };

    switch (this.selectedRole) {
      case Role.TOURIST:
        userData.lastName = this.form.nom;
        userData.firstName = this.form.prenom;
        userData.phone = this.form.telephone;
        userData.nationality = this.form.nationality;
        break;
      case Role.INVESTOR:
        userData.firstName = this.form.prenom;
        userData.lastName = this.form.nom;
        userData.phone = this.form.telephone;
        userData.nationality = this.form.nationality;
        userData.company = this.form.companyName;
        userData.activitySector = this.form.secteurActivite;
        userData.originCountry = this.form.paysOrigine;
        userData.website = this.form.siteWeb;
        userData.linkedinProfile = this.form.linkedinProfile;
        break;
      case Role.PARTNER:
        userData.firstName = this.form.prenom;
        userData.lastName = this.form.nom;
        userData.phone = this.form.telephone;
        userData.businessSector = this.form.secteurActivite;
        userData.countryOfOrigin = this.form.paysOrigine;
        userData.headquartersAddress = this.form.adresse;
        userData.website = this.form.siteWeb;
        userData.linkedinProfile = this.form.linkedinProfile;
        break;
      case Role.LOCAL_PARTNER:
        userData.firstName = this.form.prenom;
        userData.lastName = this.form.nom;
        userData.telephone = this.form.telephone;
        userData.domaineActivite = this.form.secteurActivite;
        userData.region = this.form.region;
        userData.adresse = this.form.adresse;
        userData.siteWeb = this.form.siteWeb;
        userData.numeroRegistreCommerce = this.form.numeroRegistreCommerce;
        userData.taxeProfessionnelle = this.form.taxeProfessionnelle;
        userData.linkedinProfile = this.form.linkedinProfile;
        break;
      case Role.INTERNATIONAL_COMPANY:
        userData.companyName = this.form.companyName;
        userData.originCountry = this.form.paysOrigine;
        userData.siret = this.form.siret;
        userData.website = this.form.siteWeb;
        userData.phone = this.form.telephone;
        userData.contactLastName = this.form.nom;
        userData.contactFirstName = this.form.prenom;
        userData.activitySector = this.form.secteurActivite;
        userData.linkedinProfile = this.form.linkedinProfile;
        break;
      case Role.ADMIN:
        userData.firstName = this.form.prenom;
        userData.lastName = this.form.nom;
        userData.phone = this.form.telephone;
        break;
    }
    return userData;
  }

  async onSubmit() {
    if (!this.selectedRole) {
      this.errorMsg = 'Please choose a role.';
      return;
    }
    if (!this.validateEmail()) {
      this.errorMsg = this.emailError;
      return;
    }
    if (!this.validateRequiredFields()) {
      return;
    }
    if (!this.validatePhoneNumber()) {
      this.errorMsg = this.phoneError;
      return;
    }
    if (this.form.motDePasse !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }

    // ✅ Validation website et linkedin pour TOUS les rôles avant soumission
    if (this.form.siteWeb && !this.validateWebsite(this.form.siteWeb)) {
      this.websiteError = 'Invalid website URL. Expected format: https://www.example.com';
      this.errorMsg = this.websiteError;
      return;
    }
    if (this.form.linkedinProfile && !this.validateLinkedin(this.form.linkedinProfile)) {
      this.linkedinError = 'Invalid LinkedIn URL. Expected format: https://www.linkedin.com/in/your-profile';
      this.errorMsg = this.linkedinError;
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const url = this.roleEndpoints[this.selectedRole];
      const userData = this.prepareUserData();
      const response = await lastValueFrom(this.http.post(url, userData));
      this.loading = false;
      this.successMsg = 'Registration successful! Redirecting to login...';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (error: any) {
      this.loading = false;
      if (error.error) {
        if (typeof error.error === 'string') {
          this.errorMsg = error.error;
        } else if (error.error.error) {
          this.errorMsg = error.error.error;
        } else if (error.error.message) {
          this.errorMsg = error.error.message;
        } else {
          this.errorMsg = 'Registration error: ' + JSON.stringify(error.error);
        }
      } else if (error.message) {
        this.errorMsg = error.message;
      } else {
        this.errorMsg = 'Registration error. Check server connection.';
      }
    } finally {
      this.loading = false;
    }
  }

validateRequiredFields(): boolean {
  if (!this.form.email) {
    this.errorMsg = 'Email is required.';
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.form.email)) {
    this.errorMsg = 'Invalid email format.';
    return false;
  }

  if (!this.form.motDePasse) {
    this.errorMsg = 'Password is required.';
    return false;
  }
  if (this.form.motDePasse.length < 6) {
    this.errorMsg = 'Password must be at least 6 characters.';
    return false;
  }

  //  Validation website et linkedin pour TOUS les rôles
  if (this.form.siteWeb && !this.validateWebsite(this.form.siteWeb)) {
    this.websiteError = 'Invalid website URL. Expected format: https://www.example.com';
    this.errorMsg = this.websiteError;
    return false;
  }
  if (this.form.linkedinProfile && !this.validateLinkedin(this.form.linkedinProfile)) {
    this.linkedinError = 'Invalid LinkedIn URL. Expected format: https://www.linkedin.com/in/your-profile';
    this.errorMsg = this.linkedinError;
    return false;
  }

  switch (this.selectedRole) {
    case Role.TOURIST:
      if (!this.form.nom || !this.form.prenom) {
        this.errorMsg = 'Last name and first name are required.';
        return false;
      }

      break;

    case Role.INVESTOR:
      if (!this.form.nom || !this.form.prenom) {
        this.errorMsg = 'Last name and first name are required.';
        return false;
      }
      if (!this.form.companyName) {
        this.errorMsg = 'Company name is required.';
        return false;
      }
      if (this.form.companyName.trim().length < 2 || this.form.companyName.trim().length > 100) {
        this.errorMsg = 'Company name must be between 2 and 100 characters.';
        return false;
      }
      if (!this.form.paysOrigine) {
        this.errorMsg = 'Country of origin is required.';
        return false;
      }
      if (!this.form.secteurActivite) {
        this.errorMsg = 'Activity sector is required.';
        return false;
      }
      if (this.form.nationality) {
        if (this.form.nationality.trim().length < 2 || this.form.nationality.trim().length > 60) {
          this.errorMsg = 'Nationality must be between 2 and 60 characters.';
          return false;
        }
      }
      //  website et linkedin déjà validés
      break;

    case Role.PARTNER:
      if (!this.form.nom || !this.form.prenom) {
        this.errorMsg = 'Last name and first name are required.';
        return false;
      }
      if (!this.form.paysOrigine) {
        this.errorMsg = 'Country of origin is required.';
        return false;
      }
      if (!this.form.secteurActivite) {
        this.errorMsg = 'Business sector is required.';
        return false;
      }
      //  website et linkedin déjà validés
      break;

    case Role.LOCAL_PARTNER:
      if (!this.form.nom || !this.form.prenom) {
        this.errorMsg = 'Last name and first name are required.';
        return false;
      }
      if (!this.form.telephone) {
        this.errorMsg = 'Phone number is required.';
        return false;
      }
      if (!this.validateBusinessRegistrationNumber()) {
    this.errorMsg = this.businessRegError;
    return false;
  }
  if (!this.validateTaxNumber()) {
    this.errorMsg = this.taxNumberError;
    return false;
  }
      break;

    case Role.INTERNATIONAL_COMPANY:
      if (!this.form.companyName) {
        this.errorMsg = 'Company name is required.';
        return false;
      }
      if (!this.form.nom || !this.form.prenom) {
        this.errorMsg = 'Contact last name and first name are required.';
        return false;
      }
      if (!this.validateSiret()) {
    this.errorMsg = this.siretError;
    return false;
  }
      if (!this.form.telephone) {
        this.errorMsg = 'Phone number is required.';
        return false;
      }
      if (!this.form.paysOrigine) {
        this.errorMsg = 'Country of origin is required.';
        return false;
      }
      if (!this.form.secteurActivite) {
        this.errorMsg = 'Activity sector is required.';
        return false;
      }

  
      break;
  }

  return true;
}
// Ajoutez ces méthodes après validateLinkedin() (vers ligne 520)

// Validation Business Registration Number (numéro registre commerce)
validateBusinessRegistrationNumber(): boolean {
  const value = this.form.numeroRegistreCommerce;
  
  // Champ optionnel
  if (!value || value.trim() === '') {
    this.businessRegError = '';
    return true;
  }
  
  const trimmed = value.trim();
  
  // Longueur : 3 à 30 caractères
  if (trimmed.length < 3) {
    this.businessRegError = 'Business registration number must be at least 3 characters';
    return false;
  }
  if (trimmed.length > 30) {
    this.businessRegError = 'Business registration number must not exceed 30 characters';
    return false;
  }
  
  // Format : lettres majuscules, chiffres, tirets
  const regex = /^[A-Z0-9\-]+$/;
  if (!regex.test(trimmed)) {
    this.businessRegError = 'Business registration number can only contain uppercase letters, numbers, and hyphens';
    return false;
  }
  
  this.businessRegError = '';
  return true;
}

// Validation Professional Tax Number (numéro taxe professionnelle)
validateTaxNumber(): boolean {
  const value = this.form.taxeProfessionnelle;
  
  // Champ optionnel
  if (!value || value.trim() === '') {
    this.taxNumberError = '';
    return true;
  }
  
  const trimmed = value.trim();
  
  // Longueur : 5 à 25 caractères
  if (trimmed.length < 5) {
    this.taxNumberError = 'Professional tax number must be at least 5 characters';
    return false;
  }
  if (trimmed.length > 25) {
    this.taxNumberError = 'Professional tax number must not exceed 25 characters';
    return false;
  }
  
  // Format : lettres majuscules, chiffres, tirets
  const regex = /^[A-Z0-9\-]+$/;
  if (!regex.test(trimmed)) {
    this.taxNumberError = 'Professional tax number can only contain uppercase letters, numbers, and hyphens';
    return false;
  }
  
  this.taxNumberError = '';
  return true;
}

// Méthodes appelées depuis le HTML (blur)
onBusinessRegBlur(): void {
  this.validateBusinessRegistrationNumber();
}

onTaxNumberBlur(): void {
  this.validateTaxNumber();
}
// Ajoutez cette méthode après validateTaxNumber() (vers ligne 650)

// Validation SIRET (14 chiffres exactement)
validateSiret(): boolean {
  const value = this.form.siret;
  
  // Champ obligatoire pour INTERNATIONAL_COMPANY
  if (!value || value.trim() === '') {
    this.siretError = 'SIRET number is required';
    return false;
  }
  
  const trimmed = value.trim();
  
  // Le SIRET doit contenir exactement 14 chiffres
  const siretRegex = /^\d{14}$/;
  if (!siretRegex.test(trimmed)) {
    this.siretError = 'SIRET number must be exactly 14 digits';
    return false;
  }
  
  this.siretError = '';
  return true;
}

// Méthode appelée depuis le HTML (blur)
onSiretBlur(): void {
  this.validateSiret();
}
}