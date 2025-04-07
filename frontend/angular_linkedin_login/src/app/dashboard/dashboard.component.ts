// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  accessToken: string = '';
  scheduledPosts: any[] = [];
  userPosts: any[] = [];
  postAnalytics: any = null;
  newPost = {
    content: '',
    scheduledTime: new Date().toISOString().slice(0, 16)
  };
  selectedPostId: string | null = null;
  newComment: string = '';

  constructor(private http: HttpClient, private router: Router) {
    this.accessToken = localStorage.getItem('linkedin_access_token') || '';
    if (!this.accessToken) {
      this.router.navigate(['/login']);
    }
  }

  ngOnInit() {
    this.loadUserPosts();
  }

  schedulePost() {
    this.http.post(`${environment.backendUrl}/schedulePost`, {
      accessToken: this.accessToken,
      content: this.newPost.content,
      scheduledTime: this.newPost.scheduledTime
    }).subscribe({
      next: (response: any) => {
        this.loadUserPosts();
        this.newPost.content = '';
      },
      error: (error) => console.error('Error scheduling post:', error)
    });
  }

  loadUserPosts() {
    this.http.get(`${environment.backendUrl}/userPosts?accessToken=${this.accessToken}`)
      .subscribe({
        next: (response: any) => {
          this.userPosts = response.elements || [];
        },
        error: (error) => console.error('Error fetching user posts:', error)
      });
  }

  getPostAnalytics(postId: string) {
    this.selectedPostId = postId;
    this.http.get(`${environment.backendUrl}/postAnalytics/${postId}?accessToken=${this.accessToken}`)
      .subscribe({
        next: (response: any) => {
          this.postAnalytics = response;
        },
        error: (error) => console.error('Error fetching analytics:', error)
      });
  }

  interactWithPost(action: string) {
    if (action === 'comment' && !this.newComment) return;
    if (!this.selectedPostId) return;

    this.http.post(`${environment.backendUrl}/interactWithPost`, {
      accessToken: this.accessToken,
      postId: this.selectedPostId,
      action,
      comment: this.newComment
    }).subscribe({
      next: (response: any) => {
        if (this.selectedPostId) {
          this.getPostAnalytics(this.selectedPostId);
        }
        this.newComment = '';
      },
      error: (error) => console.error('Error interacting with post:', error)
    });
  }

  logout() {
    localStorage.removeItem('linkedin_access_token');
    this.router.navigate(['/login']);
  }
}
