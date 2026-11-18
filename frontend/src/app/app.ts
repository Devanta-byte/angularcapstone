import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService, AuthService, apiError } from './api';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/"><span class="brand-mark">H</span> Home Haven</a>
      <nav class="main-nav" aria-label="Main navigation">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Browse homes</a>
        @if (auth.user(); as user) {
          <a routerLink="/my-listings">My listings</a>
          <a routerLink="/sell">Sell a property</a>
          <span class="nav-user">Hi, {{ user.name }}</span>
          <button class="nav-button" type="button" (click)="logout()">Log out</button>
        } @else {
          <a routerLink="/login">Log in</a>
          <a class="nav-button" routerLink="/register">Create account</a>
        }
      </nav>
    </header>
    <main class="page-shell"><router-outlet /></main>
    <footer class="site-footer"><p>Home Haven · A place to find your next place.</p></footer>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  constructor() { this.auth.loadSession().subscribe(); }
  logout(): void {
    this.api.logout().subscribe({
      next: () => { this.auth.clearUser(); this.router.navigateByUrl('/'); },
      error: error => { this.auth.clearUser(); this.router.navigateByUrl('/'); console.error(apiError(error)); },
    });
  }
}
