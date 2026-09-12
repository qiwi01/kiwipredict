import '../css/Loading.css';

// Animated loading state: a drifting football + three bouncing dots.
const Loading = ({ label = 'Loading' }) => (
  <div className="kiwi-loading" role="status" aria-live="polite">
    <div className="kiwi-loading-ball" aria-hidden="true">⚽</div>
    <div className="kiwi-loading-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
    {label && <p className="kiwi-loading-label">{label}</p>}
  </div>
);

export default Loading;