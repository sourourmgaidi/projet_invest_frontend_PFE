import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { UserProfile } from '../../shared/models/profile.model';
import { Role } from '../../shared/models/user.model';

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface ActivityOption {
  value: string;
  label: string;
  category: string;
}

// Interface pour nationalité
interface Nationality {
  code: string;
  name: string;
}

// Interface pour région (comme dans register.ts)
interface Region {
  value: string;
  label: string;
  governorate: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  Role = Role;
  profile: UserProfile | null = null;
  editData: any = {};
  loading = true;
  saving = false;
  uploadingPhoto = false;
  error = '';
  success = '';
  isEditing = false;
  isEditingEmail = false;
  userRole: string = '';
  phoneNumber: string = '';
  selectedCountryCode: string = '+216';
  phoneError: string = '';
  newEmail: string = '';
  emailError: string = '';
businessRegError = '';
taxNumberError = '';
siretError = '';

  
  // Propriétés pour la photo
  selectedFile: File | null = null;
  photoPreview: string | null = null;

  // Propriétés pour la suppression de compte
  showDeleteModal: boolean = false;
  deletePassword: string = '';
  deleteError: string = '';
  deleting: boolean = false;

  // Liste des codes pays
  countryCodes: CountryCode[] = [
    { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
    { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  ];

  // Liste des pays (pour Country of Origin)
  countries: { name: string, flag: string }[] = [
    { name: 'Tunisia', flag: '🇹🇳' },
    { name: 'France', flag: '🇫🇷' },
    { name: 'Algeria', flag: '🇩🇿' },
    { name: 'Morocco', flag: '🇲🇦' },
    { name: 'United States', flag: '🇺🇸' },
    { name: 'United Kingdom', flag: '🇬🇧' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Italy', flag: '🇮🇹' },
    { name: 'Spain', flag: '🇪🇸' },
    { name: 'Canada', flag: '🇨🇦' },
    { name: 'Australia', flag: '🇦🇺' },
  ];

  // Liste des secteurs d'activité
  activitySectors: ActivityOption[] = [
    // Tourism
    { value: 'HOTEL', label: 'Hotel', category: 'Tourism' },
    { value: 'GUEST_HOUSE', label: 'Guest House', category: 'Tourism' },
    { value: 'TRAVEL_AGENCY', label: 'Travel Agency', category: 'Tourism' },
    { value: 'TOUR_GUIDE', label: 'Tour Guide', category: 'Tourism' },
    { value: 'TRANSPORT', label: 'Transport', category: 'Tourism' },
    { value: 'RESTAURANT', label: 'Restaurant', category: 'Tourism' },
    { value: 'CRAFTS', label: 'Crafts', category: 'Tourism' },
    
    // Investment
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
    
    // Other
    { value: 'OTHER', label: 'Other', category: 'Other' }
  ];

  // Liste des nationalités (comme dans register.ts)
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

  // Liste des régions de Tunisie (comme dans register.ts)
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

  // URLs des endpoints par rôle
  private profileEndpoints: { [key: string]: { get: string, put: string } } = {
    [Role.ADMIN]: {
      get: 'http://localhost:8089/api/admin/profile',
      put: 'http://localhost:8089/api/admin/profile'
    },
    [Role.TOURIST]: {
      get: 'http://localhost:8089/api/touristes/profile',
      put: 'http://localhost:8089/api/touristes/profile'
    },
    [Role.INVESTOR]: {
      get: 'http://localhost:8089/api/auth/me',
      put: 'http://localhost:8089/api/auth/update'
    },
    [Role.PARTNER]: {
      get: 'http://localhost:8089/api/partenaires-economiques/profile',
      put: 'http://localhost:8089/api/partenaires-economiques/profile'
    },
    [Role.LOCAL_PARTNER]: {
      get: 'http://localhost:8089/api/partenaires-locaux/profile',
      put: 'http://localhost:8089/api/partenaires-locaux/profile'
    },
    [Role.INTERNATIONAL_COMPANY]: {
      get: 'http://localhost:8089/api/international-companies/profile',
      put: 'http://localhost:8089/api/international-companies/profile'
    },
  };

  private photoUploadUrl = 'http://localhost:8089/api/upload/profile-photo';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.userRole = this.authService.getUserRole() || '';
    console.log('🔑 User role:', this.userRole);
    this.loadProfile();
  }

  goBack(): void {
    this.router.navigate([this.getDashboardUrl()]);
  }

  private getDashboardUrl(): string {
    switch (this.userRole) {
      case Role.ADMIN: return '/admin/dashboard';
      case Role.TOURIST: return '/touriste/dashboard';
      case Role.INVESTOR: return '/investisseur/dashboard';
      case Role.PARTNER: return '/partenaire-economique/dashboard';
      case Role.LOCAL_PARTNER: return '/partenaire-local/dashboard';
      case Role.INTERNATIONAL_COMPANY: return '/societe-international/dashboard';
      default: return '/';
    }
  }

  async loadProfile() {
    this.loading = true;
    
    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Not authenticated';
      this.loading = false;
      return;
    }

    try {
      const endpoint = this.getProfileEndpoint();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const response: any = await lastValueFrom(
        this.http.get(endpoint, { headers })
      );

      console.log('✅ Profile data from server:', response);
      
      this.profile = this.mapResponseToProfile(response);
      console.log('✅ Mapped profile:', this.profile);
      
      if (this.profile?.phone) {
        this.phoneNumber = this.profile.phone.replace(/[^0-9]/g, '');
      }
      
      // Initialiser la prévisualisation de la photo
      if (this.profile?.photo) {
        this.photoPreview = this.profile.photo;
      }
      
    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      this.error = error.error?.message || 'Failed to load profile';
    } finally {
      this.loading = false;
    }
  }

  private getProfileEndpoint(): string {
    return this.profileEndpoints[this.userRole]?.get || '';
  }

  private getUpdateEndpoint(): string {
    return this.profileEndpoints[this.userRole]?.put || '';
  }

  private mapResponseToProfile(response: any): UserProfile {
    // Structure de base pour tous les rôles
    const base: UserProfile = {
      id: response.id || 0,
      email: response.email || '',
      firstName: response.firstName || response.prenom || '',
      lastName: response.lastName || response.nom || '',
      phone: response.phone || response.telephone || '',
      photo: response.profilePicture || response.photo || response.profilePhoto || response.photoProfil || '',
      role: this.userRole,
      registrationDate: response.registrationDate || response.dateInscription || new Date().toISOString(),
      isActive: response.active ?? true,
    };

    // Ajouter les champs spécifiques selon le rôle
    switch (this.userRole) {
      case Role.INVESTOR:
        return {
          ...base,
          companyName: response.company || response.companyName || '',
          originCountry: response.originCountry || response.paysOrigine || '',
          activitySector: response.activitySector || response.secteurActivite || '',
          website: response.website || response.siteWeb || '',
          linkedinProfile: response.linkedinProfile || '',
          nationality: response.nationality || '',
        };
        
      case Role.PARTNER:
        return {
          ...base,
          originCountry: response.countryOfOrigin || response.paysOrigine || '',
          activitySector: response.businessSector || response.secteurActivite || '',
          headquartersAddress: response.headquartersAddress || response.adresse || '',
          website: response.website || response.siteWeb || '',
          linkedinProfile: response.linkedinProfile || '',
        };
        
      case Role.LOCAL_PARTNER:
        return {
          ...base,
          phone: response.telephone || response.phone || base.phone,
          website: response.siteWeb || response.website || base.website,
          activitySector: response.domaineActivite || response.activitySector || '',
          region: response.region || '',
          address: response.adresse || response.address || '',
          businessRegistrationNumber: response.numeroRegistreCommerce || response.businessRegistrationNumber || '',
          professionalTaxNumber: response.taxeProfessionnelle || response.professionalTaxNumber || '',
          linkedinProfile: response.linkedinProfile || '',
        };
        
      case Role.INTERNATIONAL_COMPANY:
        return {
          ...base,
          firstName: response.contactFirstName || response.firstName || response.prenom || base.firstName,
          lastName: response.contactLastName || response.lastName || response.nom || base.lastName,
          companyName: response.companyName || '',
          originCountry: response.originCountry || response.paysOrigine || '',
          activitySector: response.activitySector || '',
          siret: response.siret || '',
          website: response.website || response.siteWeb || '',
          linkedinProfile: response.linkedinProfile || '',
        };
        
      case Role.TOURIST:
        return {
          ...base,
          nationality: response.nationality || response.nationalite || '',
          photo: response.profilePhoto || response.photo || response.profilePicture || base.photo,
        };
        
      default:
        return base;
    }
  }

  getInitials(): string {
    if (!this.profile) return '?';
    const first = this.profile.firstName?.charAt(0) || '';
    const last = this.profile.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || this.profile.email.charAt(0).toUpperCase();
  }

  getActivityCategories(): string[] {
    const categories = new Set(this.activitySectors.map(s => s.category));
    return Array.from(categories);
  }

  getSectorsByCategory(category: string): ActivityOption[] {
    return this.activitySectors.filter(s => s.category === category);
  }

  // ========================================
  // MÉTHODES DE VALIDATION (comme dans RegisterComponent)
  // ========================================

  validateGmail(email: string): boolean {
    if (!email) return false;
    const domain = email.substring(email.indexOf('@') + 1).toLowerCase();
    const gmailDomains = [
      'gmail.com', 'googlemail.com', 'gmail.co.uk', 'gmail.fr',
      'gmail.de', 'gmail.it', 'gmail.es', 'gmail.ca', 'gmail.com.au', 'gmail.co.in'
    ];
    return gmailDomains.includes(domain);
  }

  validateEmailAddress(): boolean {
    if (!this.newEmail || this.newEmail.trim() === '') {
      this.emailError = 'Email is required';
      return false;
    }
    if (!this.validateGmail(this.newEmail)) {
      this.emailError = 'Only Gmail addresses are allowed (e.g., @gmail.com, @gmail.fr, etc.)';
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newEmail)) {
      this.emailError = 'Invalid email format';
      return false;
    }
    this.emailError = '';
    return true;
  }

  validatePhoneNumber(): boolean {
    if (!this.phoneNumber || this.phoneNumber.trim() === '') {
      // Pour certains rôles, le téléphone peut être optionnel
      if (this.userRole === Role.TOURIST) {
        this.phoneError = '';
        return true;
      }
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

  validateCompanyName(value: string): boolean {
    if (!value || value.trim() === '') return true;
    if (value.trim().length < 2 || value.trim().length > 100) {
      this.error = 'Company name must be between 2 and 100 characters';
      return false;
    }
    return true;
  }

  validateOriginCountry(country: string): boolean {
    if (!country || country.trim() === '') return true;
    if (country.trim().length < 2 || country.trim().length > 60) {
      this.error = 'Country must be between 2 and 60 characters';
      return false;
    }
    const validPattern = /^[\p{L}\-\s']+$/u;
    if (!validPattern.test(country.trim())) {
      this.error = 'Country must contain only letters, spaces, hyphens or apostrophes';
      return false;
    }
    return true;
  }

  validateNationalityValue(nationality: string): boolean {
    if (!nationality || nationality.trim() === '') return true;
    if (nationality.trim().length < 2 || nationality.trim().length > 60) {
      this.error = 'Nationality must be between 2 and 60 characters';
      return false;
    }
    const validPattern = /^[\p{L}\-\s']+$/u;
    if (!validPattern.test(nationality.trim())) {
      this.error = 'Nationality must contain only letters, spaces, hyphens or apostrophes';
      return false;
    }
    return true;
  }

  validateSiretNumber(siret: string): boolean {
    if (!siret || siret.trim() === '') return true;
    const siretRegex = /^\d{14}$/;
    if (!siretRegex.test(siret.trim())) {
      this.error = 'SIRET number must be exactly 14 digits';
      return false;
    }
    return true;
  }

  onWebsiteBlur(): void {
    if (this.editData.website && !this.validateWebsite(this.editData.website)) {
      this.error = 'Invalid website URL. Expected: https://www.example.com';
    }
  }

  onLinkedinBlur(): void {
    if (this.editData.linkedinProfile && !this.validateLinkedin(this.editData.linkedinProfile)) {
      this.error = 'Invalid LinkedIn URL. Expected: https://www.linkedin.com/in/your-profile';
    }
  }

  onEmailInput(): void {
    this.validateEmailAddress();
  }

  // ========================================
  // MÉTHODES POUR LA PHOTO
  // ========================================
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png|jpg|gif)/)) {
      this.error = 'Please select a valid image file (JPEG, PNG, JPG, GIF)';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Image size should not exceed 5MB';
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
    
    this.error = '';
  }

  async uploadPhoto() {
    if (!this.selectedFile || !this.profile) return;

    this.uploadingPhoto = true;
    this.error = '';
    this.success = '';

    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Non authentifié';
      this.uploadingPhoto = false;
      return;
    }

    const formData = new FormData();
    formData.append('fichier', this.selectedFile);

    try {
      const uploadEndpoint = 'http://localhost:8089/api/upload/profile-photo';
      
      console.log('📤 Upload vers:', uploadEndpoint);
      console.log('📤 Fichier:', this.selectedFile.name);

      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const response: any = await lastValueFrom(
        this.http.post(uploadEndpoint, formData, { headers })
      );

      console.log('✅ Réponse upload:', response);
      
      const photoUrl = response.photoUrl;
      console.log('📸 URL photo reçue:', photoUrl);
      
      if (this.profile) {
        this.profile.photo = photoUrl;
      }
      
      this.authService.updateProfilePhoto(photoUrl);
      this.photoPreview = photoUrl;
      await this.savePhotoToDatabase(photoUrl);
      await this.authService.refreshUserProfile();
      await this.loadProfile();
      
      this.success = 'Photo mise à jour avec succès';
      this.selectedFile = null;
      
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
      
    } catch (error: any) {
      console.error('❌ Erreur upload photo:', error);
      this.error = error.error?.erreur || 'Échec de l\'upload de la photo';
    } finally {
      this.uploadingPhoto = false;
    }
  }

  async savePhotoToDatabase(photoUrl: string) {
    try {
      const token = this.authService.getToken();
      const endpoint = this.getUpdateEndpoint();
      
      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json');

      let photoField = '';
      let updateData: any = {};
      
      switch (this.userRole) {
        case Role.INVESTOR:
          photoField = 'profilePicture';
          break;
        case Role.PARTNER:
          photoField = 'profilePhoto';
          break;
        case Role.LOCAL_PARTNER:
          photoField = 'photoProfil';
          break;
        case Role.INTERNATIONAL_COMPANY:
          photoField = 'profilePicture';
          break;
        case Role.TOURIST:
          photoField = 'profilePhoto';
          break;
        case Role.ADMIN:
          photoField = 'profilePhoto';
          break;
        default:
          photoField = 'photo';
      }
      
      updateData[photoField] = photoUrl;
      
      console.log(`📤 Sauvegarde en base: ${photoField} = ${photoUrl}`);
      
      const response: any = await lastValueFrom(
        this.http.put(endpoint, updateData, { headers })
      );
      
      console.log('✅ Photo sauvegardée en base:', response);
      await this.forceReloadProfile();
      
      return response;
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde base:', error);
      throw error;
    }
  }

  async forceReloadProfile() {
    console.log('🔄 Force reload profile...');
    
    const token = this.authService.getToken();
    if (!token) {
      console.error('❌ Pas de token');
      return;
    }

    try {
      const endpoint = this.getProfileEndpoint();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const response: any = await lastValueFrom(
        this.http.get(endpoint, { headers })
      );

      console.log('✅ Force reload - Données brutes:', response);
      
      console.log('📸 Champs photo dans réponse:', {
        profilePicture: response.profilePicture,
        photo: response.photo,
        profilePhoto: response.profilePhoto,
        photoProfil: response.photoProfil,
        picture: response.picture
      });
      
      const oldPhoto = this.profile?.photo;
      this.profile = this.mapResponseToProfile(response);
      
      console.log('📸 Ancienne photo:', oldPhoto);
      console.log('📸 Nouvelle photo:', this.profile?.photo);
      
      if (this.profile?.phone) {
        this.phoneNumber = this.profile.phone.replace(/[^0-9]/g, '');
      }
      
      if (this.profile?.photo) {
        this.photoPreview = this.profile.photo;
      }
      
      this.authService.updateProfilePhoto(this.profile?.photo || '');
      this.authService.forceUpdate();
      
    } catch (error: any) {
      console.error('❌ Erreur force reload:', error);
    }
  }

  async testPhotoInBackend() {
    const token = this.authService.getToken();
    if (!token) return;
    
    try {
      const endpoint = this.getProfileEndpoint();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const response: any = await lastValueFrom(
        this.http.get(endpoint, { headers })
      );
      
      console.log('🔍 TEST - Réponse brute:', response);
      console.log('📸 Photos:', {
        profilePicture: response.profilePicture,
        photo: response.photo,
        profilePhoto: response.profilePhoto,
        photoProfil: response.photoProfil
      });
      
      alert('Vérifiez la console (F12)');
      
    } catch (error) {
      console.error('❌ Erreur test:', error);
    }
  }

  removePhoto() {
    this.selectedFile = null;
    this.photoPreview = this.profile?.photo || null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // ========================================
  // GESTION DE L'EMAIL
  // ========================================
  toggleEmailEdit() {
    if (!this.isEditingEmail) {
      this.newEmail = this.profile?.email || '';
    }
    this.isEditingEmail = !this.isEditingEmail;
    this.emailError = '';
  }

  cancelEmailEdit() {
    this.isEditingEmail = false;
    this.newEmail = '';
    this.emailError = '';
  }

  async saveEmail() {
    if (!this.validateEmailAddress()) {
      this.error = this.emailError;
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Not authenticated';
      this.saving = false;
      return;
    }

    try {
      const endpoint = this.getUpdateEndpoint();
      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json');

      const updateData = { email: this.newEmail };

      const response: any = await lastValueFrom(
        this.http.put(endpoint, updateData, { headers })
      );

      console.log('✅ Email updated:', response);
      
      this.success = 'Email updated successfully. Please login again.';
      
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error updating email:', error);
      this.error = error.error?.message || 'Failed to update email';
    } finally {
      this.saving = false;
      this.isEditingEmail = false;
    }
  }

  // ========================================
  // GESTION DU TÉLÉPHONE
  // ========================================
  updatePhoneNumber(): void {
    if (this.phoneNumber) {
      const digitsOnly = this.phoneNumber.replace(/\D/g, '');
      this.editData.phone = this.selectedCountryCode + digitsOnly;
      this.phoneNumber = digitsOnly;
      this.validatePhoneNumber();
    } else {
      this.editData.phone = '';
    }
  }

  onPhoneInput(event: any): void {
    const input = event.target;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.phoneNumber = input.value;
    this.updatePhoneNumber();
  }

  // ========================================
  // GESTION DU PROFIL
  // ========================================
  toggleEdit() {
    if (!this.isEditing) {
      this.editData = {
        firstName: this.profile?.firstName,
        lastName: this.profile?.lastName,
        phone: this.profile?.phone,
      };

      switch (this.userRole) {
        case Role.INVESTOR:
          this.editData.companyName = this.profile?.companyName;
          this.editData.originCountry = this.profile?.originCountry;
          this.editData.activitySector = this.profile?.activitySector;
          this.editData.website = this.profile?.website;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          this.editData.nationality = this.profile?.nationality;
          break;
        case Role.PARTNER:
          this.editData.originCountry = this.profile?.originCountry;
          this.editData.activitySector = this.profile?.activitySector;
          this.editData.headquartersAddress = this.profile?.headquartersAddress;
          this.editData.website = this.profile?.website;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          break;
        case Role.LOCAL_PARTNER:
          this.editData.activitySector = this.profile?.activitySector;
          this.editData.region = this.profile?.region;
          this.editData.address = this.profile?.address;
          this.editData.website = this.profile?.website;
          this.editData.businessRegistrationNumber = this.profile?.businessRegistrationNumber;
          this.editData.professionalTaxNumber = this.profile?.professionalTaxNumber;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          break;
        case Role.INTERNATIONAL_COMPANY:
          this.editData.companyName = this.profile?.companyName;
          this.editData.originCountry = this.profile?.originCountry;
          this.editData.siret = this.profile?.siret;
          this.editData.website = this.profile?.website;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          this.editData.activitySector = this.profile?.activitySector;
          break;
        case Role.TOURIST:
          this.editData.nationality = this.profile?.nationality;
          break;
      }
      
      if (this.editData.phone) {
        this.phoneNumber = this.editData.phone.replace(/[^0-9]/g, '');
      }
    }
    this.isEditing = !this.isEditing;
  }

  cancelEdit() {
    this.isEditing = false;
    this.editData = {};
    this.phoneNumber = '';
    this.phoneError = '';
    this.error = '';
    this.success = '';
  }

  prepareUpdateData(): any {
    const updateData: any = {};

    if (this.editData.firstName !== this.profile?.firstName) {
      updateData.firstName = this.editData.firstName;
    }
    if (this.editData.lastName !== this.profile?.lastName) {
      updateData.lastName = this.editData.lastName;
    }
    
    if (this.editData.phone !== this.profile?.phone) {
      if (this.userRole === Role.LOCAL_PARTNER) {
        updateData.telephone = this.editData.phone;
      } else {
        updateData.phone = this.editData.phone;
      }
    }

    switch (this.userRole) {
      case Role.INVESTOR:
        if (this.editData.companyName !== this.profile?.companyName) {
          updateData.company = this.editData.companyName;
        }
        if (this.editData.originCountry !== this.profile?.originCountry) {
          updateData.originCountry = this.editData.originCountry;
        }
        if (this.editData.activitySector !== this.profile?.activitySector) {
          updateData.activitySector = this.editData.activitySector;
        }
        if (this.editData.website !== this.profile?.website) {
          updateData.website = this.editData.website;
        }
        if (this.editData.linkedinProfile !== this.profile?.linkedinProfile) {
          updateData.linkedinProfile = this.editData.linkedinProfile;
        }
        if (this.editData.nationality !== this.profile?.nationality) {
          updateData.nationality = this.editData.nationality;
        }
        break;

      case Role.PARTNER:
        if (this.editData.originCountry !== this.profile?.originCountry) {
          updateData.countryOfOrigin = this.editData.originCountry;
        }
        if (this.editData.activitySector !== this.profile?.activitySector) {
          updateData.businessSector = this.editData.activitySector;
        }
        if (this.editData.headquartersAddress !== this.profile?.headquartersAddress) {
          updateData.headquartersAddress = this.editData.headquartersAddress;
        }
        if (this.editData.website !== this.profile?.website) {
          updateData.website = this.editData.website;
        }
        if (this.editData.linkedinProfile !== this.profile?.linkedinProfile) {
          updateData.linkedinProfile = this.editData.linkedinProfile;
        }
        break;

      case Role.LOCAL_PARTNER:
        if (this.editData.activitySector !== this.profile?.activitySector) {
          updateData.domaineActivite = this.editData.activitySector;
        }
        if (this.editData.region !== this.profile?.region) {
          updateData.region = this.editData.region;
        }
        if (this.editData.address !== this.profile?.address) {
          updateData.adresse = this.editData.address;
        }
        if (this.editData.website !== this.profile?.website) {
          updateData.siteWeb = this.editData.website;
        }
        if (this.editData.businessRegistrationNumber !== this.profile?.businessRegistrationNumber) {
          updateData.numeroRegistreCommerce = this.editData.businessRegistrationNumber;
        }
        if (this.editData.professionalTaxNumber !== this.profile?.professionalTaxNumber) {
          updateData.taxeProfessionnelle = this.editData.professionalTaxNumber;
        }
        if (this.editData.linkedinProfile !== this.profile?.linkedinProfile) {
          updateData.linkedinProfile = this.editData.linkedinProfile;
        }
        break;
case Role.INTERNATIONAL_COMPANY:
  // ⚠️ Envoyer TOUS les champs obligatoires
  updateData.contactFirstName = this.editData.firstName;
  updateData.contactLastName = this.editData.lastName;
  updateData.companyName = this.editData.companyName;
  updateData.originCountry = this.editData.originCountry;
  updateData.activitySector = this.editData.activitySector;
  updateData.siret = this.editData.siret;
  updateData.website = this.editData.website;
  updateData.linkedinProfile = this.editData.linkedinProfile;
  updateData.phone = this.editData.phone;  // ⚠️ TRÈS IMPORTANT
  break;

      case Role.TOURIST:
        if (this.editData.nationality !== this.profile?.nationality) {
          updateData.nationality = this.editData.nationality;
        }
        break;
    }

    return updateData;
  }

  async saveProfile() {
    // Validation téléphone avancée
    if (!this.validatePhoneNumber()) {
      this.error = this.phoneError;
      return;
    }

    // Validations selon le rôle
    if (this.userRole === Role.INVESTOR) {
      if (this.editData.companyName && !this.validateCompanyName(this.editData.companyName)) {
        return;
      }
      if (this.editData.originCountry && !this.validateOriginCountry(this.editData.originCountry)) {
        return;
      }
      if (this.editData.nationality && !this.validateNationalityValue(this.editData.nationality)) {
        return;
      }
      if (this.editData.website && !this.validateWebsite(this.editData.website)) {
        this.error = 'Invalid website URL. Expected format: https://www.example.com';
        return;
      }
      if (this.editData.linkedinProfile && !this.validateLinkedin(this.editData.linkedinProfile)) {
        this.error = 'Invalid LinkedIn URL. Expected format: https://www.linkedin.com/in/your-profile';
        return;
      }
    }

    if (this.userRole === Role.INTERNATIONAL_COMPANY) {
      if (this.editData.companyName && !this.validateCompanyName(this.editData.companyName)) {
        return;
      }
      if (this.editData.originCountry && !this.validateOriginCountry(this.editData.originCountry)) {
        return;
      }
       if (this.editData.siret && !this.validateSiret(this.editData.siret)) {
    this.error = this.siretError;
    return;
  }
      if (this.editData.website && !this.validateWebsite(this.editData.website)) {
        this.error = 'Invalid website URL';
        return;
      }
      if (this.editData.linkedinProfile && !this.validateLinkedin(this.editData.linkedinProfile)) {
        this.error = 'Invalid LinkedIn URL';
        return;
      }
    }

    if (this.userRole === Role.PARTNER) {
      if (this.editData.originCountry && !this.validateOriginCountry(this.editData.originCountry)) {
        return;
      }
      if (this.editData.website && !this.validateWebsite(this.editData.website)) {
        this.error = 'Invalid website URL';
        return;
      }
      if (this.editData.linkedinProfile && !this.validateLinkedin(this.editData.linkedinProfile)) {
        this.error = 'Invalid LinkedIn URL';

        return;
      }
    }

    if (this.userRole === Role.LOCAL_PARTNER) {
       if (this.editData.businessRegistrationNumber && !this.validateBusinessRegistrationNumber(this.editData.businessRegistrationNumber)) {
    this.error = this.businessRegError;
    return;
  }
  if (this.editData.professionalTaxNumber && !this.validateTaxNumber(this.editData.professionalTaxNumber)) {
    this.error = this.taxNumberError;
    return;
  }
      if (this.editData.website && !this.validateWebsite(this.editData.website)) {
        this.error = 'Invalid website URL';
        return;
      }
      if (this.editData.linkedinProfile && !this.validateLinkedin(this.editData.linkedinProfile)) {
        this.error = 'Invalid LinkedIn URL';
        return;
      }
    }

    if (this.userRole === Role.TOURIST) {
      if (this.editData.nationality && !this.validateNationalityValue(this.editData.nationality)) {
        return;
      }
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Not authenticated';
      this.saving = false;
      return;
    }

    const updateData = this.prepareUpdateData();
    console.log('📤 Données envoyées au backend:', JSON.stringify(updateData, null, 2));
    
    if (Object.keys(updateData).length === 0) {
      this.isEditing = false;
      this.saving = false;
      return;
    }

    try {
      const endpoint = this.getUpdateEndpoint();
      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json');

      const response: any = await lastValueFrom(
        this.http.put(endpoint, updateData, { headers })
      );

      console.log('✅ Profile updated:', response);
      
      await this.loadProfile();
      this.success = 'Profile updated successfully';
      this.isEditing = false;
      
    } catch (error: any) {
  console.error('❌ Error updating profile:', error);
  
  const errorMessage = error.error?.message || error.message || 'Failed to update profile';
  
  // Vérifier si l'erreur concerne le SIRET déjà utilisé
  if (errorMessage.includes('SIRET number is already in use')) {
    this.siretError = 'This SIRET number is already in use by another company. Please use a different SIRET.';
    this.error = this.siretError;
  } else {
    this.error = errorMessage;
  }
}finally {
      this.saving = false;
    }
  }

  // ========================================
  // SUPPRESSION DE COMPTE
  // ========================================
  openDeleteModal() {
    this.showDeleteModal = true;
    this.deletePassword = '';
    this.deleteError = '';
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deletePassword = '';
    this.deleteError = '';
  }

  async confirmDelete() {
    if (!this.deletePassword) {
      this.deleteError = 'Password is required';
      return;
    }

    this.deleting = true;
    this.deleteError = '';

    try {
      const result = await this.authService.deleteOwnAccount(this.deletePassword).toPromise();
      console.log('✅ Account deleted:', result);
      
      this.success = 'Your account has been deleted. Redirecting...';
      this.closeDeleteModal();
      
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error deleting account:', error);
      this.deleteError = error.message || 'Failed to delete account';
    } finally {
      this.deleting = false;
    }
  }

  // ========================================
  // CHANGEMENT DE MOT DE PASSE
  // ========================================

  showPasswordModal: boolean = false;
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  passwordError: string = '';
  changingPassword: boolean = false;

  openPasswordModal() {
    this.showPasswordModal = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = '';
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = '';
    this.changingPassword = false;
  }

  validatePassword(): boolean {
    if (!this.oldPassword) {
      this.passwordError = 'L\'ancien mot de passe est requis';
      return false;
    }
    
    if (!this.newPassword) {
      this.passwordError = 'Le nouveau mot de passe est requis';
      return false;
    }
    
    if (this.newPassword.length < 6) {
      this.passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
      return false;
    }
    
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas';
      return false;
    }
    
    this.passwordError = '';
    return true;
  }

  async changePassword() {
    if (!this.validatePassword()) {
      return;
    }

    this.changingPassword = true;
    this.passwordError = '';

    try {
      const response = await lastValueFrom(
        this.authService.changePassword(this.oldPassword, this.newPassword)
      );
      
      console.log('✅ Mot de passe changé:', response);
      this.success = 'Mot de passe changé avec succès';
      this.closePasswordModal();
      
    } catch (error: any) {
      console.error('❌ Erreur changement mot de passe:', error);
      this.passwordError = error.message || 'Erreur lors du changement de mot de passe';
    } finally {
      this.changingPassword = false;
    }
  }
  // Ajoutez ces méthodes après validateSiretNumber() (vers ligne 520)

// Validation Business Registration Number
validateBusinessRegistrationNumber(value: string): boolean {
  if (!value || value.trim() === '') {
    this.businessRegError = '';
    return true;
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < 3) {
    this.businessRegError = 'Business registration number must be at least 3 characters';
    return false;
  }
  if (trimmed.length > 30) {
    this.businessRegError = 'Business registration number must not exceed 30 characters';
    return false;
  }
  
  const regex = /^[A-Z0-9\-]+$/;
  if (!regex.test(trimmed)) {
    this.businessRegError = 'Business registration number can only contain uppercase letters, numbers, and hyphens';
    return false;
  }
  
  this.businessRegError = '';
  return true;
}

// Validation Professional Tax Number
validateTaxNumber(value: string): boolean {
  if (!value || value.trim() === '') {
    this.taxNumberError = '';
    return true;
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < 5) {
    this.taxNumberError = 'Professional tax number must be at least 5 characters';
    return false;
  }
  if (trimmed.length > 25) {
    this.taxNumberError = 'Professional tax number must not exceed 25 characters';
    return false;
  }
  
  const regex = /^[A-Z0-9\-]+$/;
  if (!regex.test(trimmed)) {
    this.taxNumberError = 'Professional tax number can only contain uppercase letters, numbers, and hyphens';
    return false;
  }
  
  this.taxNumberError = '';
  return true;
}

// Méthodes appelées depuis le HTML
onBusinessRegBlur(): void {
  this.validateBusinessRegistrationNumber(this.editData.businessRegistrationNumber);
}

onTaxNumberBlur(): void {
  this.validateTaxNumber(this.editData.professionalTaxNumber);
}
  
  // ========================================
  // PROPRIÉTÉS POUR HIDE/SHOW PASSWORD
  // ========================================
  showOldPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;
  // Ajoutez cette méthode après validateTaxNumber() (vers ligne 650)

// Validation SIRET (14 chiffres exactement)
validateSiret(value: string): boolean {
  if (!value || value.trim() === '') {
    this.siretError = '';
    return true; // Optionnel, peut être vide
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

// Méthode appelée depuis le HTML
onSiretBlur(): void {
  this.validateSiret(this.editData.siret);
}
}