import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private linkedInCredentials = {
    clientId: "86p3ct3bn385w6", // Your LinkedIn App Client ID
    redirectUrl: "http://localhost:4200/linkedInLogin" // ✅ MATCHING REGISTERED URL
  };

  login() {
    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
      this.linkedInCredentials.clientId
    }&redirect_uri=${encodeURIComponent(this.linkedInCredentials.redirectUrl)}&state=987654321&scope=openid%20profile%20email%20w_member_social`;

    window.location.href = linkedInAuthUrl;
  }
}
