import { useEffect, useState, useRef } from 'react';
import { storeAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { Upload, Link as LinkIcon, CreditCard, Copy, Check, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import './ServicesPage.css';
import './StoreSettingsPage.css';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const CATEGORIES = ['salon','clinic','fitness','consulting','beauty','education','other'];

function compressToBase64(file, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function StoreSettingsPage() {
  const { store: authStore, setStore: setAuthStore } = useAuth();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const [copied, setCopied] = useState(false);
  const logoRef = useRef(); const bannerRef = useRef();

  useEffect(() => {
    storeAPI.getMyStore().then(r => {
      const s = r.data.store;
      // Ensure businessHours has all days
      const hours = DAYS.map(day => {
        const found = s.businessHours?.find(h => h.day === day);
        return found || { day, isOpen: false, openTime: '09:00', closeTime: '18:00' };
      });
      setStore({ ...s, businessHours: hours });
    }).catch(() => toast.error('Failed to load store')).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setStore(p => ({ ...p, [k]: v }));
  const setNested = (k, nk, v) => setStore(p => ({ ...p, [k]: { ...p[k], [nk]: v } }));

  const saveGeneral = async () => {
    setSaving(true);
    try {
      const res = await storeAPI.updateMyStore({
        name: store.name, description: store.description, category: store.category,
        phone: store.phone, email: store.email, website: store.website,
        address: store.address, socialLinks: store.socialLinks,
        businessHours: store.businessHours, currency: store.currency,
        theme: store.theme, googleReviewLink: store.googleReviewLink,
        autoAccept: store.autoAccept,
      });
      setStore(res.data.store);
      if (setAuthStore) setAuthStore(res.data.store);
      toast.success('Store settings saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const uploadFile = async (file, type) => {
    setSaving(true);
    const toastId = toast.loading(`Processing ${type}...`);
    try {
      const maxWidth = type === 'logo' ? 400 : 1200;
      const quality  = type === 'logo' ? 0.80 : 0.75;
      const base64 = await compressToBase64(file, maxWidth, quality);
      const res = await storeAPI.updateMyStore({ [type]: base64 });
      const updatedStore = res.data.store;
      setStore(updatedStore);
      if (setAuthStore) setAuthStore(updatedStore);
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} updated!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Upload failed', { id: toastId });
    } finally {
      setSaving(false);
    }
  };
  const copyLink = () => {
    const link = `${window.location.origin}/store/${store?.slug}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return <div className="page-loading" style={{minHeight:'40vh'}}><div className="spinner" style={{width:32,height:32,borderWidth:3}}/></div>;
  if (!store) return null;

  const storeLink = `${window.location.origin}/store/${store.slug}`;
  return (
    <div style={{maxWidth:780}}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Store Settings</h1>
          <p className="page-subtitle">Manage your store details and configuration</p>
        </div>
      </div>

      {/* Store link */}
      <div className="card store-link-card">
        <div className="store-link-label"><LinkIcon size={15}/> Your Booking Link</div>
        <div className="store-link-row">
          <div className="store-link-url">{storeLink}</div>
          <button className="btn btn-outline btn-sm" onClick={copyLink}>
            {copied ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy</>}
          </button>
          <a href={`/store/${store.slug}`} target="_blank" rel="noopener" className="btn btn-primary btn-sm">Visit →</a>
        </div>
      </div>

      <div className="tabs">
        {[['general','General'],['media','Media'],['hours','Business Hours'],['bookings','Bookings'],['payment','Payment'],['theme','Theme']].map(([k,l]) => (
          <button key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <div className="card animate-fadeIn">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input className="form-input" value={store.name||''} onChange={e=>set('name',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={store.category||'other'} onChange={e=>set('category',e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={store.description||''} onChange={e=>set('description',e.target.value)} placeholder="Tell customers about your store..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={store.phone||''} onChange={e=>set('phone',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={store.email||''} onChange={e=>set('email',e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" placeholder="https://..." value={store.website||''} onChange={e=>set('website',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-input" value={store.currency||'INR'} onChange={e=>set('currency',e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
          <h3 style={{margin:'20px 0 12px',fontSize:'1rem'}}>Address</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Street</label>
              <input className="form-input" value={store.address?.street||''} onChange={e=>setNested('address','street',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={store.address?.city||''} onChange={e=>setNested('address','city',e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">State</label><input className="form-input" value={store.address?.state||''} onChange={e=>setNested('address','state',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={store.address?.country||''} onChange={e=>setNested('address','country',e.target.value)} /></div>
          </div>
          <h3 style={{margin:'20px 0 12px',fontSize:'1rem'}}>Social Links</h3>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Instagram</label><input className="form-input" placeholder="https://instagram.com/..." value={store.socialLinks?.instagram||''} onChange={e=>setNested('socialLinks','instagram',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Facebook</label><input className="form-input" placeholder="https://facebook.com/..." value={store.socialLinks?.facebook||''} onChange={e=>setNested('socialLinks','facebook',e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label className="form-label"><Star size={13} style={{verticalAlign:'middle',marginRight:4}}/>Google Review Link</label>
            <input className="form-input" placeholder="https://g.page/r/..." value={store.googleReviewLink||''} onChange={e=>set('googleReviewLink',e.target.value)} />
            <p style={{fontSize:12,color:'var(--ink-muted)',marginTop:4}}>Paste your Google Maps / Google Business review link. A button will appear on your store page.</p>
          </div>
          <button className="btn btn-primary" onClick={saveGeneral} disabled={saving}>
            {saving ? <span className="spinner"/> : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Media */}
      {tab === 'media' && (
        <div className="card animate-fadeIn">
          <div className="media-section">
            <div className="media-label">Store Logo</div>
            <div className="media-preview logo-preview">
              {store.logo
                ? <img src={store.logo} alt="Logo" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                : <div className="media-placeholder">{store.name?.[0]}</div>
              }
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => e.target.files[0] && uploadFile(e.target.files[0], 'logo')} />
            <button className="btn btn-outline btn-sm" onClick={() => logoRef.current.click()} disabled={saving}>
              <Upload size={14}/> {saving ? 'Processing…' : 'Upload Logo'}
            </button>
          </div>
          <div className="divider"/>
          <div className="media-section">
            <div className="media-label">Store Banner</div>
            <div className="media-preview banner-preview">
              {store.banner
                ? <img src={store.banner} alt="Banner" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                : <div className="media-placeholder" style={{fontSize:'1.2rem'}}>No banner uploaded</div>
              }
            </div>
            <input ref={bannerRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => e.target.files[0] && uploadFile(e.target.files[0], 'banner')} />
            <button className="btn btn-outline btn-sm" onClick={() => bannerRef.current.click()} disabled={saving}>
              <Upload size={14}/> {saving ? 'Processing…' : 'Upload Banner'}
            </button>
          </div>
        </div>
      )}

      {/* Hours */}
      {tab === 'hours' && (
        <div className="card animate-fadeIn">
          <p style={{color:'var(--ink-muted)',fontSize:14,marginBottom:20}}>Set your general business hours. These are displayed on your store page.</p>
          <div className="hours-editor">
            {DAYS.map(day => {
              const h = store.businessHours?.find(b => b.day === day) || { day, isOpen:false, openTime:'09:00', closeTime:'18:00' };
              const updateH = (k, v) => set('businessHours', store.businessHours.map(b => b.day===day ? {...b,[k]:v} : b));
              return (
                <div key={day} className="hours-edit-row">
                  <div style={{display:'flex',alignItems:'center',gap:10,minWidth:90}}>
                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                      <input type="checkbox" checked={h.isOpen} onChange={e=>updateH('isOpen',e.target.checked)} style={{width:16,height:16}} />
                      <span style={{fontWeight:600,fontSize:14}}>{day}</span>
                    </label>
                  </div>
                  {h.isOpen ? (
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <input type="time" className="form-input" value={h.openTime} onChange={e=>updateH('openTime',e.target.value)} style={{width:130}} />
                      <span style={{fontSize:13,color:'var(--ink-muted)'}}>to</span>
                      <input type="time" className="form-input" value={h.closeTime} onChange={e=>updateH('closeTime',e.target.value)} style={{width:130}} />
                    </div>
                  ) : (
                    <span style={{fontSize:13,color:'var(--ink-muted)',fontStyle:'italic'}}>Closed</span>
                  )}
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" style={{marginTop:24}} onClick={saveGeneral} disabled={saving}>
            {saving ? <span className="spinner"/> : 'Save Hours'}
          </button>
        </div>
      )}

      {/* Bookings */}
      {tab === 'bookings' && (
        <div className="card animate-fadeIn">
          <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:4}}>Booking Settings</h3>
          <p style={{color:'var(--ink-muted)',fontSize:14,marginBottom:24}}>Control how appointments are handled when customers book.</p>
          <div className="payment-toggle-row" style={{marginBottom:24}}>
            <div>
              <div style={{fontWeight:600,marginBottom:4}}>Auto-Accept Appointments</div>
              <div style={{fontSize:13,color:'var(--ink-muted)'}}>When enabled, bookings are automatically confirmed — no manual approval needed</div>
            </div>
            <button className={`toggle-btn ${store.autoAccept ? 'on' : ''}`} onClick={() => set('autoAccept', !store.autoAccept)}>
              <div className="toggle-thumb"/>
            </button>
          </div>
          <div style={{padding:'12px 16px',borderRadius:10,background:'var(--bg-soft)',fontSize:13,color:'var(--ink-muted)',marginBottom:24}}>
            {store.autoAccept
              ? '✅ New bookings will be confirmed immediately without your review.'
              : '⏳ New bookings will be in Pending status until you accept them from the Appointments page.'}
          </div>
          <button className="btn btn-primary" onClick={saveGeneral} disabled={saving}>
            {saving ? <span className="spinner"/> : 'Save Booking Settings'}
          </button>
        </div>
      )}

      {/* Payment */}
      {tab === 'payment' && (
        <div className="card animate-fadeIn">
          <PaymentSettings store={store} setStore={setStore} />
        </div>
      )}

      {/* Theme */}
      {tab === 'theme' && (
        <div className="card animate-fadeIn">
          <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:4}}>Store Page Theme</h3>
          <p style={{color:'var(--ink-muted)',fontSize:14,marginBottom:24}}>Choose a colour theme for your public store page. Changes are saved automatically.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14}}>
            {[
              { id:'classic', name:'Classic',  colors:['#f59e0b','#1e3a5f','#f8fafc'],   dark:false },
              { id:'minimal', name:'Minimal',  colors:['#18181b','#52525b','#fafafa'],   dark:false },
              { id:'ocean',   name:'Ocean',    colors:['#0ea5e9','#0369a1','#f0f9ff'],   dark:false },
              { id:'nature',  name:'Nature',   colors:['#16a34a','#14532d','#f0fdf4'],   dark:false },
              { id:'sunset',  name:'Sunset',   colors:['#f97316','#c2410c','#fff7ed'],   dark:false },
              { id:'rose',    name:'Rose',     colors:['#e11d48','#be123c','#fff1f2'],   dark:false },
              { id:'luxury',  name:'Luxury',   colors:['#c084fc','#2d1b4e','#0d0b14'],   dark:true  },
            ].map(t => {
              const active = (store.theme || 'classic') === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    const updated = { ...store, theme: t.id };
                    setStore(updated);
                    storeAPI.updateMyStore({ theme: t.id })
                      .then(r => { setStore(r.data.store); if (setAuthStore) setAuthStore(r.data.store); toast.success(`Theme changed to ${t.name}`); })
                      .catch(() => toast.error('Failed to save theme'));
                  }}
                  style={{
                    border: active ? '2.5px solid var(--primary)' : '2px solid var(--border)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'none',
                    padding: 0,
                    position: 'relative',
                    transition: 'box-shadow 0.18s',
                    boxShadow: active ? '0 0 0 4px rgba(var(--primary-rgb),0.15)' : 'none',
                  }}
                >
                  {/* Colour preview */}
                  <div style={{
                    height: 72,
                    background: `linear-gradient(135deg, ${t.colors[1]} 0%, ${t.colors[0]} 100%)`,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-end',
                    padding: '0 8px 8px 0',
                  }}>
                    {active && (
                      <span style={{
                        background: '#fff',
                        borderRadius: '50%',
                        width: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#16a34a', fontWeight: 900,
                      }}>✓</span>
                    )}
                  </div>
                  {/* Page bg swatch + label */}
                  <div style={{
                    background: t.colors[2],
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: active ? 700 : 600,
                      color: t.dark ? '#e9d5ff' : '#0f172a',
                    }}>{t.name}</span>
                    <span style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: t.colors[0],
                      border: '2px solid rgba(0,0,0,0.12)',
                      flexShrink: 0,
                    }}/>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{marginTop:20,padding:'14px 16px',borderRadius:10,background:'var(--bg-soft)',fontSize:13,color:'var(--ink-muted)',display:'flex',gap:10,alignItems:'flex-start'}}>
            <span style={{fontSize:16}}>💡</span>
            <span>Themes instantly update your public store page. Customers will see the new look on their next visit.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentSettings({ store, setStore }) {
  const [form, setForm] = useState({ provider: store.paymentGateway?.provider || 'manual', apiKey: '', secretKey: '' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await storeAPI.updatePayment(form);
      setStore(p => ({ ...p, paymentGateway: { ...p.paymentGateway, ...form, isConnected: true } }));
      toast.success('Payment gateway updated');
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const togglePayment = async () => {
    setToggling(true);
    try {
      const res = await storeAPI.togglePayment(!store.paymentEnabled);
      setStore(p => ({ ...p, paymentEnabled: res.data.store.paymentEnabled }));
      toast.success(res.data.store.paymentEnabled ? 'Payments enabled' : 'Payments disabled');
    } catch { toast.error('Failed'); } finally { setToggling(false); }
  };

  return (
    <div>
      <div className="payment-toggle-row">
        <div>
          <div style={{fontWeight:600,marginBottom:4}}>Accept Payments Online</div>
          <div style={{fontSize:13,color:'var(--ink-muted)'}}>Allow customers to pay at checkout</div>
        </div>
        <button className={`toggle-btn ${store.paymentEnabled ? 'on' : ''}`} onClick={togglePayment} disabled={toggling}>
          <div className="toggle-thumb"/>
        </button>
      </div>
      <div className="divider"/>
      <div className="form-group">
        <label className="form-label">Payment Provider</label>
        <select className="form-input" value={form.provider} onChange={e => setForm(p=>({...p,provider:e.target.value}))}>
          <option value="manual">Manual / Cash</option>
          <option value="razorpay">Razorpay</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
      </div>
      {form.provider !== 'manual' && (
        <>
          <div className="form-group">
            <label className="form-label">API Key / Client ID</label>
            <input className="form-input" type="password" placeholder="Enter your API key" value={form.apiKey} onChange={e=>setForm(p=>({...p,apiKey:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Secret Key</label>
            <input className="form-input" type="password" placeholder="Enter your secret key" value={form.secretKey} onChange={e=>setForm(p=>({...p,secretKey:e.target.value}))} />
          </div>
        </>
      )}
      {store.paymentGateway?.isConnected && (
        <div className="badge badge-confirmed" style={{marginBottom:16}}>✓ Payment gateway connected</div>
      )}
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? <span className="spinner"/> : 'Save Payment Settings'}
      </button>
    </div>
  );
}