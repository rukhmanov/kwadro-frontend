import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  constructor(private api: ApiService) {}

  getCategories(): Observable<any[]> {
    return this.api.get('/categories');
  }

  getCategory(id: number): Observable<any> {
    return this.api.get(`/categories/${id}`);
  }

  createCategory(category: any): Observable<any> {
    return this.api.post('/categories', category);
  }

  updateCategory(id: number, category: any): Observable<any> {
    return this.api.patch(`/categories/${id}`, category);
  }

  deleteCategory(id: number): Observable<any> {
    return this.api.delete(`/categories/${id}`);
  }
}

