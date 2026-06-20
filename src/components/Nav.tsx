'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';

export default function Nav() {
  const { user, logout } = useAuth();
  return (
    <motion.div className="nav" initial={{ y: -70 }} animate={{ y: 0 }} transition={{ duration: 0.5, ease: [0.22, 0.7, 0.2, 1] }}>
      <div className="wrap nav-in">
        <Link href="/" className="logo">Fit<b>Room</b></Link>
        <span className="chip" style={{ marginLeft: 2 }}>✦ Senator &amp; Kaftan</span>
        <div className="nav-links">
          <Link href="/b2b">For brands</Link>
          {!user && <>
            <Link href="/login">Log in</Link>
            <Link href="/register" className="nav-cta">Get started</Link>
          </>}
          {user?.role === 'CUSTOMER' && <>
            <Link href="/shop">Shop</Link>
            <Link href="/try-on">Try-on</Link>
            <Link href="/fit-profile">My measurements</Link>
            <Link href="/orders">My orders</Link>
            <button onClick={logout}>Log out</button>
          </>}
          {user?.role === 'DESIGNER' && <>
            <Link href="/designer">Dashboard</Link>
            <Link href="/designer/products">Products</Link>
            <Link href="/designer/analytics">Analytics</Link>
            <button onClick={logout}>Log out</button>
          </>}
          {user?.role === 'ADMIN' && <>
            <Link href="/admin">Admin</Link>
            <button onClick={logout}>Log out</button>
          </>}
        </div>
      </div>
    </motion.div>
  );
}
