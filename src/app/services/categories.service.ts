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

  createCategory(category: FormData): Observable<any> {
    return this.api.postFormData('/categories', category);
  }

  updateCategory(id: number, category: FormData): Observable<any> {
    return this.api.patchFormData(`/categories/${id}`, category);
  }

  deleteCategory(id: number): Observable<any> {
    return this.api.delete(`/categories/${id}`);
  }

  updateCategoryOrder(categoryOrders: { id: number; order: number }[]): Observable<any> {
    return this.api.post('/categories/reorder', categoryOrders);
  }
}

