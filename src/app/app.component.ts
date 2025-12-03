import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { ChatService } from './services/chat.service';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
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
  private socket?: Socket;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private chatService: ChatService,
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
    this.socket = io('http://localhost:3000');
    
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

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
