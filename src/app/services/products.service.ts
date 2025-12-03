import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  constructor(private api: ApiService) {}

  getProducts(categoryId?: number): Observable<any[]> {
    const url = categoryId ? `/products?categoryId=${categoryId}` : '/products';
    return this.api.get(url);
  }

  getProduct(id: number): Observable<any> {
    return this.api.get(`/products/${id}`);
  }

  createProduct(product: FormData): Observable<any> {
    return this.api.postFormData('/products', product);
  }

  updateProduct(id: number, product: FormData): Observable<any> {
    return this.api.patchFormData(`/products/${id}`, product);
  }

  deleteProduct(id: number): Observable<any> {
    return this.api.delete(`/products/${id}`);
  }
}

