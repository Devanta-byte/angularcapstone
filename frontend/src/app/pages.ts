import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, AuthService, PhpCurrencyPipe, Property, apiError } from './api';

@Component({
  standalone: true, imports: [RouterLink, PhpCurrencyPipe],
  template: `
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">A simpler way to find your next place</p><h1>Find a place<br>to call <em>home.</em></h1><p>Explore homes and properties shared by people in your community.</p><a class="button button-light" href="#listings">Explore properties <span aria-hidden="true">↓</span></a></div>
      <div class="hero-note"><span class="note-number">01</span><p>Browse a place.<br>Meet its next owner.</p></div>
    </section>
  <section class="listings-section" id="listings">
      <div class="section-heading"><div><p class="eyebrow">The latest listings</p><h2>Places worth a closer look</h2></div>@if (auth.user()) { <a class="text-link" routerLink="/sell">List your property <span aria-hidden="true">↗</span></a> }</div>
      @if (error()) { <p class="message message-error">{{ error() }}</p> }
      @if (loading()) { <p class="loading-state">Finding available homes…</p> }
      @if (!loading() && properties().length) {
        <div class="property-grid">@for (property of properties(); track property.id) {
          <article class="property-card"><a class="property-image-link" [routerLink]="['/properties', property.id]"><img class="property-image" [src]="property.image_url" [alt]="'Photo of ' + property.title"><span class="image-label">{{ property.property_type }}</span></a><div class="property-card-body"><p class="property-location">⌖ {{ property.location }}</p><h3><a [routerLink]="['/properties', property.id]">{{ property.title }}</a></h3><div class="property-card-bottom"><p class="price">{{ property.price | phpCurrency }}</p><span>by {{ property.seller_name }}</span></div>@if (property.bedrooms !== null || property.bathrooms !== null) { <p class="property-facts">{{ property.bedrooms ?? '—' }} bed · {{ property.bathrooms ?? '—' }} bath</p> }</div></article>
        }</div>
      } @else if (!loading() && !error()) {
        <div class="empty-state"><span class="empty-icon" aria-hidden="true">⌂</span><h3>The first listing is waiting to be shared.</h3><p>Sign in and add a property to start building your neighborhood.</p><a class="button button-dark" [routerLink]="auth.user() ? '/sell' : '/register'">Add a property</a></div>
      }
    </section>
  `,
})
export class HomePage {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  readonly properties = signal<Property[]>([]); readonly loading = signal(true); readonly error = signal('');
  constructor() { this.api.properties().subscribe({ next: rows => { this.properties.set(rows); this.loading.set(false); }, error: e => { this.error.set(apiError(e)); this.loading.set(false); } }); }
}

@Component({ standalone: true, imports: [RouterLink, PhpCurrencyPipe], template: `
  <a class="back-link" routerLink="/">← Back to all listings</a>
  @if (error()) { <section class="empty-state page-empty"><span class="empty-icon">⌂</span><h1>We couldn't find that property.</h1><p>{{ error() }}</p><a class="button button-dark" routerLink="/">Back to listings</a></section> }
  @if (property(); as p) { <article class="property-detail"><div class="detail-image-wrap"><img class="detail-image" [src]="p.image_url" [alt]="'Photo of ' + p.title"><span class="image-label">{{ p.property_type }}</span></div><div class="detail-content"><div class="detail-topline"><p class="property-location">⌖ {{ p.location }}</p><span class="status-pill" [class.status-sold]="p.status === 'Sold'">{{ p.status }}</span></div><h1>{{ p.title }}</h1><p class="detail-price">{{ p.price | phpCurrency }}</p>@if (p.bedrooms !== null || p.bathrooms !== null) { <div class="detail-facts">@if (p.bedrooms !== null) { <span><strong>{{ p.bedrooms }}</strong> bedrooms</span> } @if (p.bathrooms !== null) { <span><strong>{{ p.bathrooms }}</strong> bathrooms</span> }</div> }<div class="detail-description"><h2>About this property</h2><p>{{ p.description }}</p></div><p class="seller-note">Listed by <strong>{{ p.seller_name }}</strong></p>
    @if (p.status === 'Sold') { <p class="message message-info">{{ p.buyer_name && auth.user()?.id === p.seller_id ? 'This property has been sold to ' + p.buyer_name + '.' : 'This property has already been marked as sold.' }}</p> }
    @else if (auth.user()?.id === p.seller_id) { <p class="message message-info">This is your listing. Buyers can try the simulated purchase flow.</p> }
    @else if (auth.user()) { <a class="button button-dark" [routerLink]="['/checkout', p.id]">Continue to demo checkout <span aria-hidden="true">↗</span></a> }
    @else { <a class="button button-dark" routerLink="/login">Log in to try a demo purchase</a> }
  </div></article> }
`, })
export class PropertyPage {
  private readonly api = inject(ApiService); private readonly route = inject(ActivatedRoute); protected readonly auth = inject(AuthService);
  readonly property = signal<Property | null>(null); readonly error = signal('');
  constructor() { this.route.paramMap.subscribe(params => { const id = Number(params.get('id')); if (!id) { this.error.set('It may have been removed or the link may be incorrect.'); return; } this.api.property(id).subscribe({ next: p => this.property.set(p), error: e => this.error.set(apiError(e)) }); }); }
}

@Component({ standalone: true, imports: [ReactiveFormsModule, RouterLink], template: `
  <section class="form-layout"><div class="form-intro"><p class="eyebrow">Welcome back</p><h1>Good places are worth coming back to.</h1><p>Log in to see your listings or pick up where you left off.</p></div>
    <form class="form-card" [formGroup]="form" (ngSubmit)="submit()"><h2>Log in</h2><p class="form-hint">Use the email linked to your account.</p>@if (error()) { <p class="message message-error">{{ error() }}</p> }
      <label for="email">Email address</label><input id="email" type="email" formControlName="email" autocomplete="email" required>
      <label for="password">Password</label><div class="password-field"><input id="password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" required><button class="password-toggle" type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showPassword()"><span aria-hidden="true">◉</span></button></div>
      <button class="button button-dark button-wide" type="submit" [disabled]="form.invalid || busy()">{{ busy() ? 'Logging in…' : 'Log in' }}</button><p class="form-switch">New here? <a routerLink="/register">Create an account</a></p>
    </form></section>
`, })
export class LoginPage {
  private readonly fb = inject(FormBuilder); private readonly api = inject(ApiService); private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  readonly error = signal(''); readonly busy = signal(false); readonly showPassword = signal(false);
  submit(): void { if (this.form.invalid) return; this.busy.set(true); this.api.login(this.form.getRawValue()).subscribe({ next: user => { this.auth.setUser(user); this.router.navigateByUrl('/'); }, error: e => { this.error.set(apiError(e)); this.busy.set(false); } }); }
}

@Component({ standalone: true, imports: [ReactiveFormsModule, RouterLink], template: `
  <section class="form-layout"><div class="form-intro"><p class="eyebrow">Join the neighborhood</p><h1>A place to find your next place.</h1><p>Create one account to browse, buy, or share a property of your own.</p></div>
    <form class="form-card" [formGroup]="form" (ngSubmit)="submit()"><h2>Create an account</h2><p class="form-hint">It only takes a minute to get started.</p>@if (error()) { <p class="message message-error">{{ error() }}</p> }
      <label for="name">Full name</label><input id="name" type="text" maxlength="100" formControlName="name" autocomplete="name" required>
      <label for="email">Email address</label><input id="email" type="email" maxlength="150" formControlName="email" autocomplete="email" required>
      <label for="password">Password</label><div class="password-field"><input id="password" [type]="showPassword() ? 'text' : 'password'" minlength="8" formControlName="password" autocomplete="new-password" required><button class="password-toggle" type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showPassword()"><span aria-hidden="true">◉</span></button></div>
      <button class="button button-dark button-wide" type="submit" [disabled]="form.invalid || busy()">{{ busy() ? 'Creating account…' : 'Create account' }}</button><p class="form-switch">Already a member? <a routerLink="/login">Log in</a></p>
    </form></section>
`, })
export class RegisterPage {
  private readonly fb = inject(FormBuilder); private readonly api = inject(ApiService); private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.maxLength(100)]], email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]], password: ['', [Validators.required, Validators.minLength(8)]] });
  readonly error = signal(''); readonly busy = signal(false); readonly showPassword = signal(false);
  submit(): void { if (this.form.invalid) return; this.busy.set(true); this.api.register(this.form.getRawValue()).subscribe({ next: user => { this.auth.setUser(user); this.router.navigateByUrl('/'); }, error: e => { this.error.set(apiError(e)); this.busy.set(false); } }); }
}

@Component({ standalone: true, imports: [ReactiveFormsModule], template: `
  <section class="form-page-heading"><p class="eyebrow">Share a place</p><h1>List your property</h1><p>Give people the details they need to picture themselves there.</p></section>
  <form class="form-card wide-form" [formGroup]="form" (ngSubmit)="submit()"><h2>Property details</h2><p class="form-hint">Fields marked with * are required.</p>@if (error()) { <p class="message message-error">{{ error() }}</p> }
    <div class="form-grid"><div class="form-field form-field-full"><label for="title">Listing title *</label><input id="title" type="text" maxlength="150" formControlName="title" placeholder="A bright home near the park" required></div>
    <div class="form-field"><label for="property_type">Property type *</label><select id="property_type" formControlName="property_type"><option>House</option><option>Condo</option><option>Land</option><option>Townhouse</option><option>Other</option></select></div><div class="form-field"><label for="price">Price (PHP) *</label><input id="price" type="number" min="1" step="0.01" formControlName="price" placeholder="3500000" required></div>
    <div class="form-field form-field-full"><label for="location">Location *</label><input id="location" maxlength="150" formControlName="location" placeholder="Quezon City, Metro Manila" required></div>
    <div class="form-field"><label for="bedrooms">Bedrooms <span class="optional">(optional)</span></label><input id="bedrooms" type="number" min="0" max="50" formControlName="bedrooms"></div><div class="form-field"><label for="bathrooms">Bathrooms <span class="optional">(optional)</span></label><input id="bathrooms" type="number" min="0" max="50" formControlName="bathrooms"></div>
    <div class="form-field form-field-full"><label for="description">Description *</label><textarea id="description" rows="5" formControlName="description" placeholder="Share a few helpful details about this place." required></textarea></div>
    <div class="form-field form-field-full"><label for="image">Property photo * <span class="optional">JPG, PNG, or WEBP · up to 2 MB</span></label><input id="image" type="file" accept="image/jpeg,image/png,image/webp" (change)="chooseFile($event)" required></div></div>
    <button class="button button-dark" type="submit" [disabled]="form.invalid || !file || busy()">{{ busy() ? 'Publishing…' : 'Publish listing' }} <span aria-hidden="true">↗</span></button>
  </form>
`, })
export class AddPropertyPage {
  private readonly fb = inject(FormBuilder); private readonly api = inject(ApiService); private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({ title: ['', [Validators.required, Validators.maxLength(150)]], property_type: ['House', Validators.required], price: ['', [Validators.required, Validators.min(1)]], location: ['', [Validators.required, Validators.maxLength(150)]], description: ['', Validators.required], bedrooms: ['', [Validators.min(0), Validators.max(50), Validators.pattern(/^\d+$/)]], bathrooms: ['', [Validators.min(0), Validators.max(50), Validators.pattern(/^\d+$/)]] });
  readonly error = signal(''); readonly busy = signal(false); file: File | null = null;
  chooseFile(event: Event): void { this.file = (event.target as HTMLInputElement).files?.[0] ?? null; }
  submit(): void {
    if (this.form.invalid || !this.file) { this.error.set('Please complete the required fields and choose one photo.'); return; }
    const body = new FormData(); Object.entries(this.form.getRawValue()).forEach(([key, value]) => body.append(key, value)); body.append('image', this.file);
    this.busy.set(true); this.api.createListing(body).subscribe({ next: () => this.router.navigateByUrl('/my-listings?posted=1'), error: e => { this.error.set(apiError(e)); this.busy.set(false); } });
  }
}

@Component({ standalone: true, imports: [RouterLink, PhpCurrencyPipe], template: `
  <section class="listings-section my-listings-section"><div class="section-heading"><div><p class="eyebrow">Your corner of Home Haven</p><h1>My listings</h1><p class="section-description">See the properties you've shared and their latest status.</p></div><a class="button button-dark" routerLink="/sell">Add a property <span aria-hidden="true">+</span></a></div>
    @if (posted()) { <p class="message message-success">Your property has been listed.</p> } @if (error()) { <p class="message message-error">{{ error() }}</p> }
    @if (properties().length) { <div class="property-grid">@for (p of properties(); track p.id) { <article class="property-card"><a class="property-image-link" [routerLink]="['/properties', p.id]"><img class="property-image" [src]="p.image_url" [alt]="'Photo of ' + p.title"><span class="image-label">{{ p.status }}</span></a><div class="property-card-body"><p class="property-location">{{ p.location }}</p><h2><a [routerLink]="['/properties', p.id]">{{ p.title }}</a></h2><p class="price">{{ p.price | phpCurrency }}</p>@if (p.status === 'Sold' && p.buyer_name) { <p class="buyer-note">Bought by <strong>{{ p.buyer_name }}</strong></p> }</div></article> }</div> }
    @else if (!error()) { <div class="empty-state"><span class="empty-icon" aria-hidden="true">⌂</span><h2>You haven't shared a property yet.</h2><p>Add your first listing and it will appear here.</p><a class="button button-dark" routerLink="/sell">List a property</a></div> }
  </section>
`, })
export class MyListingsPage {
  private readonly api = inject(ApiService); private readonly route = inject(ActivatedRoute);
  readonly properties = signal<Property[]>([]); readonly error = signal(''); readonly posted = signal(false);
  constructor() { this.posted.set(this.route.snapshot.queryParamMap.has('posted')); this.api.myListings().subscribe({ next: rows => this.properties.set(rows), error: e => this.error.set(apiError(e)) }); }
}

@Component({ standalone: true, imports: [RouterLink, PhpCurrencyPipe], template: `
  <section class="checkout-layout">
    @if (complete()) { <div class="checkout-success"><span class="success-mark">✓</span><p class="eyebrow">Demo purchase complete</p><h1>It's marked as sold.</h1><p>This is only a classroom demonstration. No payment was taken.</p>@if (property(); as p) { <div class="checkout-summary compact-summary"><img [src]="p.image_url" alt=""><div><p class="property-location">{{ p.location }}</p><h2>{{ p.title }}</h2><p class="price">{{ p.price | phpCurrency }}</p></div></div> }<a class="button button-dark" routerLink="/">Back to available properties</a></div> }
    @else if (property(); as p) { <div class="checkout-heading"><a class="back-link" [routerLink]="['/properties', p.id]">← Back to property</a><p class="eyebrow">A classroom demo</p><h1>Review your purchase</h1><p>No payment information is collected. Confirming will mark this property as sold.</p></div><div class="checkout-card"><div class="checkout-summary"><img [src]="p.image_url" alt=""><div><p class="property-location">{{ p.location }}</p><h2>{{ p.title }}</h2><p class="price">{{ p.price | phpCurrency }}</p></div></div>@if (error()) { <p class="message message-error">{{ error() }}</p> } @if (p.status !== 'Available' || auth.user()?.id === p.seller_id) { <a class="button button-dark button-wide" [routerLink]="['/properties', p.id]">Return to property</a> } @else { <div class="demo-notice"><strong>Simulated purchase</strong><span>No money changes hands in this capstone.</span></div><button class="button button-dark button-wide" type="button" [disabled]="busy()" (click)="confirm()">{{ busy() ? 'Confirming…' : 'Confirm demo purchase' }}</button> }</div> }
    @else if (error()) { <div class="empty-state page-empty"><h1>Property not found</h1><p>{{ error() }}</p><a class="button button-dark" routerLink="/">Browse properties</a></div> }
  </section>
`, })
export class CheckoutPage {
  private readonly api = inject(ApiService); private readonly route = inject(ActivatedRoute); protected readonly auth = inject(AuthService);
  readonly property = signal<Property | null>(null); readonly error = signal(''); readonly complete = signal(false); readonly busy = signal(false);
  constructor() { const id = Number(this.route.snapshot.paramMap.get('id')); this.api.property(id).subscribe({ next: p => this.property.set(p), error: e => this.error.set(apiError(e)) }); }
  confirm(): void { const p = this.property(); if (!p) return; this.busy.set(true); this.api.purchase(p.id).subscribe({ next: sold => { this.property.set(sold); this.complete.set(true); this.busy.set(false); }, error: e => { this.error.set(apiError(e)); this.busy.set(false); } }); }
}
