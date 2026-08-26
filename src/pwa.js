export function initializePwa() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Service worker registration failed', error)));

  let installEvent;
  const button = document.createElement('button');
  button.className = 'pwa-install';
  button.textContent = 'Установить «ТСН: Управление посёлком»';
  button.hidden = true;
  button.addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    button.hidden = true;
  });
  document.body.append(button);
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; button.hidden = false; });
  window.addEventListener('appinstalled', () => { installEvent = null; button.hidden = true; });

  const status = document.createElement('div');
  status.className = 'network-status';
  status.hidden = navigator.onLine;
  status.textContent = 'Нет сети — доступна офлайн-оболочка';
  document.body.append(status);
  window.addEventListener('offline', () => { status.hidden = false; });
  window.addEventListener('online', () => { status.hidden = true; });
}
