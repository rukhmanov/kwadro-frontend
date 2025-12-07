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
}





