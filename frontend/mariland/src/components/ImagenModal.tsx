import { useEffect } from 'react'

interface ImagenModalProps {
  url: string
  onClose: () => void
}

export default function ImagenModal({ url, onClose }: ImagenModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={(e) => e.stopPropagation()}
        className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
        aria-label="Cerrar"
        type="button"
      >
        ✕
      </button>
      <img
        src={url}
        alt="Foto del piso en grande"
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
