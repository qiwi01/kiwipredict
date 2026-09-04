import { useEffect, useState } from 'react';
import { MessageSquareMore, X } from 'lucide-react';

const SMARTSUPP_KEY = 'f91dfd08f8b4027c5bbebed0818316eb217413de';

const loadSmartsupp = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = SMARTSUPP_KEY;

  if (window.smartsupp) return;

  window.smartsupp = function smartsuppLoader() {
    window.smartsupp._.push(arguments);
  };
  window.smartsupp._ = [];

  // Hide Smartsupp's own default chat bubble — the custom floating
  // button below is the only chat launcher on the page.
  window.smartsupp('chat:hide');

  const firstScript = document.getElementsByTagName('script')[0];
  const script = document.createElement('script');
  script.id = 'smartsupp-live-chat-script';
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.async = true;
  script.src = 'https://www.smartsuppchat.com/loader.js?';
  firstScript.parentNode.insertBefore(script, firstScript);
};

const openSmartsuppChat = () => {
  if (window.smartsupp) {
    window.smartsupp('chat:show');
    window.smartsupp('chat:open');
  }
};

const SmartsuppChat = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadSmartsupp();
  }, []);

  const toggleChat = () => {
    if (window.smartsupp) {
      setOpen((prev) => {
        const next = !prev;
        if (next) {
          window.smartsupp('chat:show');
          window.smartsupp('chat:open');
        } else {
          window.smartsupp('chat:hide');
        }
        return next;
      });
    } else {
      setOpen(false);
    }
  };

  return (
    <button
      type="button"
      className={open ? 'smartsupp-fab open' : 'smartsupp-fab'}
      onClick={toggleChat}
      aria-label={open ? 'Close support chat' : 'Open support chat'}
      title="Chat with our support team"
    >
      {open ? <X size={22} /> : <MessageSquareMore size={22} />}
      {!open && <span className="smartsupp-fab-ping" />}
    </button>
  );
};

export default SmartsuppChat;