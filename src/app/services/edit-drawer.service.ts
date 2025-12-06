import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EditDrawerService {
  private openDrawerSubject = new Subject<{ entity: any | null; type: 'product' | 'news' | 'category' }>();
  public openDrawer$ = this.openDrawerSubject.asObservable();

  open(entity: any | null, type: 'product' | 'news' | 'category') {
    this.openDrawerSubject.next({ entity, type });
  }
}


