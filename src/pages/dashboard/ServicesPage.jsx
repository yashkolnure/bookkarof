import { useEffect, useState, useRef } from 'react';
import { serviceAPI } from '../../api/api';
import { Plus, Edit2, Trash2, Clock, Tag, Star, ChevronDown, ChevronUp, X, Check, Image as ImageIcon, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import './ServicesPage.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const emptyService = {
  name: '', description: '', category: '', tags: '', price: '',
  discountedPrice: '', duration: 60, isActive: true, images: [],
  availability: DAYS.map(day => ({ day, isAvailable: false, slots: [] })),
  options: []
};

/* ── Time Slot Editor ── */
function timeToMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minsToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function TimeSlotEditor({ dayAvail, onChange, serviceDuration }) {
  const [dayStart, setDayStart] = useState('09:00');
  const [dayEnd, setDayEnd]   = useState('18:00');
  const [session, setSession] = useState(serviceDuration || 60);
  const [breakMins, setBreak] = useState(0);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd]   = useState('09:30');

  const removeSlot = (i) => onChange({ ...dayAvail, slots: dayAvail.slots.filter((_, idx) => idx !== i) });

  const generateSlots = () => {
    const startM = timeToMins(dayStart);
    const endM   = timeToMins(dayEnd);
    const step   = Number(session) + Number(breakMins);
    if (step <= 0 || startM >= endM) { toast.error('Invalid time range or session duration'); return; }
    const slots = [];
    for (let cur = startM; cur + Number(session) <= endM; cur += step) {
      slots.push({ startTime: minsToTime(cur), endTime: minsToTime(cur + Number(session)) });
    }
    if (!slots.length) { toast.error('No slots fit in this range'); return; }
    onChange({ ...dayAvail, slots });
    toast.success(`Generated ${slots.length} slot${slots.length !== 1 ? 's' : ''}`);
  };

  const addSingle = () => {
    if (!newStart || !newEnd) return;
    if (timeToMins(newEnd) <= timeToMins(newStart)) { toast.error('End time must be after start'); return; }
    onChange({ ...dayAvail, slots: [...dayAvail.slots, { startTime: newStart, endTime: newEnd }] });
  };

  return (
    <div className="slot-editor">
      {/* Smart generator */}
      <div style={{background:'var(--bg-soft)',borderRadius:8,padding:'10px 12px',marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:'var(--ink-muted)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
          <Zap size={12}/> Auto-generate slots
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-muted)',marginBottom:3}}>Day starts</div>
            <input type="time" className="form-input" value={dayStart} onChange={e=>setDayStart(e.target.value)} style={{fontSize:13}} />
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-muted)',marginBottom:3}}>Day ends</div>
            <input type="time" className="form-input" value={dayEnd} onChange={e=>setDayEnd(e.target.value)} style={{fontSize:13}} />
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-muted)',marginBottom:3}}>Session (min)</div>
            <input type="number" className="form-input" value={session} min={5} onChange={e=>setSession(e.target.value)} style={{fontSize:13}} />
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-muted)',marginBottom:3}}>Break (min)</div>
            <input type="number" className="form-input" value={breakMins} min={0} onChange={e=>setBreak(e.target.value)} style={{fontSize:13}} />
          </div>
        </div>
        <button className="btn btn-primary btn-sm" style={{width:'100%'}} onClick={generateSlots}>
          <Zap size={12}/> Generate Slots
        </button>
      </div>

      {/* Existing slots */}
      <div className="slot-editor-slots">
        {dayAvail.slots.map((s, i) => (
          <div key={i} className="slot-chip">
            {s.startTime}–{s.endTime}
            <button onClick={() => removeSlot(i)}><X size={12} /></button>
          </div>
        ))}
      </div>

      {/* Manual add */}
      <div style={{fontSize:11,color:'var(--ink-muted)',margin:'8px 0 4px'}}>Or add a single slot manually:</div>
      <div className="slot-add-row">
        <input type="time" className="form-input" value={newStart} onChange={e => setNewStart(e.target.value)} style={{ flex: 1 }} />
        <span>to</span>
        <input type="time" className="form-input" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" onClick={addSingle}>Add</button>
      </div>
    </div>
  );
}
async function compressToBase64(file, maxWidth = 900, quality = 0.72) {
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

function ImageManager({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (images.length >= 8) { toast.error('Maximum 8 images allowed'); return; }
    setUploading(true);
    try {
      const base64 = await compressToBase64(file);
      onChange([...images, base64]);
      toast.success('Image added!');
    } catch {
      toast.error('Could not process image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx) => onChange(images.filter((_, i) => i !== idx));

  const setAsCover = (idx) => {
    const arr = [...images];
    const [selected] = arr.splice(idx, 1);
    arr.unshift(selected);
    onChange(arr);
  };

  return (
    <div className="image-manager">
      <div className="wp-upload-zone" onClick={() => !uploading && fileInputRef.current.click()}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleFileUpload}
        />
        {uploading ? (
          <><div className="spinner" /><span style={{marginTop:8,fontSize:13,color:'var(--ink-muted)'}}>Processing…</span></>
        ) : (
          <>
            <Plus size={24} />
            <span>Add Image</span>
          </>
        )}
      </div>

      {images.length > 0 ? (
        <div className="image-grid" style={{ marginTop: '16px' }}>
          {images.map((url, idx) => (
            <div key={url + idx} className={`image-thumb ${idx === 0 ? 'image-thumb-primary' : ''}`}>
              <img src={url} alt="" />
              {idx === 0 && <div className="primary-badge">Cover</div>}
              <div className="image-thumb-actions">
                {idx > 0 && (
                  <button className="thumb-action-btn" title="Set as cover" onClick={() => setAsCover(idx)}>
                    <Check size={11} />
                  </button>
                )}
                <button className="thumb-action-btn thumb-del" title="Remove" onClick={() => removeImage(idx)}>
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="image-empty">
          <ImageIcon size={28} />
          <p>No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}

/* ── Image Viewer (lightbox) ── */
function ImageViewer({ images, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  useEffect(() => {
    const fn = e => {
      if (e.key === 'ArrowLeft') setIdx(p => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setIdx(p => Math.min(images.length - 1, p + 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [images.length, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(0,0,0,0.88)', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', textAlign: 'center' }}>
        <img src={images[idx]} alt="" style={{ maxWidth: '88vw', maxHeight: '78vh', borderRadius: 8, objectFit: 'contain', display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 }}>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} disabled={idx === 0} onClick={() => setIdx(p => p - 1)}>← Prev</button>
          <span style={{ color: '#fff', fontSize: 13 }}>{idx + 1} / {images.length}</span>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} disabled={idx === images.length - 1} onClick={() => setIdx(p => p + 1)}>Next →</button>
        </div>
        <button onClick={onClose} style={{ position: 'absolute', top: -14, right: -14, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>×</button>
      </div>
    </div>
  );
}

/* ── Service Modal ── */
function ServiceModal({ service, onClose, onSaved }) {
  const [form, setForm] = useState(service ? {
    ...service,
    tags: (service.tags || []).join(', '),
    images: service.images || [],
    availability: DAYS.map(day => {
      const found = service.availability?.find(a => a.day === day);
      return found || { day, isAvailable: false, slots: [] };
    })
  } : emptyService);
  const [saving, setSaving] = useState(false);
  const [avOpen, setAvOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(true);
  const isEdit = !!service?._id;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleDay = (day) => set('availability', form.availability.map(a => a.day === day ? { ...a, isAvailable: !a.isAvailable } : a));
  const updateDay = (day, val) => set('availability', form.availability.map(a => a.day === day ? val : a));

  const handleSave = async () => {
    if (!form.name || !form.price || !form.duration) { toast.error('Fill in name, price and duration'); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        price: Number(form.price),
        discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : null,
        duration: Number(form.duration),
      };
      if (isEdit) { await serviceAPI.update(service._id, data); toast.success('Service updated'); }
      else { await serviceAPI.create(data); toast.success('Service created'); }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Service' : 'New Service'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-section-label">Basic Information</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Service Name *</label>
            <input className="form-input" placeholder="e.g. Haircut & Styling" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="form-input" placeholder="e.g. Hair, Nails, Massage" value={form.category} onChange={e => set('category', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={3} placeholder="Describe this service..." value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Price (₹) *</label>
            <input type="number" className="form-input" placeholder="500" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Discounted Price (₹)</label>
            <input type="number" className="form-input" placeholder="Leave blank if no discount" value={form.discountedPrice || ''} onChange={e => set('discountedPrice', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Duration (minutes) *</label>
            <input type="number" className="form-input" placeholder="60" value={form.duration} onChange={e => set('duration', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input className="form-input" placeholder="relaxing, popular, new" value={form.tags} onChange={e => set('tags', e.target.value)} />
          </div>
        </div>

        {/* Images accordion */}
        <div className="avail-section" style={{ marginBottom: 8 }}>
          <button className="avail-toggle" onClick={() => setImgOpen(p => !p)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={15} /> Images ({form.images.length})
            </span>
            {imgOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {imgOpen && (
            <div style={{ padding: '16px' }}>
              <ImageManager images={form.images} onChange={v => set('images', v)} />
            </div>
          )}
        </div>

        {/* Availability accordion */}
        <div className="avail-section">
          <button className="avail-toggle" onClick={() => setAvOpen(p => !p)}>
            <span>Availability & Time Slots</span>
            {avOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {avOpen && (
            <div className="avail-days">
              {form.availability.map(da => (
                <div key={da.day} className={`avail-day ${da.isAvailable ? 'avail-day-on' : ''}`}>
                  <div className="avail-day-header">
                    <button className={`day-toggle ${da.isAvailable ? 'on' : ''}`} onClick={() => toggleDay(da.day)}>
                      {da.isAvailable ? <Check size={13} /> : <span style={{ width: 13 }} />}
                    </button>
                    <span className="avail-day-name">{da.day}</span>
                  </div>
                  {da.isAvailable && <TimeSlotEditor dayAvail={da} onChange={(val) => updateDay(da.day, val)} serviceDuration={Number(form.duration) || 60} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Create Service'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewer, setViewer] = useState(null);

  const load = () => {
    setLoading(true);
    serviceAPI.getMyServices().then(r => setServices(r.data.services)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this service?')) return;
    setDeletingId(id);
    try { await serviceAPI.delete(id); toast.success('Service deactivated'); load(); }
    catch { toast.error('Failed'); } finally { setDeletingId(null); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Services</h1>
          <p className="page-subtitle">Manage your catalog, images and availability</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Plus size={16} /> Add Service
        </button>
      </div>

      {loading ? (
        <div className="page-loading" style={{ minHeight: '40vh' }}><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
      ) : services.length === 0 ? (
        <div className="empty-state" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--warm-white)' }}>
          <div className="empty-state-icon">✂️</div>
          <h3>No services yet</h3>
          <p>Add your first service to start accepting bookings.</p>
          <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={16} /> Add Service</button>
        </div>
      ) : (
        <div className="services-list">
          {services.map(s => (
            <div key={s._id} className={`svc-row card ${!s.isActive ? 'svc-inactive' : ''}`}>
              <div className="svc-row-main">
                {/* Thumbnail */}
                <div
                  className="svc-row-cover"
                  onClick={() => s.images?.length > 0 && setViewer({ images: s.images, startIdx: 0 })}
                  title={s.images?.length > 0 ? 'Click to view images' : ''}
                  style={{ cursor: s.images?.length > 0 ? 'pointer' : 'default' }}
                >
                  {s.images?.[0] ? (
                    <>
                      <img src={s.images[0]} alt={s.name} onError={e => { e.currentTarget.style.display = 'none'; }} />
                      {s.images.length > 1 && <div className="svc-img-count">+{s.images.length - 1}</div>}
                    </>
                  ) : (
                    <div className="svc-row-icon-letter">{s.name[0]}</div>
                  )}
                </div>

                <div className="svc-row-info">
                  <div className="svc-row-name">{s.name}</div>
                  {s.description && <div className="svc-row-desc">{s.description}</div>}
                  <div className="svc-row-meta">
                    <span><Clock size={12} /> {s.duration}min</span>
                    {s.category && <span><Tag size={12} /> {s.category}</span>}
                    {s.rating?.count > 0 && <span><Star size={12} /> {s.rating.average?.toFixed(1)} ({s.rating.count})</span>}
                    <span>{s.totalBookings} bookings</span>
                    {s.images?.length > 0 && (
                      <span style={{ color: 'var(--gold)' }}><ImageIcon size={12} /> {s.images.length} photo{s.images.length !== 1 ? 's' : ''}</span>
                    )}
                    {!s.isActive && <span className="badge badge-cancelled">Inactive</span>}
                  </div>
                </div>
              </div>

              <div className="svc-row-right">
                <div className="svc-row-price">
                  {s.discountedPrice ? (
                    <>
                      <span className="svc-price-main">₹{s.discountedPrice}</span>
                      <span className="svc-price-orig">₹{s.price}</span>
                    </>
                  ) : (
                    <span className="svc-price-main">₹{s.price}</span>
                  )}
                </div>
                <div className="svc-row-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setModal(s)}><Edit2 size={14} /> Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s._id)} disabled={deletingId === s._id}>
                    {deletingId === s._id ? <span className="spinner" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ServiceModal
          service={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {viewer && (
        <ImageViewer images={viewer.images} startIdx={viewer.startIdx} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}
