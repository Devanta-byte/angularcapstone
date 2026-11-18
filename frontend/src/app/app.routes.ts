import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './api';
import { AddPropertyPage, CheckoutPage, HomePage, LoginPage, MyListingsPage, PropertyPage, RegisterPage } from './pages';

const signedIn: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.loadSession().pipe(map(user => user ? true : router.createUrlTree(['/login'])));
};
const signedOut: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.loadSession().pipe(map(user => user ? router.createUrlTree(['/']) : true));
};

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Home Haven | Find a place to call home' },
  { path: 'login', component: LoginPage, canActivate: [signedOut], title: 'Log in | Home Haven' },
  { path: 'register', component: RegisterPage, canActivate: [signedOut], title: 'Create account | Home Haven' },
  { path: 'properties/:id', component: PropertyPage, title: 'Property | Home Haven' },
  { path: 'sell', component: AddPropertyPage, canActivate: [signedIn], title: 'List a property | Home Haven' },
  { path: 'my-listings', component: MyListingsPage, canActivate: [signedIn], title: 'My listings | Home Haven' },
  { path: 'checkout/:id', component: CheckoutPage, canActivate: [signedIn], title: 'Demo checkout | Home Haven' },
  { path: '**', redirectTo: '' },
];
