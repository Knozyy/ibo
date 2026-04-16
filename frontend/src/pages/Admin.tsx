import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

interface Category { id: string; name: string; slug: string }
interface Video {
  id: string; title: string; original_url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null; category_id: string | null; created_at: string
  file_path: string | null; thumbnail_path: string | null
}
interface VideoPage { items: Video[]; total: number; page: number; limit: number; pages: number }

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`} style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
      {type === 'success' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><path d="M8 5v3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11" r="0.75" fill="white" /></svg>
      )}
      {message}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1 1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
    </div>
  )
}

function StatusBadge({ status }: { status: Video['status'] }) {
  const map = {
    pending: { label: 'Bekliyor', cls: 'bg-amber-50 text-amber-600' },
    processing: { label: 'İndiriliyor', cls: 'bg-blue-50 text-[#003ec7]' },
    completed: { label: 'Hazır', cls: 'bg-emerald-50 text-emerald-600' },
    failed: { label: 'Hata', cls: 'bg-red-50 text-red-500' },
  } as const
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[0.6875rem] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {status === 'processing' && (
        <svg className="animate-spin" width="8" height="8" viewBox="0 0 8 8" fill="none">
          <circle cx="4" cy="4" r="3" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M4 1a3 3 0 0 1 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </span>
  )
}

export default function Admin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [videoData, setVideoData] = useState<VideoPage | null>(null)
  const [videoPage, setVideoPage] = useState(1)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Add video form
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoCategoryId, setVideoCategoryId] = useState('')
  const [addingVideo, setAddingVideo] = useState(false)

  // Add category form
  const [catName, setCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  async function loadCategories() {
    try {
      const r = await api.get('/categories')
      setCategories(r.data)
    } catch { /* */ }
  }

  async function loadVideos(p = videoPage) {
    setLoadingVideos(true)
    try {
      const r = await api.get('/videos', { params: { page: p, limit: 20 } })
      setVideoData(r.data)
    } catch { /* */ } finally {
      setLoadingVideos(false)
    }
  }

  useEffect(() => { loadCategories() }, [])
  useEffect(() => { loadVideos(videoPage) }, [videoPage])

  // Auto-refresh for pending/processing
  useEffect(() => {
    const hasPending = videoData?.items.some((v) => v.status === 'pending' || v.status === 'processing')
    if (!hasPending) return
    const t = setTimeout(() => loadVideos(videoPage), 5000)
    return () => clearTimeout(t)
  }, [videoData, videoPage])

  async function handleAddVideo(e: FormEvent) {
    e.preventDefault()
    if (!videoUrl.trim() || !videoTitle.trim()) return
    setAddingVideo(true)
    try {
      await api.post('/videos', {
        title: videoTitle.trim(),
        original_url: videoUrl.trim(),
        category_id: videoCategoryId || null,
      })
      setVideoUrl(''); setVideoTitle(''); setVideoCategoryId('')
      await loadVideos(1); setVideoPage(1)
      showToast('Video kuyruğa eklendi, indirme başladı.', 'success')
    } catch {
      showToast('Video eklenirken hata oluştu.', 'error')
    } finally {
      setAddingVideo(false)
    }
  }

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault()
    if (!catName.trim()) return
    setAddingCat(true)
    const slug = catName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    try {
      await api.post('/categories', { name: catName.trim(), slug })
      setCatName('')
      await loadCategories()
      showToast('Kategori oluşturuldu.', 'success')
    } catch {
      showToast('Kategori eklenirken hata oluştu.', 'error')
    } finally {
      setAddingCat(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await api.delete(`/categories/${id}`)
      await loadCategories()
      showToast('Kategori silindi.', 'success')
    } catch {
      showToast('Kategori silinemedi.', 'error')
    }
  }

  async function handleDeleteVideo(id: string) {
    try {
      await api.delete(`/videos/${id}`)
      await loadVideos(videoPage)
      showToast('Video silindi.', 'success')
    } catch {
      showToast('Video silinemedi.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      {/* Header */}
      <header className="bg-[#f9f9ff] sticky top-0 z-20" style={{ borderBottom: '1px solid #d0daf2' }}>
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-7 h-7 rounded-lg bg-[#003ec7] flex items-center justify-center shrink-0 hover:bg-[#0035b0] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="4,3 12,7 4,11" fill="white" /></svg>
            </Link>
            <span className="text-sm font-semibold text-[#0d1117] tracking-tight">Yönetim Paneli</span>
          </div>
          <Link to="/" className="text-xs font-medium text-[#003ec7] px-3 py-1.5 rounded-lg hover:bg-[#e8eeff] transition-colors">← Galeriye Dön</Link>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: Forms */}
        <div className="lg:col-span-1 flex flex-col gap-5">

          {/* Add Video */}
          <div className="bg-[#f0f3ff] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#0d1117] mb-4" style={{ letterSpacing: '-0.01em' }}>Video Ekle</h2>
            <form onSubmit={handleAddVideo} className="space-y-3">
              <div>
                <label className="block text-[0.6875rem] font-medium text-[#374151] mb-1 uppercase tracking-wide">Başlık</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  required
                  placeholder="Video başlığı"
                  className="w-full bg-white text-sm text-[#0d1117] px-3 py-2 rounded-lg outline-none transition-all"
                  style={{ borderBottom: '2px solid transparent' }}
                  onFocus={(e) => (e.target.style.borderBottomColor = '#003ec7')}
                  onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-medium text-[#374151] mb-1 uppercase tracking-wide">URL</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-white text-sm text-[#0d1117] px-3 py-2 rounded-lg outline-none transition-all"
                  style={{ borderBottom: '2px solid transparent' }}
                  onFocus={(e) => (e.target.style.borderBottomColor = '#003ec7')}
                  onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-medium text-[#374151] mb-1 uppercase tracking-wide">Kategori</label>
                <select
                  value={videoCategoryId}
                  onChange={(e) => setVideoCategoryId(e.target.value)}
                  className="w-full bg-white text-sm text-[#0d1117] px-3 py-2 rounded-lg outline-none appearance-none cursor-pointer"
                  style={{ borderBottom: '2px solid transparent' }}
                  onFocus={(e) => (e.target.style.borderBottomColor = '#003ec7')}
                  onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                >
                  <option value="">Kategorisiz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={addingVideo}
                className="w-full flex items-center justify-center gap-2 text-white text-sm font-medium py-2.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #003ec7 0%, #0052ff 100%)' }}
              >
                {addingVideo ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                      <path d="M7 2a5 5 0 0 1 5 5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Ekleniyor…
                  </>
                ) : '+ Video Ekle'}
              </button>
            </form>
          </div>

          {/* Categories */}
          <div className="bg-[#f0f3ff] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#0d1117] mb-4" style={{ letterSpacing: '-0.01em' }}>Kategoriler</h2>
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
                placeholder="Kategori adı"
                className="flex-1 bg-white text-sm text-[#0d1117] px-3 py-2 rounded-lg outline-none min-w-0"
                style={{ borderBottom: '2px solid transparent' }}
                onFocus={(e) => (e.target.style.borderBottomColor = '#003ec7')}
                onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
              />
              <button
                type="submit"
                disabled={addingCat}
                className="shrink-0 bg-[#003ec7] hover:bg-[#0035b0] text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {addingCat ? '…' : 'Ekle'}
              </button>
            </form>
            {categories.length === 0 ? (
              <p className="text-xs text-[#9ca3af]">Henüz kategori yok.</p>
            ) : (
              <div className="space-y-1.5">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-[#0d1117]">{cat.name}</p>
                      <p className="text-[0.625rem] text-[#9ca3af]">{cat.slug}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Video list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0d1117]" style={{ letterSpacing: '-0.01em' }}>
              Tüm Videolar {videoData && <span className="text-[#9ca3af] font-normal">({videoData.total})</span>}
            </h2>
            <button onClick={() => loadVideos(videoPage)} className="text-xs text-[#003ec7] hover:bg-[#e8eeff] px-2.5 py-1.5 rounded-lg transition-colors">
              Yenile
            </button>
          </div>

          {loadingVideos && !videoData ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#e8eeff] rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          ) : videoData?.items.length === 0 ? (
            <div className="bg-[#f0f3ff] rounded-2xl p-10 text-center">
              <p className="text-sm text-[#9ca3af]">Henüz video eklenmemiş.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {videoData?.items.map((video) => (
                  <div key={video.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3" style={{ boxShadow: '0px 1px 4px rgba(17,28,45,0.05)' }}>
                    {/* Thumbnail */}
                    <div className="w-16 h-10 bg-[#e8eeff] rounded-lg overflow-hidden shrink-0">
                      {video.thumbnail_path ? (
                        <img src={video.thumbnail_path.replace('/media/thumbnails/', '/thumbnails/')} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <polygon points="5,3 14,8 5,13" fill="#c3c5d9" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0d1117] truncate">{video.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={video.status} />
                        {video.category_id && (
                          <span className="text-[0.625rem] text-[#9ca3af]">
                            {categories.find((c) => c.id === video.category_id)?.name}
                          </span>
                        )}
                        <span className="text-[0.625rem] text-[#d1d5db]">
                          {new Date(video.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {video.status === 'failed' && video.error_message && (
                        <p className="text-[0.625rem] text-red-400 mt-0.5 truncate">{video.error_message}</p>
                      )}
                    </div>
                    {/* Actions */}
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 3.5h10M5.5 3.5v-1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1.5M3 3.5l.7 7.7a.5.5 0 0 0 .5.45h5.6a.5.5 0 0 0 .5-.45l.7-7.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {videoData && videoData.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button onClick={() => setVideoPage((p) => Math.max(1, p - 1))} disabled={videoPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#374151] hover:bg-[#e8eeff] disabled:opacity-40 disabled:cursor-not-allowed text-sm" style={{ boxShadow: '0px 1px 4px rgba(17,28,45,0.06)' }}>&#8249;</button>
                  {Array.from({ length: videoData.pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setVideoPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === videoPage ? 'bg-[#003ec7] text-white' : 'bg-white text-[#374151] hover:bg-[#e8eeff]'}`} style={{ boxShadow: p !== videoPage ? '0px 1px 4px rgba(17,28,45,0.06)' : undefined }}>{p}</button>
                  ))}
                  <button onClick={() => setVideoPage((p) => Math.min(videoData.pages, p + 1))} disabled={videoPage === videoData.pages} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#374151] hover:bg-[#e8eeff] disabled:opacity-40 disabled:cursor-not-allowed text-sm" style={{ boxShadow: '0px 1px 4px rgba(17,28,45,0.06)' }}>&#8250;</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
