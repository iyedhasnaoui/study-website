import { useEffect, useRef, useState, type ChangeEvent } from 'react'

const MAX_FILES = 5
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ACCEPTED_FILES = '.pdf,audio/*,video/*'

interface MediaComposerProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
  compact?: boolean
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileKind = (file: File) => {
  if (file.type === 'application/pdf') return 'PDF'
  if (file.type.startsWith('audio/')) return 'Audio'
  if (file.type.startsWith('video/')) return 'Video'
  return 'Media'
}

const isAcceptedFile = (file: File) =>
  file.type === 'application/pdf' || file.type.startsWith('audio/') || file.type.startsWith('video/')

export function MediaComposer({ files, onFilesChange, disabled = false, compact = false }: MediaComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const filesRef = useRef(files)
  const timerRef = useRef<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => () => {
    if (timerRef.current != null) window.clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const addFiles = (incomingFiles: File[]) => {
    const accepted: File[] = []
    for (const file of incomingFiles) {
      if (!isAcceptedFile(file)) {
        setError(`${file.name} is not a PDF, audio, or video file.`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} is larger than 50 MB.`)
        continue
      }
      accepted.push(file)
    }

    const nextFiles = [...filesRef.current, ...accepted]
      .filter((file, index, all) => all.findIndex((candidate) =>
        candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified
      ) === index)
      .slice(0, MAX_FILES)

    if (filesRef.current.length + accepted.length > MAX_FILES) {
      setError('You can attach up to five files to one contribution.')
    } else if (accepted.length > 0) {
      setError(null)
    }
    filesRef.current = nextFiles
    onFilesChange(nextFiles)
  }

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported by this browser. You can still upload an audio file.')
      return
    }
    if (filesRef.current.length >= MAX_FILES) {
      setError('Remove one attachment before recording a voice note.')
      return
    }

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
        .find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream)

      chunksRef.current = []
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || preferredMimeType || 'audio/webm'
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm'
        const recording = new Blob(chunksRef.current, { type: mimeType })
        if (recording.size > 0) {
          addFiles([new File([recording], `voice-experience-${Date.now()}.${extension}`, {
            type: mimeType,
            lastModified: Date.now(),
          })])
        }
        stopTracks()
      }

      recorder.start(500)
      setRecordingSeconds(0)
      setIsRecording(true)
      timerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000)
    } catch {
      stopTracks()
      setError('Microphone access was not granted. Allow it in the browser or upload an audio file.')
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    recorderRef.current = null
    if (timerRef.current != null) window.clearInterval(timerRef.current)
    timerRef.current = null
    setIsRecording(false)
  }

  const removeFile = (indexToRemove: number) => {
    const nextFiles = filesRef.current.filter((_, index) => index !== indexToRemove)
    filesRef.current = nextFiles
    onFilesChange(nextFiles)
    setError(null)
  }

  return (
    <section className={`media-composer ${compact ? 'media-composer--compact' : ''}`} aria-label="Add media">
      <div className="media-composer__heading">
        <div>
          <strong>Add learning media</strong>
          <span>PDF, audio, video, or a voice experience</span>
        </div>
        <span className="media-composer__count">{files.length}/{MAX_FILES}</span>
      </div>

      <div className="media-composer__actions">
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={ACCEPTED_FILES}
          multiple
          onChange={handleFilesSelected}
          disabled={disabled || isRecording}
        />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || isRecording}>
          <span aria-hidden="true">＋</span> Choose files
        </button>
        <button
          className={isRecording ? 'is-recording' : ''}
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
        >
          <span className="media-composer__mic" aria-hidden="true">{isRecording ? '■' : '●'}</span>
          {isRecording ? `Stop · ${recordingSeconds}s` : 'Record voice'}
        </button>
      </div>

      {isRecording ? (
        <div className="media-composer__recording" role="status">
          <span /> Recording your experience… speak naturally, then press stop.
        </div>
      ) : null}

      {files.length > 0 ? (
        <ul className="media-composer__files">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`}>
              <span className={`media-composer__type media-composer__type--${fileKind(file).toLowerCase()}`}>
                {fileKind(file)}
              </span>
              <span className="media-composer__file-name" title={file.name}>{file.name}</span>
              <span className="media-composer__file-size">{formatBytes(file.size)}</span>
              <button type="button" onClick={() => removeFile(index)} disabled={disabled} aria-label={`Remove ${file.name}`}>×</button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="media-composer__error" role="alert">{error}</p> : null}
    </section>
  )
}
