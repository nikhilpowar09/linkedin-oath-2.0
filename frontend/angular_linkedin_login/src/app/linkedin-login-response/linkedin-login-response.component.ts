import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-linkedin-login-response',
  templateUrl: './linkedin-login-response.component.html',
  styleUrls: ['./linkedin-login-response.component.css']
})
export class LinkedinLoginResponseComponent {
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {
    this.handleCallback();
  }

  private handleCallback() {
    const { code, state, error, error_description } = this.route.snapshot.queryParams;
    const savedState = sessionStorage.getItem('linkedin_state');

    // Clear state immediately after use
    sessionStorage.removeItem('linkedin_state');

    // 1. Check for LinkedIn errors first
    if (error) {
      this.handleError(error_description || `LinkedIn error: ${error}`);
      return;
    }

    // 2. Verify state parameter
    if (!state || state !== savedState) {
      this.handleError('Security verification failed. Please try logging in again.');
      return;
    }

    // 3. Ensure we have an authorization code
    if (!code) {
      this.handleError('Authorization failed: No code received from LinkedIn');
      return;
    }

    // 4. Exchange code for token
    this.exchangeCodeForToken(code);
  }

  private exchangeCodeForToken(code: string) {
    this.http.post(`${environment.backendUrl}/auth/linkedin`, { code })
      .subscribe({
        next: (res: any) => {
          if (res?.success && res.token) {
            // Store token and user data
            localStorage.setItem('access_token', res.token);
            if (res.user) {
              localStorage.setItem('user', JSON.stringify(res.user));
            }

            // Redirect to dashboard or original URL
            const redirectUrl = sessionStorage.getItem('linkedin_redirect') || '/dashboard';
            this.router.navigateByUrl(redirectUrl);
          } else {
            this.handleError('Invalid response from server');
          }
        },
        error: (err) => {
          this.handleError(err.error?.error || 'Failed to authenticate with server');
        }
      });
  }

  private handleError(message: string) {
    console.error('Authentication error:', message);
    this.error = message;
    this.isLoading = false;
  }

  retry() {
    // Clear all auth-related storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('linkedin_redirect');

    // Navigate back to login
    this.router.navigate(['/login']);
  }
}
