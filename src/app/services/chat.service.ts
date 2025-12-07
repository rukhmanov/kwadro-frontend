import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private api: ApiService) {}

  getMessages(): Observable<any[]> {
    return this.api.get('/chat/messages');
  }
}





