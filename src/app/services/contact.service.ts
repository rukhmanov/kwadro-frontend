import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  constructor(private api: ApiService) {}

  sendMessage(contactData: any): Observable<any> {
    return this.api.post('/contact', contactData);
  }

  requestCallback(phone: string): Observable<any> {
    return this.api.post('/contact/callback', { phone });
  }

  requestInstallment(phone: string, productName?: string, productPrice?: number): Observable<any> {
    return this.api.post('/contact/installment', { phone, productName, productPrice });
  }

  requestAvailability(phone: string, productId: number, productName?: string): Observable<any> {
    return this.api.post('/contact/availability', { phone, productId, productName });
  }
}








