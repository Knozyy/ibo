import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuthStore } from '../store/auth'

interface Category { id: string; name: string; slug: string }
interface Video {
  id: string; title: string; original_url: string
  file_path: string | null; thumbnail_path: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null; category_id: string | null; created_at: string
}
interface VideoPage { items: Video[]; total: number; page: number; limit: number; pages: number }

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
        <svg className="animate-spin shrink-0" width="8" height="8" viewBox="0 0 8 8" fill="none">
          <circle cx="4" cy="4" r="3" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M4 1a3 3 0 0 1 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </span>
  )
}

function VideoCard({ video, onPlay }: { video: Video; onPlay: (v: Video) => void }) {
  const thumb = video.thumbnail_path
    ? video.thumbnail_path.replace('/media/thumbnails/', '/thumbnails/')
    : null
  return (
    <div
      className="group bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:bg-[#dfe8ff]"
      style={{ boxShadow: '0px 2px 8px rgba(17, 28, 45, 0.04)' }}
      onClick={() => video.status === 'completed' && onPlay(video)}
    >
      <div className="relative aspect-video bg-[#e8eeff] overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={video.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {(video.status === 'processing' || video.status === 'pending') ? (
              <svg className="animate-spin text-[#003ec7]" width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
                <path d="M14 3a11 11 0 0 1 11 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : video.status === 'failed' ? (
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="#ef4444" strokeOpacity="0.4" strokeWidth="2" />
                <path d="M14 8v7" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="18.5" r="1.25" fill="#ef4444" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="4" fill="#c3c5d9" fillOpacity="0.3" />
                <polygon points="11,8 22,14 11,20" fill="#c3c5d9" />
              </svg>
            )}
          </div>
        )}
        {video.status === 'completed' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="w-11 h-11 bg-[#003ec7] rounded-full flex items-center justify-center" style={{ boxShadow: '0 4px 16px rgba(0,62,199,0.4)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polygon points="6,4 15,9 6,14" fill="white" /></svg>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2"><StatusBadge status={video.status} /></div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-[#0d1117] truncate leading-snug">{video.title}</p>
        <p className="text-[0.6875rem] text-[#6b7280] mt-0.5">
          {new Date(video.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        {video.status === 'failed' && video.error_message && (
          <p className="text-[0.625rem] text-red-400 mt-1 line-clamp-2">{video.error_message}</p>
        )}
      </div>
    </div>
  )
}

function VideoModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const src = video.file_path ? video.file_path.replace('/media/videos/', '/videos/') : null
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden"
        style={{ boxShadow: '0px 24px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {src ? (
          <video ref={videoRef} src={src} controls autoPlay className="w-full max-h-[75vh] bg-black" />
        ) : (
          <div className="aspect-video flex items-center justify-center text-white/50 text-sm">Video dosyası bulunamadı.</div>
        )}
        <div className="px-5 py-3.5 bg-[#0d1117]">
          <p className="text-white font-medium text-sm truncate">{video.title}</p>
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Gallery() {
  const clearToken = useAuthStore((s) => s.clearToken)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [data, setData] = useState<VideoPage | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null)

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: Record<string, unknown> = { page, limit: 24 }
    if (activeCategory) params.category_id = activeCategory
    api.get('/videos', { params }).then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [page, activeCategory])

  useEffect(() => {
    const hasPending = data?.items.some((v) => v.status === 'pending' || v.status === 'processing')
    if (!hasPending) return
    const id = setTimeout(() => {
      const params: Record<string, unknown> = { page, limit: 24 }
      if (activeCategory) params.category_id = activeCategory
      api.get('/videos', { params }).then((r) => setData(r.data)).catch(() => {})
    }, 5000)
    return () => clearTimeout(id)
  }, [data, page, activeCategory])

  function handleCategoryChange(id: string | null) { setActiveCategory(id); setPage(1) }

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <header className="bg-[#f9f9ff] sticky top-0 z-20" style={{ borderBottom: '1px solid #d0daf2' }}>
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#003ec7] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <polygon points="4,3 12,7 4,11" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#0d1117] tracking-tight">VideoPortal</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 mx-4">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full transition-colors ${activeCategory === null ? 'bg-[#003ec7] text-white' : 'bg-[#e8eeff] text-[#374151] hover:bg-[#dfe8ff]'}`}
            >
              Tümü
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full transition-colors ${activeCategory === cat.id ? 'bg-[#003ec7] text-white' : 'bg-[#e8eeff] text-[#374151] hover:bg-[#dfe8ff]'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/admin" className="text-xs font-medium text-[#003ec7] px-3 py-1.5 rounded-lg hover:bg-[#e8eeff] transition-colors">Yönet</Link>
            <button onClick={() => { clearToken(); window.location.href = '/login' }} className="text-xs text-[#6b7280] px-2 py-1.5 rounded-lg hover:bg-[#f0f3ff] transition-colors">Çıkış</button>
          </div>
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-[2.2rem] font-bold text-[#0d1117]" style={{ letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            {activeCategory ? (categories.find((c) => c.id === activeCategory)?.name ?? 'Videolar') : 'Tüm Videolar'}
          </h2>
          {data && <p className="text-sm text-[#6b7280] mt-1">{data.total} video</p>}
        </div>
        {loading && !data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-[#e8eeff] rounded-xl aspect-video animate-pulse" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#e8eeff] rounded-2xl flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="3" y="3" width="22" height="22" rx="4" stroke="#c3c5d9" strokeWidth="1.5" />
                <polygon points="11,8 22,14 11,20" fill="#c3c5d9" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#374151]">Henüz video yok</p>
            <p className="text-xs text-[#9ca3af] mt-1">Yönetim panelinden yeni video ekleyebilirsiniz.</p>
            <Link to="/admin" className="mt-4 text-xs font-medium text-[#003ec7] px-4 py-2 bg-[#e8eeff] rounded-lg hover:bg-[#dfe8ff] transition-colors">Video Ekle</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {data?.items.map((video) => (
                <VideoCard key={video.id} video={video} onPlay={setPlayingVideo} />
              ))}
            </div>
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#374151] hover:bg-[#e8eeff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm" style={{ boxShadow: '0px 1px 4px rgba(17,28,45,0.06)' }}>&#8249;</button>
                {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-[#003ec7] text-white' : 'bg-white text-[#374151] hover:bg-[#e8eeff]'}`} style={{ boxShadow: p !== page ? '0px 1px 4px rgba(17,28,45,0.06)' : undefined }}>{p}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#374151] hover:bg-[#e8eeff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm" style={{ boxShadow: '0px 1px 4px rgba(17,28,45,0.06)' }}>&#8250;</button>
              </div>
            )}
          </>
        )}
      </main>
      {playingVideo && <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </div>
  )
}
