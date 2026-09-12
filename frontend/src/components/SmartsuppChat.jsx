import { useEffect } from 'react';

const SMARTSUPP_KEY = '1dbe32c20acd3227c9079428427dd63807c377df';

const loadSmartsupp = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = SMARTSUPP_KEY;

  if (window.smartsupp) return;

  window.smartsupp = function smartsuppLoader() {
    window.smartsupp._.push(arguments);
  };
  window.smartsupp._ = [];

  const firstScript = document.getElementsByTagName('script')[0];
  const script = document.createElement('script');
  script.id = 'smartsupp-live-chat-script';
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.async = true;
  script.src = 'https://www.smartsuppchat.com/loader.js?';
  firstScript.parentNode.insertBefore(script, firstScript);
};

// Render nothing — Smartsupp injects and shows its own native chat bubble.
const SmartsuppChat = () => {
  useEffect(() => {
    loadSmartsupp();
  }, []);

  return null;
};

export default SmartsuppChat;