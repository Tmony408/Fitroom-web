'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import SmartImage from '@/components/SmartImage';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { IMAGES } from '@/lib/images';

const STEPS = [
  { ic: '📐', t: 'Capture once', d: 'Save your measurements with a confidence score. Edit anytime — no tape-measure guesswork over WhatsApp.' },
  { ic: '🎨', t: 'Design your fit', d: 'Pick the style, fabric and details. See a live size recommendation before you ever pay.' },
  { ic: '🧵', t: 'Track to your door', d: 'Your designer quotes, cuts and sews — you follow every stage from quote to delivery.' },
];
const TAGS = ['Senator', 'Kaftan', 'Agbada', 'Asoebi', 'Bridal', 'Native wear', 'Bespoke', 'Diaspora'];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(user.role === 'DESIGNER' ? '/designer' : '/shop');
  }, [user, loading, router]);

  if (loading) return <div className="center"><div className="skeleton" style={{ width: 220, height: 22 }} /></div>;

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div>
          <FadeIn><span className="eyebrow">✦ AI fit for African couture</span></FadeIn>
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.7, 0.2, 1], delay: 0.05 }}>
            Custom <span className="gradtext">senator &amp; kaftan</span>, fitted from anywhere.
          </motion.h1>
          <FadeIn delay={0.18}>
            <p className="sub">Order bespoke African fashion from designers back home — measurements captured once, fit confirmed before you pay, production tracked to your door.</p>
          </FadeIn>
          <FadeIn delay={0.28}>
            <div className="row">
              <Link href="/register" className="btn">Start your fit profile →</Link>
              <Link href="/login" className="btn ghost">I have an account</Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <div className="marquee" style={{ marginTop: 28 }}>
              <div className="marquee-track">
                {[...TAGS, ...TAGS].map((t, i) => <span className="chip" key={i}>{t}</span>)}
              </div>
            </div>
          </FadeIn>
        </div>

        <motion.div
          className="hero-img floaty"
          initial={{ opacity: 0, scale: 0.94, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 0.7, 0.2, 1], delay: 0.15 }}>
          <SmartImage src={IMAGES.hero} alt="African couture fashion" gradientIndex={0} />
          <motion.div className="hero-badge" style={{ top: 18, left: 18 }}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
            <div className="small muted">Recommended size</div>
            <div className="big" style={{ fontSize: 22 }}>L · <span className="gradtext">94%</span></div>
          </motion.div>
          <motion.div className="hero-badge" style={{ bottom: 18, right: 18 }}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="pill good">Cutting</span><span className="small muted">Order #1042</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <Reveal>
        <Item><h2>From measurements to delivery</h2></Item>
        <div className="grid3" style={{ marginTop: 8 }}>
          {STEPS.map((s) => (
            <Item key={s.t}>
              <Hover className="card" style={{ height: '100%' }}>
                <div className="feature">
                  <div className="ic">{s.ic}</div>
                  <div><h3>{s.t}</h3><p className="muted small" style={{ margin: 0, lineHeight: 1.5 }}>{s.d}</p></div>
                </div>
              </Hover>
            </Item>
          ))}
        </div>
      </Reveal>

      {/* GALLERY — many garment types, each with its own matching picture */}
      <Reveal>
        <Item><h2>Styles we tailor</h2></Item>
        <div className="cards" style={{ marginTop: 8 }}>
          {IMAGES.gallery.map((g, i) => (
            <Item key={g.label}>
              <Hover className="card pcard">
                <div className="ph"><SmartImage src={g.src} alt={g.label} gradientIndex={i} /></div>
                <div className="meta"><span className="chip">{g.label}</span></div>
              </Hover>
            </Item>
          ))}
        </div>
      </Reveal>

      {/* CTA */}
      <FadeIn>
        <div className="card glow-border" style={{ textAlign: 'center', padding: 40, marginTop: 26 }}>
          <h2 style={{ marginTop: 0 }}>Your perfect fit is a few taps away.</h2>
          <p className="sub" style={{ margin: '0 auto 18px' }}>Join customers ordering bespoke African fashion with confidence.</p>
          <Link href="/register" className="btn">Get started free</Link>
          <div className="hint" style={{ marginTop: 18, display: 'inline-block' }}>Demo (after seeding API · pass <b>Password123!</b>): customer@demo.io · designer@lagosroyale.com</div>
        </div>
      </FadeIn>
    </div>
  );
}
