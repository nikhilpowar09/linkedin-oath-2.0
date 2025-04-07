// src/app/linkedin-login-response/linkedin-login-response.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-linkedin-login-response',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './linkedin-login-response.component.html',
  styleUrls: ['./linkedin-login-response.component.css']
})
export class LinkedinLoginResponseComponent implements OnInit {
  linkedInToken: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.linkedInToken = this.route.snapshot.queryParams["code"];

    if (this.linkedInToken) {
      this.exchangeCodeForToken();
    } else {
      this.errorMessage = "No authorization code received";
      this.isLoading = false;
    }
  }

  exchangeCodeForToken() {
    this.http.post<{ access_token: string }>(
      `${environment.backendUrl}/getLinkedInToken`,
      { code: this.linkedInToken }
    ).subscribe({
      next: (response) => {
        localStorage.setItem('linkedin_access_token', response.access_token);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error("Error fetching access token:", error);
        this.errorMessage = "Failed to authenticate with LinkedIn";
        this.isLoading = false;
      }
    });
  }
}

