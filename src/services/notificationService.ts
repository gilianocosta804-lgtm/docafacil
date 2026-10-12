// Web Notifications API service for mobile driver calling alerts

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  vibrate?: number[];
}

class NotificationService {
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermissionState {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission as NotificationPermissionState;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  }

  // Send high-priority notification when driver is called
  public async sendCallNotification(
    motoristaNome: string,
    docaNome: string,
    placa: string,
    rota?: string
  ): Promise<boolean> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return false;
    }

    const title = `🚨 VOCÊ FOI CHAMADO! ${docaNome.toUpperCase()}`;
    const body = `Motorista ${motoristaNome} (${placa}): Compareça imediatamente à ${docaNome} para carregamento${
      rota ? ` da rota ${rota}` : ''
    }.`;

    const options: ExtendedNotificationOptions = {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      tag: `dock-call-${docaNome}-${Date.now()}`,
      renotify: true,
      requireInteraction: true, // Keep notification on screen until tapped
      vibrate: [300, 100, 300, 100, 600],
      data: {
        url: window.location.href,
        timestamp: Date.now(),
      },
    };

    try {
      // 1. Try Service Worker showNotification if active (recommended for Android mobile)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && 'showNotification' in registration) {
            await registration.showNotification(title, options);
            return true;
          }
        } catch (swErr) {
          // Fall back to standard Notification constructor
        }
      }

      // 2. Standard Notification constructor
      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (err) {
      console.warn('Failed to display browser notification:', err);
      return false;
    }
  }

  // Send notification when driver becomes #1 in queue
  public async sendNextInLineNotification(motoristaNome: string): Promise<boolean> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return false;
    }

    const title = '⭐ VOCÊ É O PRÓXIMO DA FILA!';
    const body = `${motoristaNome}, seu caminhão é o 1º da fila de espera. Prepare seu veículo e fique atento à liberação da doca.`;

    const options: ExtendedNotificationOptions = {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      tag: 'dock-next-in-line',
      renotify: true,
      vibrate: [200, 100, 200],
    };

    try {
      new Notification(title, options);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Test notification for the driver to verify permissions on their device
  public async sendTestNotification(): Promise<boolean> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification('🔔 Teste de Notificação DocaFácil', {
        body: 'Perfeito! Você receberá alertas no celular mesmo com a tela bloqueada ou em outro app quando for chamado.',
        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        tag: 'test-notification',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (err) {
      return false;
    }
  }
}

export const notificationService = new NotificationService();
