import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Database, Shield, Zap, Sparkles } from 'lucide-react';

export default function Landing() {
  const fullText = "Chat with your documents, extract insights, and trigger actions. Powered by advanced RAG, perfectly isolated by workspace.";
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // Start typing after a short delay so the fade-in finishes first
    const delayTimeout = setTimeout(() => {
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < fullText.length) {
          setTypedText(fullText.slice(0, i + 1));
          i++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 35); // Fast typing speed
      
      return () => clearInterval(typingInterval);
    }, 600); // Wait for the 0.3s fade-in delay + animation

    return () => clearTimeout(delayTimeout);
  }, []);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <Sparkles size={24} style={{ color: 'var(--accent-primary)' }} />
          <span className="font-semibold text-lg gradient-text">DocAssist</span>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/signup" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-grid">
          <div className="hero-content-wrapper">
            <div className="badge badge-secondary mb-md inline-flex fade-in-up" style={{ animationDelay: '0.1s' }}>
              <Sparkles size={12} /> Introducing Workspace Agents
            </div>
            <h1 className="hero-title fade-in-up" style={{ animationDelay: '0.2s' }}>
              Your Intelligent <br />
              <span className="gradient-text">Document Assistant</span>
            </h1>
            <p className="hero-subtitle fade-in-up" style={{ animationDelay: '0.3s' }}>
              {typedText}
              {isTyping && <span className="typewriter-cursor">|</span>}
            </p>
            <div className="hero-cta fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Link to="/signup" className="btn btn-primary btn-lg">
                Start Building Free <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          
          <div className="hero-visual fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="hero-visual-container">
              <img src="/login-bg.png" alt="Abstract Jellyfish Visual" className="hero-image float-animation" />
              <div className="visual-glow"></div>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="hero-bg-glow"></div>
        <div className="hero-bg-glow secondary"></div>
      </header>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-grid">
          
          <div className="feature-card glass-card fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="feature-icon">
              <Shield size={24} />
            </div>
            <h3>Strict Isolation</h3>
            <p>Every workspace is completely isolated at the database level. Your AI only sees what it's supposed to see.</p>
          </div>

          <div className="feature-card glass-card fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="feature-icon">
              <Database size={24} />
            </div>
            <h3>Shared Vector Store</h3>
            <p>Documents are seamlessly chunked and embedded into a shared vector store, instantly ready for retrieval.</p>
          </div>

          <div className="feature-card glass-card fade-in-up" style={{ animationDelay: '0.7s' }}>
            <div className="feature-icon">
              <Bot size={24} />
            </div>
            <h3>Tool Calling Agents</h3>
            <p>Your AI isn't just a chatbot. It can create tasks, send notifications, and log its own actions.</p>
          </div>

          <div className="feature-card glass-card fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="feature-icon">
              <Zap size={24} />
            </div>
            <h3>Blazing Fast</h3>
            <p>Optimized with intelligent fallback algorithms, ensuring your workflow never gets blocked by API timeouts.</p>
          </div>

        </div>
      </section>

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: var(--bg-primary);
          overflow-x: hidden;
          position: relative;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-2xl);
          position: relative;
          z-index: 100;
          border-bottom: 1px solid rgba(127, 137, 149, 0.3);
          background: rgba(20, 18, 20, 0.8);
          backdrop-filter: blur(12px);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .nav-actions {
          display: flex;
          gap: var(--space-md);
        }

        .hero-section {
          padding: 80px 20px;
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-2xl);
          align-items: center;
        }

        .hero-content-wrapper {
          position: relative;
          z-index: 10;
          text-align: left;
        }

        .hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: var(--space-lg);
          letter-spacing: -0.03em;
        }

        .hero-subtitle {
          font-size: clamp(1.1rem, 1.8vw, 1.25rem);
          color: var(--text-secondary);
          max-width: 500px;
          min-height: 80px; /* Prevents height jumping while typing */
          margin-bottom: var(--space-2xl);
          line-height: 1.6;
        }

        .typewriter-cursor {
          display: inline-block;
          width: 2px;
          margin-left: 2px;
          color: var(--accent-primary);
          animation: blink 1s step-end infinite;
          vertical-align: text-bottom;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .hero-cta {
          display: flex;
          justify-content: flex-start;
          gap: var(--space-md);
        }

        /* Hero Visual & Animations */
        .hero-visual {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
        }

        .hero-visual-container {
          position: relative;
          width: 100%;
          max-width: 500px;
          aspect-ratio: 1;
          border-radius: 30px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
          opacity: 0.9;
          mask-image: radial-gradient(white, black);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
        }

        .visual-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle at center, var(--accent-primary-dim) 0%, transparent 70%);
          z-index: -1;
          filter: blur(40px);
          animation: pulse 8s ease-in-out infinite alternate;
        }

        .float-animation {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg) scale(1.02); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-content-wrapper {
            text-align: center;
          }
          .hero-subtitle {
            margin: 0 auto var(--space-2xl);
          }
          .hero-cta {
            justify-content: center;
          }
          .hero-visual-container {
            max-width: 400px;
            margin: 0 auto;
          }
        }

        .hero-bg-glow {
          position: absolute;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, var(--accent-primary-dim) 0%, transparent 60%);
          z-index: 1;
          pointer-events: none;
          animation: pulse 8s ease-in-out infinite;
        }

        .hero-bg-glow.secondary {
          background: radial-gradient(circle, var(--accent-secondary-dim) 0%, transparent 60%);
          top: 30%;
          animation-delay: -4s;
        }

        .features-section {
          padding: var(--space-2xl);
          max-width: 1200px;
          margin: 0 auto 100px;
          position: relative;
          z-index: 10;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-lg);
        }

        .feature-card {
          padding: var(--space-xl);
          text-align: left;
          border-color: rgba(127, 137, 149, 0.2);
          transition: transform var(--transition), border-color var(--transition);
        }

        .feature-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-primary);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: var(--bg-elevated);
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-md);
          border: 1px solid rgba(194, 199, 207, 0.2);
        }

        .feature-card h3 {
          font-size: 1.2rem;
          margin-bottom: var(--space-sm);
          color: var(--text-primary);
        }

        .feature-card p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
