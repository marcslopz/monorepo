import { useRef, useState } from 'react'
import { pisosApi } from '../api/pisos'
import type { Piso } from '../types/piso'
import Modal from './Modal'

interface ImportFromUrlModalProps {
  onImported: (piso: Piso) => void
  onClose: () => void
}

type Step = 'fetching' | 'extracting' | 'saving'

const STEPS: { id: Step; label: string }[] = [
  { id: 'fetching', label: 'Obteniendo página del portal' },
  { id: 'extracting', label: 'Analizando datos con IA' },
  { id: 'saving', label: 'Guardando piso' },
]

type StepState = 'pending' | 'active' | 'done' | 'error'

function getStepState(
  stepId: Step,
  currentStep: Step | null,
  errorStep: Step | null,
  isDone: boolean,
): StepState {
  const order: Step[] = ['fetching', 'extracting', 'saving']
  const stepIdx = order.indexOf(stepId)
  const currentIdx = currentStep ? order.indexOf(currentStep) : -1

  if (errorStep === stepId) return 'error'
  if (isDone || stepIdx < currentIdx) return 'done'
  if (stepId === currentStep) return 'active'
  return 'pending'
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'active') {
    return (
      <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    )
  }
  if (state === 'done') {
    return (
      <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (state === 'error') {
    return (
      <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
}

export default function ImportFromUrlModal({ onImported, onClose }: ImportFromUrlModalProps) {
  const [url, setUrl] = useState('')
  const [currentStep, setCurrentStep] = useState<Step | null>(null)
  const [errorStep, setErrorStep] = useState<Step | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleClose = () => {
    abortRef.current?.abort()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setCurrentStep(null)
    setErrorStep(null)
    setErrorMessage(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await pisosApi.importFromUrlStream(
        url.trim(),
        (event) => {
          if (event.type === 'progress') {
            setCurrentStep(event.step as Step)
          } else if (event.type === 'error') {
            setErrorStep(event.step as Step)
            setErrorMessage(event.message)
          } else if (event.type === 'done') {
            onImported(event.piso)
            onClose()
          }
        },
        controller.signal,
      )
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setErrorStep(currentStep ?? 'fetching')
      setErrorMessage('Error de conexión. Inténtalo de nuevo.')
    }
  }

  const showProgress = currentStep !== null

  return (
    <Modal title="Importar piso desde URL" onClose={handleClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Pega el enlace del piso de Fotocasa, Idealista u otro portal y lo importaremos automáticamente.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL del piso</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.fotocasa.es/..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            required
            autoFocus
            disabled={showProgress}
          />
        </div>

        {showProgress && (
          <ul className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            {STEPS.map((step) => {
              const state = getStepState(step.id, currentStep, errorStep, false)
              return (
                <li key={step.id} className="flex items-center gap-3">
                  <StepIcon state={state} />
                  <span
                    className={
                      state === 'error'
                        ? 'text-sm font-medium text-red-600'
                        : state === 'done'
                          ? 'text-sm text-gray-400 line-through'
                          : state === 'active'
                            ? 'text-sm font-medium text-gray-900'
                            : 'text-sm text-gray-400'
                    }
                  >
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={showProgress && !errorStep || !url.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {showProgress && !errorStep ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Importando...
              </>
            ) : errorStep ? (
              'Reintentar'
            ) : (
              'Importar'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
