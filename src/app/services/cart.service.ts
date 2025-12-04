import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private sessionId: string;
  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCountSubject.asObservable();

  constructor(private api: ApiService) {
    this.sessionId = this.getOrCreateSessionId();
    this.loadCartCount();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  getCart(): Observable<any> {
    return this.api.get(`/cart?sessionId=${this.sessionId}`);
  }

  addToCart(productId: number, quantity: number = 1): Observable<any> {
    return this.api.post('/cart/add', {
      sessionId: this.sessionId,
      productId,
      quantity
    });
  }

  updateQuantity(itemId: number, quantity: number): Observable<any> {
    return this.api.patch(`/cart/${itemId}`, { quantity });
  }

  removeItem(itemId: number): Observable<any> {
    return this.api.delete(`/cart/${itemId}`);
  }

  clearCart(): Observable<any> {
    return this.api.delete(`/cart?sessionId=${this.sessionId}`);
  }

  async loadCartCount() {
    this.getCart().subscribe(items => {
      const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      this.cartCountSubject.next(count);
    });
  }

  getCartCount(): Observable<number> {
    return this.cartCount$;
  }
}


