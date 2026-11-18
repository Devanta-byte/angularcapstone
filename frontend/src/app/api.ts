import { HttpClient } from '@angular/common/http';
import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

export interface User { id: number; name: string; email: string; }
export interface Property {
  id: number; seller_id: number; buyer_id: number | null; title: string;
  property_type: string; price: string; location: string; description: string;
  bedrooms: number | null; bathrooms: number | null; image: string; image_url: string;
  status: 'Available' | 'Sold'; seller_name: string; buyer_name?: string | null;
  created_at: string;
}
export interface ApiResult<T> { data: T; }

@Pipe({ name: 'phpCurrency', standalone: true, pure: true })
export class PhpCurrencyPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  transform(value: number | string | null | undefined): string { return this.formatter.format(Number(value ?? 0)); }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  properties(): Observable<Property[]> { return this.http.get<ApiResult<Property[]>>('/api/properties').pipe(map(r => r.data)); }
  property(id: number): Observable<Property> { return this.http.get<ApiResult<Property>>(`/api/properties/${id}`).pipe(map(r => r.data)); }
  myListings(): Observable<Property[]> { return this.http.get<ApiResult<Property[]>>('/api/my-listings').pipe(map(r => r.data)); }
  register(payload: {name: string; email: string; password: string}): Observable<User> { return this.http.post<ApiResult<User>>('/api/auth/register', payload).pipe(map(r => r.data)); }
  login(payload: {email: string; password: string}): Observable<User> { return this.http.post<ApiResult<User>>('/api/auth/login', payload).pipe(map(r => r.data)); }
  logout(): Observable<unknown> { return this.http.post('/api/auth/logout', {}); }
  createListing(form: FormData): Observable<Property> { return this.http.post<ApiResult<Property>>('/api/properties', form).pipe(map(r => r.data)); }
  purchase(id: number): Observable<Property> { return this.http.post<ApiResult<Property>>(`/api/properties/${id}/purchase`, {}).pipe(map(r => r.data)); }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<User | null>(null);
  readonly ready = signal(false);

  loadSession(): Observable<User | null> {
    return this.http.get<ApiResult<User | null>>('/api/auth/session').pipe(
      map(r => r.data), tap(user => { this.user.set(user); this.ready.set(true); }),
      catchError(() => { this.user.set(null); this.ready.set(true); return of(null); }),
    );
  }
  setUser(user: User): void { this.user.set(user); this.ready.set(true); }
  clearUser(): void { this.user.set(null); }
}

export function apiError(error: unknown): string {
  const candidate = error as { error?: { error?: string; message?: string } };
  return candidate?.error?.error ?? candidate?.error?.message ?? 'Something went wrong. Please try again.';
}
