import { Mail, MessageCircle, Clock, ShieldCheck, LifeBuoy, ArrowUpRight } from 'lucide-react';
import '../css/Contact.css';

const SUPPORT_EMAIL = 'support@kiwipredict.com';
const WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029VbDOi2G4Y9lwQoTCc03I';

const openSmartsuppChat = (event) => {
  event.preventDefault();
  if (window.smartsupp) {
    window.smartsupp('chat:show');
    window.smartsupp('chat:open');
  }
};

const channels = [
  {
    icon: Mail,
    title: 'Email us',
    value: SUPPORT_EMAIL,
    note: 'Best for account, payment, and VIP questions.',
    href: `mailto:${SUPPORT_EMAIL}`
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp channel',
    value: 'Follow Kiwi Predict',
    note: 'Official updates, announcements, and prediction alerts.',
    href: WHATSAPP_CHANNEL,
    external: true
  },
  {
    icon: LifeBuoy,
    title: 'Live chat',
    value: 'Chat with support',
    note: 'Fast help for VIP, access, or prediction page issues.',
    href: '#live-chat',
    onClick: openSmartsuppChat
  },
  {
    icon: Clock,
    title: 'Response time',
    value: 'Within 24 hours',
    note: 'Include your username and payment reference when relevant.',
    static: true
  },
  {
    icon: ShieldCheck,
    title: 'Safe support',
    value: 'No password requests',
    note: 'Kiwi Predict support will never ask for your password.',
    static: true
  }
];

const faqs = [
  { q: 'How do I access VIP predictions after paying?', a: 'Once your payment is confirmed, your account is upgraded right away. Open the VIP - 99% Sure Games page from the navigation to see booking codes and selections.' },
  { q: 'Which payment methods do you accept?', a: 'Payments are processed securely through Paystack using cards or bank transfer. A payment reference is generated for every transaction.' },
  { q: 'What should I include when emailing support?', a: 'Your registered username, the email used to sign up, and the payment reference for payment-related questions. This helps us resolve issues faster.' },
  { q: 'Is my booking code shared across bookmakers?', a: 'VIP booking codes are provided per bookmaker (SportyBet, Bet9ja, Football.com). The bet converter lets VVIP members convert codes between supported sportsbooks.' }
];

const Contact = () => (
  <div className="contact-page">
    <section className="contact-hero">
      <span className="contact-hero-eyebrow">
        <LifeBuoy size={16} />
        Contact Support
      </span>
      <h1 className="contact-hero-title">How can we help you?</h1>
      <p className="contact-hero-sub">
        Questions about predictions, VIP access, payments, or your account? Reach out and our team will get back to you as soon as possible.
      </p>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-hero-cta">
        Email support
        <ArrowUpRight size={18} />
      </a>
    </section>

    <section className="contact-grid">
      {channels.map((channel) => {
        const Icon = channel.icon;
        const inner = (
          <div className="contact-card-inner">
            <span className="contact-card-icon"><Icon size={24} /></span>
            <div className="contact-card-copy">
              <h2>{channel.title}</h2>
              <strong>{channel.value}</strong>
              <p>{channel.note}</p>
            </div>
          </div>
        );

        if (channel.static) {
          return (
            <div key={channel.title} className="contact-card">
              {inner}
            </div>
          );
        }

        const props = channel.external
          ? { href: channel.href, target: '_blank', rel: 'noreferrer' }
          : { href: channel.href, onClick: channel.onClick };

        return (
          <a key={channel.title} className="contact-card" {...props}>
            {inner}
          </a>
        );
      })}
    </section>

    <section className="contact-faq">
      <div className="contact-faq-header">
        <span className="contact-faq-eyebrow">Quick answers</span>
        <h2>Frequently asked questions</h2>
        <p>Covering the most common support questions before you reach out.</p>
      </div>
      <div className="contact-faq-list">
        {faqs.map((faq) => (
          <details key={faq.q} className="contact-faq-item">
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  </div>
);

export default Contact;