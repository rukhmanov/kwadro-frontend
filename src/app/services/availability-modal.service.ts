import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityModalService {
  private openModalSubject = new Subject<{ productId: number; productName?: string }>();
  public openModal$ = this.openModalSubject.asObservable();

  openModal(productId: number, productName?: string) {
    this.openModalSubject.next({ productId, productName });
  }
}

