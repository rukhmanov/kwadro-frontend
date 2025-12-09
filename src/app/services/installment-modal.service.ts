import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InstallmentModalService {
  private openModalSubject = new Subject<{ productName?: string; productPrice?: number }>();
  public openModal$ = this.openModalSubject.asObservable();

  openModal(productName?: string, productPrice?: number) {
    this.openModalSubject.next({ productName, productPrice });
  }
}
