import { useEffect } from 'react';
import { Mail, MessageCircle, Clock, ShieldCheck } from 'lucide-react';
import '../css/Contact.css';

const SMARTSUPP_KEY = 'f91dfd08f8b4027c5bbebed0818316eb217413de';
const SUPPORT_EMAIL = 'support@kiwipredict.com';
const WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029VbDOi2G4Y9lwQoTCc03I';

const loadSmartsupp = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = SMARTSUPP_KEY;

  if (window.smartsupp) {
    window.smartsupp('chat:show');
    return;
  }

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

const openSmartsuppChat = (event) => {
  event.preventDefault();

  if (window.smartsupp) {
    window.smartsupp('chat:show');
    window.smartsupp('chat:open');
  }
};

const Contact = () => {
  useEffect(() => {
    loadSmartsupp();

    return () => {
      if (window.smartsupp) {
        window.smartsupp('chat:hide');
      }
    };
  }, []);

  return (
    <div className="contact-container">
      <section className="contact-hero">
        <span className="contact-eyebrow">Contact Support</span>
        <h1 className="contact-title">Need help with Kiwi Predict?</h1>
        <p className="contact-subtitle">
          Send questions about predictions, VIP access, payments, account issues, or platform updates. Our team will reply as soon as possible.
        </p>
      </section>

      <section className="contact-grid">
        <a className="contact-card" href={`mailto:${SUPPORT_EMAIL}`}>
          <Mail className="contact-card-icon" />
          <div>
            <h2>Email us</h2>
            <p>{SUPPORT_EMAIL}</p>
            <span>Best for account, payment, and VIP questions.</span>
          </div>
        </a>

        <a className="contact-card" href={WHATSAPP_CHANNEL} target="_blank" rel="noreferrer">
          <MessageCircle className="contact-card-icon" />
          <div>
            <h2>WhatsApp channel</h2>
            <p>Follow Kiwi Predict</p>
            <span>Get official updates, announcements, and prediction alerts from our WhatsApp channel.</span>
          </div>
        </a>

        <a className="contact-card" href="#live-chat" onClick={openSmartsuppChat}>
          <MessageCircle className="contact-card-icon" />
          <div>
            <h2>Live chat</h2>
            <p>Chat with support</p>
            <span>Use Smartsupp live chat for fast help with VIP, access, or prediction page issues.</span>
          </div>
        </a>

        <div className="contact-card contact-card-static">
          <Clock className="contact-card-icon" />
          <div>
            <h2>Response time</h2>
            <p>Within 24 hours</p>
            <span>Include your username and payment reference when relevant.</span>
          </div>
        </div>

        <div className="contact-card contact-card-static">
          <ShieldCheck className="contact-card-icon" />
          <div>
            <h2>Safe support</h2>
            <p>No password requests</p>
            <span>Kiwi Predict support will never ask for your password.</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;