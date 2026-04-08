import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule ,TranslateModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  errorMsg = '';
  showPassword = false;
  rememberMe = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getUserRole();
      if (role) this.router.navigate([`/${role.toLowerCase().replace('_', '-')}/dashboard`]);
    }
  }

  ngOnInit() {
    setTimeout(() => {
      this.email = '';
      this.password = '';
    }, 0);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMsg = 'Email and password are required';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        console.log('✅ Login successful');
        // ✅ La session est automatiquement démarrée dans AuthService.handleLoginSuccess()
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.message || 'Invalid credentials';
        console.error('❌ Login error:', err);
      }
    });
  }
}