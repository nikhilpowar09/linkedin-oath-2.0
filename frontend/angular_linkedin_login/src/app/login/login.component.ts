// src/app/login/login.component.ts
import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  login() {
    // Generate a more secure state token
    const state = this.generateStateToken();

    // Store in sessionStorage
    sessionStorage.setItem('linkedin_state', state);
    sessionStorage.setItem('linkedin_redirect', window.location.href);

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
      environment.linkedin.clientId
    }&redirect_uri=${
      encodeURIComponent(environment.linkedin.redirectUrl)
    }&state=${state}&scope=${
      environment.linkedin.scopes
    }`;

    window.location.href = authUrl;
  }

  private generateStateToken(): string {
    const array = new Uint32Array(10);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');
  }
}

