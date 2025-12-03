import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  constructor(private api: ApiService) {}

  getNews(): Observable<any[]> {
    return this.api.get('/news');
  }

  getNewsItem(id: number): Observable<any> {
    return this.api.get(`/news/${id}`);
  }

  createNews(news: FormData): Observable<any> {
    return this.api.postFormData('/news', news);
  }

  updateNews(id: number, news: FormData): Observable<any> {
    return this.api.patchFormData(`/news/${id}`, news);
  }

  deleteNews(id: number): Observable<any> {
    return this.api.delete(`/news/${id}`);
  }
}

