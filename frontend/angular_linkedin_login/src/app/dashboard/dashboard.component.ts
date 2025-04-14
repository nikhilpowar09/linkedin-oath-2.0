//dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';

interface Post {
  _id: string;
  content: string;
  scheduledTime: string;
  status: 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  imageUrl?: string;
  likes: string[];
  comments: {
    user: {
      _id: string;
      name: string;
      profilePicture: string;
    };
    text: string;
    createdAt: string;
  }[];
  user: {
    _id: string;
    name: string;
    profilePicture: string;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  readonly environment = environment;
  postContent = '';
  scheduledTime = '';
  scheduledPosts: Post[] = [];
  publishedPosts: Post[] = [];
  error = '';
  isLoading = false;
  user: User | null = null;
  selectedFile: File | null = null;
  previewImage: string | null = null;
  commentTexts: { [postId: string]: string } = {};

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchUserProfile();
    this.fetchPosts();
  }

  // ================= TIME ZONE HANDLING =================

  /**
   * Convert local datetime (browser's timezone) to UTC
   */
  private localToUTC(localDate: Date): Date {
    return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
  }

  /**
   * Format UTC date to local time string
   */
  formatLocalDate(utcDateString: string): string {
    return formatDate(utcDateString, 'MMM d, y, h:mm a', 'en-US');
  }

  /**
   * Get current datetime in local timezone for input min attribute
   */
  getCurrentDateTimeForInput(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  getLocalTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  getTimezoneOffset(): string {
    const offset = -new Date().getTimezoneOffset() / 60;
    return `UTC${offset >= 0 ? '+' : ''}${offset}`;
  }

  // ================= POST MANAGEMENT =================

  schedulePost(): void {
    if (!this.postContent.trim()) {
      this.error = 'Post content cannot be empty';
      return;
    }

    if (!this.scheduledTime) {
      this.error = 'Please select a schedule time';
      return;
    }

    // Convert local datetime to UTC
    const localDate = new Date(this.scheduledTime);
    const utcDate = this.localToUTC(localDate);

    if (utcDate <= new Date()) {
      const now = new Date();
      const currentTimeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      this.error = `Schedule time must be in the future. Current time is ${currentTimeStr} (${this.getLocalTimezone()})`;
      return;
    }

    this.isLoading = true;
    const formData = new FormData();
    formData.append('content', this.postContent);
    formData.append('scheduledTime', utcDate.toISOString());
    if (this.selectedFile) formData.append('image', this.selectedFile);

    this.http.post<Post>(`${environment.backendUrl}/api/posts/schedule`, formData, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => {
        this.resetForm();
        this.fetchPosts();
      },
      error: (err) => {
        console.error('Error scheduling post:', err);
        this.error = err.error?.error || 'Failed to schedule post';
        this.isLoading = false;
      }
    });
  }

  getTimeStatus(utcDateString: string): string {
    const now = new Date();
    const postTime = new Date(utcDateString);
    const diffMs = postTime.getTime() - now.getTime();

    if (diffMs <= 0) return '(now)';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `(in ${hours}h ${minutes}m)`;
  }

  // ================= USER INTERACTION =================

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.previewImage = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  likePost(postId: string): void {
    this.http.post(`${environment.backendUrl}/api/posts/${postId}/like`, {}, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => this.fetchPosts(),
      error: (err) => console.error('Error liking post:', err)
    });
  }

  addComment(postId: string): void {
    const text = this.commentTexts[postId]?.trim();
    if (!text) return;

    this.http.post(`${environment.backendUrl}/api/posts/${postId}/comment`, { text }, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => {
        this.commentTexts[postId] = '';
        this.fetchPosts();
      },
      error: (err) => console.error('Error adding comment:', err)
    });
  }

  deletePost(postId: string): void {
    if (confirm('Are you sure you want to delete this post?')) {
      this.http.delete(`${environment.backendUrl}/api/posts/${postId}`, {
        headers: this.getAuthHeaders()
      }).subscribe({
        next: () => this.fetchPosts(),
        error: (err) => this.error = 'Failed to delete post'
      });
    }
  }

  isPostLiked(post: Post): boolean {
    return this.user ? post.likes.includes(this.user._id) : false;
  }

  // ================= USER AUTH =================

  fetchUserProfile(): void {
    this.isLoading = true;
    this.http.get<User>(`${environment.backendUrl}/auth/profile`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch profile:', err);
        this.isLoading = false;
      }
    });
  }

  fetchPosts(): void {
    this.isLoading = true;
    this.http.get<Post[]>(`${environment.backendUrl}/api/posts`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (posts) => {
        this.scheduledPosts = posts.filter(p => p.status === 'SCHEDULED')
          .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
        this.publishedPosts = posts.filter(p => p.status === 'PUBLISHED')
          .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching posts:', err);
        this.error = 'Failed to load posts';
        this.isLoading = false;
      }
    });
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }

  // ================= HELPER METHODS =================

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
  }

  private resetForm(): void {
    this.postContent = '';
    this.scheduledTime = '';
    this.selectedFile = null;
    this.previewImage = null;
    this.error = '';
    this.isLoading = false;
  }
}
