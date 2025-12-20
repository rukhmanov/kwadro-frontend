import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

declare var ymaps: any;

// Типизация для Яндекс.Метрики
declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: any[]) => void;
  }
}
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { ChatService } from './services/chat.service';
import { SettingsService } from './services/settings.service';
import { EditDrawerService } from './services/edit-drawer.service';
import { ContactService } from './services/contact.service';
import { InstallmentModalService } from './services/installment-modal.service';
import { TermsAcceptanceComponent } from './terms-acceptance/terms-acceptance.component';
import { EditDrawerComponent } from './edit-drawer/edit-drawer.component';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, RouterModule, TermsAcceptanceComponent, EditDrawerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'MOTOмаркет';
  isLoggedIn = false;
  cartCount = 0;
  showChat = true;
  chatOpen = false;
  chatMessage = '';
  chatMessages: any[] = [];
  mobileMenuOpen = false;
  chatSessionId: string = '';
  chatNumber: number | null = null;
  @ViewChild('chatMessagesContainer', { static: false }) chatMessagesRef?: ElementRef;
  editDrawerOpen = false;
  editEntity: any = null;
  editEntityType: 'product' | 'news' | 'category' = 'product';
  showPhoneDropdown = false;
  showChatDropdown = false;
  showCallbackModal = false;
  callbackPhone = '';
  isSubmittingCallback = false;
  callbackSuccess = false;
  callbackError = '';
  showInstallmentModal = false;
  installmentPhone = '';
  installmentProductName = '';
  installmentProductPrice: number | null = null;
  isSubmittingInstallment = false;
  installmentSuccess = false;
  installmentError = '';
  showChatActionModal = false;
  private socket?: Socket;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private chatService: ChatService,
    private settingsService: SettingsService,
    private editDrawerService: EditDrawerService,
    private contactService: ContactService,
    private installmentModalService: InstallmentModalService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isLoggedIn = isAuth;
    });

    this.cartService.getCartCount().subscribe(count => {
      this.cartCount = count;
    });

    this.initChat();
    this.initChatSession();
    this.loadBackgroundImage();

    // Подписка на открытие дровера
    this.editDrawerService.openDrawer$.subscribe(({ entity, type }) => {
      this.openEditDrawer(entity, type);
    });

    // Подписка на открытие модального окна рассрочки
    this.installmentModalService.openModal$.subscribe(({ productName, productPrice }) => {
      this.openInstallmentModal(productName, productPrice);
    });

    // Подписка на изменения роута для обновления данных и отслеживания просмотров
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      // Компоненты сами перезагрузят данные при навигации
      
      // Отслеживание просмотра страницы в Яндекс.Метрике
      if (typeof window !== 'undefined' && window.ym) {
        window.ym(105945878, 'hit', event.urlAfterRedirects);
      }
    });

    // Загрузка скрипта Яндекс.Карты
    this.loadYandexMapsScript();
  }

  loadYandexMapsScript() {
    if (document.getElementById('yandex-maps-script')) {
      return;
    }
    const script = document.createElement('script');
    script.id = 'yandex-maps-script';
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=&lang=ru_RU';
    script.async = true;
    document.head.appendChild(script);
  }

  ngAfterViewInit() {
    // Инициализация карты в футере
    setTimeout(() => {
      if (typeof ymaps !== 'undefined') {
        ymaps.ready(() => {
          this.initFooterMap();
        });
      } else {
        // Если API еще не загружен, ждем и пробуем снова
        const checkInterval = setInterval(() => {
          if (typeof ymaps !== 'undefined') {
            clearInterval(checkInterval);
            ymaps.ready(() => {
              this.initFooterMap();
            });
          }
        }, 100);
        // Останавливаем проверку через 10 секунд
        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    }, 1000);
  }

  initFooterMap() {
    if (!document.getElementById('footer-yandex-map')) {
      return;
    }

    // Темные стили для карты
    const darkStyles = [
      {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#1a1a1a"
          }
        ]
      },
      {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#ffffff"
          }
        ]
      },
      {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#1a1a1a"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#0e1626"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#2d2d2d"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#3d3d3d"
          }
        ]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#1a1a1a"
          }
        ]
      }
    ];

    // Точные координаты Гайдара 61 д, Дзержинск
    const coordinates = [56.232929, 43.435260];
    
    const mapElement = document.getElementById('footer-yandex-map');
    if (!mapElement) {
      return;
    }

    // Определяем, нужно ли смещать центр карты влево (на планшетах и десктопах)
    const isMobile = window.innerWidth < 768;
    let mapCenter = coordinates;
    
    // На планшетах и десктопах смещаем центр карты влево, чтобы адрес не перекрывался блоком слева
    if (!isMobile) {
      // Смещаем долготу влево примерно на 0.006 градуса (около 400-600 метров)
      mapCenter = [coordinates[0], coordinates[1] - 0.006];
    }
    const map = new ymaps.Map('footer-yandex-map', {
      center: mapCenter,
      zoom: 16,
      controls: ['zoomControl']
    });
    
    // Убеждаемся, что карта правильно отображается
    setTimeout(() => {
      map.container.fitToViewport();
    }, 100);

    // Перемещаем элементы управления масштабом в правый верхний угол
    map.controls.get('zoomControl').options.set('position', {
      top: 10,
      right: 10
    });

    // Применяем темные стили к карте
    map.options.set('theme', darkStyles);

    // Создаем кастомный HTML-маркер в виде сообщения с хвостиком
    const MyIconContentLayout = ymaps.templateLayoutFactory.createClass(
      '<div style="position: relative; display: flex; flex-direction: column; align-items: center;">' +
        '<div style="position: relative; background: rgba(26, 26, 26, 0.95); border: 2px solid rgba(231, 77, 16, 0.9); border-radius: 12px; padding: 8px 10px; color: white; font-size: 13px; font-weight: 600; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); margin-bottom: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px;">' +
          '<img src="assets/motomarketlogo.svg" alt="MOTOмаркет" style="width: 120px; height: 60px; object-fit: contain; flex-shrink: 0; margin: 0">' +
          '<div style="display: flex; flex-direction: column; align-items: center; text-align: center;"><a href="https://yandex.ru/navi/org/motomarket/145660961546" target="_blank" rel="noopener noreferrer" style="color: white; text-decoration: none;">Дзержинск, <br><span style="white-space: nowrap;">Гайдара 61&nbsp;д</span></a></div>' +
          '<div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid rgba(231, 77, 16, 0.9);"></div>' +
          '<div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid rgba(26, 26, 26, 0.95);"></div>' +
        '</div>' +
      '</div>'
    );

    const placemark = new ymaps.Placemark(coordinates, {
      balloonContentHeader: '<strong>MOTOмаркет</strong>',
      balloonContentBody: '<p><a href="https://yandex.ru/navi/org/motomarket/145660961546" target="_blank" rel="noopener noreferrer">Гайдара 61 д, Дзержинск</a></p>',
      balloonContentFooter: '',
      hintContent: 'Гайдара 61 д, Дзержинск'
    }, {
      iconLayout: MyIconContentLayout,
      iconShape: {
        type: 'Rectangle',
        coordinates: [[-80, -180], [80, 10]]
      },
      iconOffset: [0, -120]
    });

    map.geoObjects.add(placemark);
  }

  loadBackgroundImage() {
    this.settingsService.getBackgroundImage().subscribe(response => {
      if (response.url) {
        document.body.style.backgroundImage = `url(${response.url})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundColor = '#1a1a1a'; // Fallback цвет
        // Добавляем затемнение для лучшей читаемости текста
        document.body.style.position = 'relative';
        let overlay = document.getElementById('background-overlay') as HTMLElement;
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'background-overlay';
          document.body.appendChild(overlay);
        }
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
          z-index: -1;
          pointer-events: none;
        `;
      } else {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundRepeat = '';
        document.body.style.backgroundAttachment = '';
        document.body.style.backgroundColor = '#1a1a1a';
        const overlay = document.getElementById('background-overlay');
        if (overlay) {
          overlay.remove();
        }
      }
    });
  }

  initChatSession() {
    // Генерируем или получаем уникальный ID сессии из localStorage
    let sessionId = localStorage.getItem('chatSessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem('chatSessionId', sessionId);
    }
    this.chatSessionId = sessionId;
  }

  generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  initChat() {
    this.socket = io(environment.apiUrl);
    
    this.socket.on('connect', () => {
      console.log('Connected to chat');
      // Присоединяемся к сессии
      if (this.chatSessionId) {
        this.socket?.emit('join-session', { sessionId: this.chatSessionId });
      }
    });

    this.socket.on('messages', (messages: any[]) => {
      this.chatMessages = messages;
      this.scrollToBottom();
    });

    this.socket.on('message', (message: any) => {
      this.chatMessages.push(message);
      this.scrollToBottom();
    });

    this.socket.on('chat-number', (data: { chatNumber: number }) => {
      this.chatNumber = data.chatNumber;
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatMessagesRef?.nativeElement) {
        this.chatMessagesRef.nativeElement.scrollTop = 
          this.chatMessagesRef.nativeElement.scrollHeight;
      }
    }, 100);
  }

  toggleChat() {
    this.chatOpen = !this.chatOpen;
  }

  toggleChatDropdown() {
    if (!this.chatOpen) {
      this.showChatDropdown = !this.showChatDropdown;
    } else {
      this.chatOpen = !this.chatOpen;
    }
  }

  closeChatDropdown() {
    this.showChatDropdown = false;
  }

  openChat() {
    this.chatOpen = true;
    this.showChatActionModal = false;
  }

  openChatFromDropdown() {
    this.chatOpen = true;
    this.showPhoneDropdown = false;
    this.showChatDropdown = false;
  }

  closeChatActionModal() {
    this.showChatActionModal = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  sendMessage() {
    if (this.chatMessage.trim()) {
      const username = this.isLoggedIn ? 'Admin' : 'Гость';
      this.socket?.emit('message', {
        sessionId: this.chatSessionId,
        username,
        message: this.chatMessage,
        isAdmin: this.isLoggedIn
      });
      this.chatMessage = '';
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  openEditDrawer(entity: any | null, type: 'product' | 'news' | 'category') {
    this.editEntity = entity;
    this.editEntityType = type;
    this.editDrawerOpen = true;
  }

  closeEditDrawer() {
    this.editDrawerOpen = false;
    this.editEntity = null;
  }

  onEntitySaved(entity: any) {
    this.closeEditDrawer();
    // Перезагружаем текущую страницу для обновления данных
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  requestCallback() {
    this.showCallbackModal = true;
    this.showPhoneDropdown = false;
    this.callbackPhone = '';
    this.callbackSuccess = false;
    this.callbackError = '';
  }

  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  togglePhoneDropdown(event: Event) {
    if (this.isMobile) {
      event.preventDefault();
      this.showPhoneDropdown = !this.showPhoneDropdown;
    }
  }

  closePhoneDropdown(event: Event) {
    event.stopPropagation();
    this.showPhoneDropdown = false;
  }

  closeCallbackModal() {
    this.showCallbackModal = false;
    this.callbackPhone = '';
    this.callbackSuccess = false;
    this.callbackError = '';
  }

  isPhoneValid(): boolean {
    const phoneDigits = this.callbackPhone.replace(/\D/g, '').replace(/^7/, '');
    return phoneDigits.length >= 10;
  }

  isInstallmentPhoneValid(): boolean {
    const phoneDigits = this.installmentPhone.replace(/\D/g, '').replace(/^7/, '');
    return phoneDigits.length >= 10;
  }

  submitCallback() {
    if (!this.isPhoneValid()) {
      this.callbackError = 'Пожалуйста, введите корректный номер телефона';
      return;
    }

    this.isSubmittingCallback = true;
    this.callbackError = '';
    this.callbackSuccess = false;

    this.contactService.requestCallback(this.callbackPhone).subscribe({
      next: () => {
        this.isSubmittingCallback = false;
        this.callbackSuccess = true;
        
        // Закрываем модальное окно через 2 секунды
        setTimeout(() => {
          this.closeCallbackModal();
        }, 2000);
      },
      error: (error) => {
        this.isSubmittingCallback = false;
        this.callbackError = error.error?.message || 'Произошла ошибка. Попробуйте еще раз.';
      }
    });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;
    let value = input.value;
    
    const digitsBeforeCursor = (value.substring(0, cursorPosition).match(/\d/g) || []).length;
    let digits = value.replace(/\D/g, '');
    
    if (digits.startsWith('7')) {
      digits = digits.substring(1);
    } else if (digits.startsWith('8')) {
      digits = digits.substring(1);
    }
    
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    
    let formatted = '+7';
    if (digits.length > 0) {
      formatted += ' (' + digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += ') ' + digits.substring(3, 6);
        if (digits.length > 6) {
          formatted += '-' + digits.substring(6, 8);
          if (digits.length > 8) {
            formatted += '-' + digits.substring(8, 10);
          }
        }
      } else if (digits.length === 3) {
        formatted += ')';
      }
    }
    
    this.callbackPhone = formatted;
    
    setTimeout(() => {
      let newCursorPos = this.calculateCursorPosition(formatted, digitsBeforeCursor);
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  private calculateCursorPosition(formatted: string, digitsBefore: number): number {
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitCount++;
        if (digitCount === digitsBefore) {
          return Math.min(i + 1, formatted.length);
        }
      }
    }
    return formatted.length;
  }

  onPhoneKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    
    const allowedKeys = [8, 9, 13, 27, 37, 38, 39, 40, 46, 35, 36];
    if (allowedKeys.indexOf(event.keyCode) !== -1) {
      if (event.keyCode === 8 && selectionStart <= 3 && selectionEnd <= 3) {
        event.preventDefault();
        return;
      }
      if (event.keyCode === 46 && selectionStart < 3 && selectionEnd <= 3) {
        event.preventDefault();
        return;
      }
      return;
    }
    
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    
    if (selectionStart < 3 && !event.ctrlKey && !event.metaKey) {
      if (event.keyCode !== 8 && event.keyCode !== 46) {
        setTimeout(() => {
          input.setSelectionRange(3, 3);
        }, 0);
      }
    }
  }

  onPhoneFocus(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.value || input.value.trim() === '') {
      this.callbackPhone = '+7';
      setTimeout(() => {
        input.setSelectionRange(3, 3);
      }, 0);
    }
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const pastedText = event.clipboardData?.getData('text') || '';
    
    let digits = pastedText.replace(/\D/g, '');
    
    if (digits.startsWith('7')) {
      digits = digits.substring(1);
    } else if (digits.startsWith('8')) {
      digits = digits.substring(1);
    }
    
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    
    let formatted = '+7';
    if (digits.length > 0) {
      formatted += ' (' + digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += ') ' + digits.substring(3, 6);
        if (digits.length > 6) {
          formatted += '-' + digits.substring(6, 8);
          if (digits.length > 8) {
            formatted += '-' + digits.substring(8, 10);
          }
        }
      } else if (digits.length === 3) {
        formatted += ')';
      }
    }
    
    this.callbackPhone = formatted;
    
    setTimeout(() => {
      input.setSelectionRange(formatted.length, formatted.length);
    }, 0);
  }

  // Методы для рассрочки
  openInstallmentModal(productName?: string, productPrice?: number) {
    this.showInstallmentModal = true;
    this.installmentPhone = '';
    this.installmentProductName = productName || '';
    this.installmentProductPrice = productPrice || null;
    this.installmentSuccess = false;
    this.installmentError = '';
  }

  closeInstallmentModal() {
    this.showInstallmentModal = false;
    this.installmentPhone = '';
    this.installmentProductName = '';
    this.installmentProductPrice = null;
    this.installmentSuccess = false;
    this.installmentError = '';
  }

  onInstallmentPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;
    let value = input.value;
    
    let digits = value.replace(/\D/g, '');
    
    if (digits.startsWith('7')) {
      digits = digits.substring(1);
    } else if (digits.startsWith('8')) {
      digits = digits.substring(1);
    }
    
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    
    let formatted = '+7';
    if (digits.length > 0) {
      formatted += ' (' + digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += ') ' + digits.substring(3, 6);
        if (digits.length > 6) {
          formatted += '-' + digits.substring(6, 8);
          if (digits.length > 8) {
            formatted += '-' + digits.substring(8, 10);
          }
        }
      } else if (digits.length === 3) {
        formatted += ')';
      }
    }
    
    this.installmentPhone = formatted;
    
    setTimeout(() => {
      input.setSelectionRange(formatted.length, formatted.length);
    }, 0);
  }

  onInstallmentPhoneKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value.length <= 3) {
      event.preventDefault();
      this.installmentPhone = '+7';
    }
  }

  onInstallmentPhoneFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    if (!this.installmentPhone || this.installmentPhone === '+7') {
      this.installmentPhone = '+7';
      setTimeout(() => {
        input.setSelectionRange(3, 3);
      }, 0);
    }
  }

  onInstallmentPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    
    let digits = pastedText.replace(/\D/g, '');
    
    if (digits.startsWith('7')) {
      digits = digits.substring(1);
    } else if (digits.startsWith('8')) {
      digits = digits.substring(1);
    }
    
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    
    let formatted = '+7';
    if (digits.length > 0) {
      formatted += ' (' + digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += ') ' + digits.substring(3, 6);
        if (digits.length > 6) {
          formatted += '-' + digits.substring(6, 8);
          if (digits.length > 8) {
            formatted += '-' + digits.substring(8, 10);
          }
        }
      } else if (digits.length === 3) {
        formatted += ')';
      }
    }
    
    this.installmentPhone = formatted;
  }

  submitInstallment() {
    if (!this.isInstallmentPhoneValid()) {
      this.installmentError = 'Пожалуйста, введите корректный номер телефона';
      return;
    }

    this.isSubmittingInstallment = true;
    this.installmentError = '';
    this.installmentSuccess = false;

    this.contactService.requestInstallment(
      this.installmentPhone,
      this.installmentProductName || undefined,
      this.installmentProductPrice || undefined
    ).subscribe({
      next: () => {
        this.isSubmittingInstallment = false;
        this.installmentSuccess = true;
        
        // Закрываем модальное окно через 2 секунды
        setTimeout(() => {
          this.closeInstallmentModal();
        }, 2000);
      },
      error: (error) => {
        this.isSubmittingInstallment = false;
        this.installmentError = error.error?.message || 'Произошла ошибка. Попробуйте еще раз.';
      }
    });
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
