import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  constructor(private api: ApiService) {}

  getProducts(categoryId?: number): Observable<any[]> {
    const url = categoryId ? `/products?categoryId=${categoryId}` : '/products';
    return this.api.get(url).pipe(
      map((response: any) => {
        // Если ответ - объект с пагинацией, возвращаем массив products
        if (response && typeof response === 'object' && 'products' in response) {
          return response.products;
        }
        // Иначе возвращаем как есть (массив)
        return Array.isArray(response) ? response : [];
      })
    );
  }

  getProductsPaginated(params?: {
    categoryId?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    page?: number;
    limit?: number;
  }): Observable<{ products: any[]; total: number; page: number; limit: number; totalPages: number }> {
    let url = '/products?';
    const queryParams: string[] = [];
    
    if (params?.categoryId) {
      queryParams.push(`categoryId=${params.categoryId}`);
    }
    if (params?.search) {
      queryParams.push(`search=${encodeURIComponent(params.search)}`);
    }
    if (params?.sortBy) {
      queryParams.push(`sortBy=${params.sortBy}`);
    }
    if (params?.sortOrder) {
      queryParams.push(`sortOrder=${params.sortOrder}`);
    }
    if (params?.minPrice !== undefined) {
      queryParams.push(`minPrice=${params.minPrice}`);
    }
    if (params?.maxPrice !== undefined) {
      queryParams.push(`maxPrice=${params.maxPrice}`);
    }
    if (params?.inStock !== undefined) {
      queryParams.push(`inStock=${params.inStock}`);
    }
    if (params?.page !== undefined) {
      queryParams.push(`page=${params.page}`);
    }
    if (params?.limit !== undefined) {
      queryParams.push(`limit=${params.limit}`);
    }
    
    url += queryParams.join('&');
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

  getCategorySpecifications(categoryId: number): Observable<string[]> {
    return this.api.get(`/products/category/${categoryId}/specifications`);
  }
}

