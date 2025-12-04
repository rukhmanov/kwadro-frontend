import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-terms-acceptance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './terms-acceptance.component.html',
  styleUrl: './terms-acceptance.component.scss'
})
export class TermsAcceptanceComponent implements OnInit, OnDestroy {
  showModal = false;
  accepted = false;
  isBlocking = false;
  isOnAgreementPage = false;
  private readonly TERMS_ACCEPTED_KEY = 'terms_accepted';
  private readonly ALLOWED_ROUTES = ['/privacy', '/terms'];

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkTermsAcceptance();
    
    // Следим за изменениями маршрута
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateModalState();
      });
  }

  ngOnDestroy() {
    // Восстанавливаем прокрутку и взаимодействие при уничтожении компонента
    this.restoreBodyStyles();
  }

  checkTermsAcceptance() {
    const termsAccepted = localStorage.getItem(this.TERMS_ACCEPTED_KEY);
    if (!termsAccepted || termsAccepted !== 'true') {
      this.updateModalState();
    }
  }

  updateModalState() {
    const currentRoute = this.router.url.split('?')[0]; // Убираем query параметры
    this.isOnAgreementPage = this.ALLOWED_ROUTES.some(route => currentRoute === route);
    
    const termsAccepted = localStorage.getItem(this.TERMS_ACCEPTED_KEY);
    const shouldShow = !termsAccepted || termsAccepted !== 'true';
    
    this.showModal = shouldShow;
    
    // Блокируем экран только если не на страницах соглашений
    if (shouldShow && !this.isOnAgreementPage) {
      this.isBlocking = true;
      this.blockBody();
    } else {
      this.isBlocking = false;
      this.restoreBodyStyles();
    }
  }

  blockBody() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  restoreBodyStyles() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }

  onCheckboxChange() {
    // Метод для обработки изменения чекбокса
  }

  acceptTerms() {
    if (this.accepted) {
      localStorage.setItem(this.TERMS_ACCEPTED_KEY, 'true');
      this.showModal = false;
      this.isBlocking = false;
      this.restoreBodyStyles();
    }
  }
}
