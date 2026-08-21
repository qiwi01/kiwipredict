import { Mail, MessageCircle, Clock, ShieldCheck } from 'lucide-react';
import '../css/Contact.css';

const Contact = () => {
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
        <a className="contact-card" href="mailto:support@kiwipredict.com">
          <Mail className="contact-card-icon" />
          <div>
            <h2>Email us</h2>
            <p>support@kiwipredict.com</p>
            <span>Best for account, payment, and VIP questions.</span>
          </div>
        </a>

        <a className="contact-card" href="mailto:support@kiwipredict.com?subject=Kiwi%20Predict%20support%20request">
          <MessageCircle className="contact-card-icon" />
          <div>
            <h2>VIP and access help</h2>
            <p>Send a support request</p>
            <span>Use this for subscription, access, or prediction page issues.</span>
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