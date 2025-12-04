import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(private api: ApiService) {}

  getBackgroundImage(): Observable<{ url: string | null }> {
    return this.api.get('/settings/background-image');
  }

  getAllSettings(): Observable<Record<string, string | null>> {
    return this.api.get('/settings');
  }
}


