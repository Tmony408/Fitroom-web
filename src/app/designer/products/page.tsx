'use client';
import { useEffect, useRef, useState } from 'react';
import Protected from '@/components/Protected';
import SmartImage from '@/components/SmartImage';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { api, Product, GarmentStretch, naira } from '@/lib/api';
import { categoryImage } from '@/lib/images';
import { downscaleImage } from '@/lib/image';
import { useAuth } from '@/lib/auth';

function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

  // new product form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Senator');
  const [fabric, setFabric] = useState('Cotton blend');
  const [stretch, setStretch] = useState<GarmentStretch>('LOW');
  const [price, setPrice] = useState('42000');
  const [sizes, setSizes] = useState('S, M, L, XL, XXL');
  const [chest, setChest] = useState('96, 100, 104, 108, 112');
  const [waist, setWaist] = useState('84, 88, 92, 96, 100');
  const [images, setImages] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const d = await api.getDesigner((await api.designerDashboard()).designerId);
      setProducts(d.products ?? []);
    } catch (e) {
      const msg = (e as Error).message;
      if (/designer profile/i.test(msg)) setNeedsProfile(true); else setError(msg);
    }
  };
  useEffect(() => { load(); }, []);

  const nums = (s: string) => s.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n));
  const strs = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    setImages((x) => [...x, url]); setLinkInput('');
  };
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!file.type.startsWith('image/')) { setError('Please choose image files only.'); continue; }
      try { const url = await downscaleImage(file); setImages((x) => [...x, url]); }
      catch { setError('Could not read that image — try another.'); }
    }
    e.target.value = ''; // allow re-selecting the same file
  };
  const removeImg = (i: number) => setImages((x) => x.filter((_, idx) => idx !== i));

  const create = async () => {
    setError(''); setBusy(true);
    try {
      const sizeChart = { sizes: strs(sizes), chest: nums(chest), waist: nums(waist) };
      if (sizeChart.sizes.length === 0) throw new Error('Add at least one size (e.g. S, M, L).');
      if (sizeChart.chest.length !== sizeChart.sizes.length || sizeChart.waist.length !== sizeChart.sizes.length) {
        throw new Error('Sizes, chest and waist must have the same number of entries.');
      }
      if (!title.trim()) throw new Error('Give the product a title.');
      if (!(Number(price) > 0)) throw new Error('Set a valid price.');
      await api.createProduct({ title, category, fabric, stretch, priceKobo: Number(price) * 100, sizeChart, images });
      setTitle(''); setImages([]);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (needsProfile) return <div className="card">You don’t have a designer profile yet. <a href="/designer/onboard" className="gradtext">Set one up</a> first.</div>;

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Studio</span>
        <h1>Products &amp; size charts</h1>
        <p className="sub">Add your own photos (paste a link or upload). Where a product has no image, a matching style photo is shown automatically. Garment measurements + stretch power the size recommendation.</p>
      </FadeIn>
      {error && <div className="error">{error}</div>}

      {products.length > 0 && (
        <Reveal className="cards">
          {products.map((p, i) => (
            <Item key={p.id}>
              <Hover className="card pcard">
                <div className="ph"><SmartImage src={p.images?.[0] || categoryImage(p.category, i)} alt={p.title} gradientIndex={i} /></div>
                <div className="body">
                  <div className="spread"><b>{p.title}</b><span className="chip">{naira(p.priceKobo)}</span></div>
                  <div className="muted small" style={{ marginTop: 4 }}>{p.category} · {p.fabric} · stretch {p.stretch}</div>
                  <table style={{ marginTop: 8 }}><tbody>
                    <tr><th>Size</th>{p.sizeChart.sizes.map((s) => <th key={s}>{s}</th>)}</tr>
                    <tr><td className="muted">Chest</td>{p.sizeChart.chest.map((c, j) => <td key={j}>{c}</td>)}</tr>
                    <tr><td className="muted">Waist</td>{p.sizeChart.waist.map((c, j) => <td key={j}>{c}</td>)}</tr>
                  </tbody></table>
                </div>
              </Hover>
            </Item>
          ))}
        </Reveal>
      )}

      <h2>Add a product</h2>
      <div className="card">
        <div className="grid2">
          <div><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Classic Senator (2pc)" /></div>
          <div><label>Category</label><select value={category} onChange={(e) => setCategory(e.target.value)}>{['Senator', 'Kaftan', 'Agbada', 'Aso Ebi', 'Ankara', 'Dashiki', 'Bridal', 'Native wear'].map((o) => <option key={o}>{o}</option>)}</select></div>
          <div><label>Fabric</label><input value={fabric} onChange={(e) => setFabric(e.target.value)} /></div>
          <div><label>Stretch</label><select value={stretch} onChange={(e) => setStretch(e.target.value as GarmentStretch)}>{['NONE', 'LOW', 'MEDIUM', 'HIGH'].map((o) => <option key={o}>{o}</option>)}</select></div>
          <div><label>Price (₦)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>

        {/* Images: paste link or upload */}
        <h3 style={{ marginTop: 16 }}>Photos</h3>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>Paste an image link</label>
            <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://…/my-agbada.jpg"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
          </div>
          <button type="button" className="btn ghost sm" onClick={addLink}>Add link</button>
          <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>Upload</button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onUpload} style={{ display: 'none' }} />
        </div>
        {images.length > 0 && (
          <div className="row" style={{ marginTop: 12 }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: 'relative', width: 84, height: 104, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <SmartImage src={src} alt={`image ${i + 1}`} gradientIndex={i} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => removeImg(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="hint">No photo? We’ll show a matching <b>{category}</b> style image automatically.</div>

        <h3 style={{ marginTop: 14 }}>Size chart (comma-separated, aligned columns)</h3>
        <div className="grid3">
          <div><label>Sizes</label><input value={sizes} onChange={(e) => setSizes(e.target.value)} /></div>
          <div><label>Chest (cm)</label><input value={chest} onChange={(e) => setChest(e.target.value)} /></div>
          <div><label>Waist (cm)</label><input value={waist} onChange={(e) => setWaist(e.target.value)} /></div>
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={create} disabled={busy || !title}>{busy ? 'Saving…' : 'Add product'}</button>
      </div>
      <p className="muted small">Signed in as {user?.name}.</p>
    </div>
  );
}

export default function Page() {
  return <Protected role="DESIGNER"><Products /></Protected>;
}
