'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { bodhiniStartGuide, bodhiniOnEvent } from '@/lib/bodhini'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface Attachment {
  name: string
  size: string
  type: string
  preview?: string // base64 data URL for images
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  isError?: boolean
  attachments?: Attachment[]
}

interface ModelInfo {
  id: string
}

interface AgentInfo {
  id: string
  name: string
  description?: string
  instructions?: string
  model?: string
}

// ----------------------------------------------------------------------
// Icons (feather‑style, consistent)
// ----------------------------------------------------------------------

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
)

const IconLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

const IconBot = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>
)

const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const IconMic = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const IconPaperclip = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
)

const IconX = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
)



// ----------------------------------------------------------------------
// Loading Dots (enhanced)
// ----------------------------------------------------------------------

const LoadingDots = () => (
  <span className="flex items-center gap-1.5">
    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
  </span>
)

// ----------------------------------------------------------------------
// Code Block with Copy Button
// ----------------------------------------------------------------------

const CodeBlock = ({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-2">
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        className="rounded-lg text-xs"
      >
        {children}
      </SyntaxHighlighter>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700/80 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
        title="Copy code"
      >
        {copied ? '✓' : <IconCopy />}
      </button>
    </div>
  )
}

// ----------------------------------------------------------------------
// Custom Dropdown
// ----------------------------------------------------------------------

function Dropdown({
  icon, label, value, options, active, accentClass, onSelect,
}: {
  icon: string
  label: string
  value: string
  options: { id: string; name: string }[]
  active: boolean
  accentClass: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(o => o.id === value)?.name ?? value

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all select-none ${
          active ? accentClass : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <span>{icon}</span>
        <span className="max-w-27.5 truncate">{selectedLabel}</span>
        <span className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <IconChevron />
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1.5 left-0 min-w-45 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-fade-in">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onSelect(opt.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                  opt.id === value
                    ? 'bg-gray-50 font-semibold text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  opt.id === value ? 'bg-indigo-500' : 'bg-transparent'
                }`} />
                <span className="truncate">{opt.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [mode, setMode] = useState<'model' | 'agent'>('agent')
  const [isFocused, setIsFocused] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setAttachedFiles(prev => [...prev, ...files])
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = ev => {
          setFilePreviews(prev => ({ ...prev, [file.name + file.size]: ev.target?.result as string }))
        }
        reader.readAsDataURL(file)
      }
    })
    // reset so same file can be re-attached
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setAttachedFiles(prev => {
      const next = [...prev]
      const removed = next.splice(idx, 1)[0]
      setFilePreviews(p => { const n = { ...p }; delete n[removed.name + removed.size]; return n })
      return next
    })
  }

  const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Bodhini guide event listener
  useEffect(() => bodhiniOnEvent(({ event_type, guide_id, step_id }) => {
    console.log('[Bodhini]', event_type, guide_id, step_id ?? '')
  }), [])

  // Fetch models & agents
  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        const list: ModelInfo[] = Array.isArray(data.data) ? data.data : []
        setModels(list)
        if (list.length > 0) setSelectedModel(list[0].id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        const list: AgentInfo[] = Array.isArray(data.agents) ? data.agents : []
        setAgents(list)
        if (list.length > 0) setSelectedAgent(list[0].id)
      })
      .catch(() => {})
  }, [])

  const resizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 224) + 'px'
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if ((!text && attachedFiles.length === 0) || isLoading) return

    const attachments: Attachment[] = attachedFiles.map(f => ({
      name: f.name,
      size: formatFileSize(f.size),
      type: f.type,
      preview: filePreviews[f.name + f.size],
    }))
    const fileNote = attachments.length
      ? '\n\n' + attachments.map(a => `📎 ${a.name} (${a.size})`).join('\n')
      : ''

    const userMessage: Message = {
      role: 'user',
      content: text + fileNote,
      timestamp: getTime(),
      attachments: attachments.length ? attachments : undefined,
    }
    const historyForApi: Message[] = [...messages, { role: 'user', content: text || '(see attached files)', timestamp: getTime() }]
    setMessages([...messages, userMessage, { role: 'assistant', content: '', timestamp: getTime() }])
    setInput('')
    setAttachedFiles([])
    setFilePreviews({})
    setIsLoading(true)
    setError(null)
    setTimeout(() => { if (textareaRef.current) textareaRef.current.style.height = 'auto' }, 0)

    try {
      const isAgent = mode === 'agent'
      const apiUrl = isAgent ? '/api/agent-chat' : '/api/chat'
      const reqBody: Record<string, unknown> = { messages: historyForApi }
      if (isAgent) reqBody.agent_id = selectedAgent
      else if (selectedModel) reqBody.model = selectedModel

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(data.error ?? data.detail ?? `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            const delta = parsed.choices?.[0]?.delta?.content
            if (typeof delta === 'string') {
              assistantContent += delta
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent, timestamp: getTime() }
                return updated
              })
            }
          } catch { /* ignore */ }
        }
      }

      // Final flush
      if (buffer.startsWith('data: ')) {
        const payload = buffer.slice(6).trim()
        if (payload && payload !== '[DONE]') {
          try {
            const parsed = JSON.parse(payload)
            const delta = parsed.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta) {
              assistantContent += delta
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent, timestamp: getTime() }
                return updated
              })
            }
          } catch { /* ignore */ }
        }
      }

      if (!assistantContent) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: '(empty response)', timestamp: getTime() }
          return updated
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      const isGuardrail = /guardrail|blocked|pii|security check/i.test(msg)
      const guardrailType = msg.replace(/^.*guardrail:\s*/i, '').trim()
      const friendlyMsg = isGuardrail
        ? `I\'m unable to process that message — it was blocked by a security guardrail.\n\n**Reason:** ${guardrailType}\n\nThis protection is in place to ensure safe interactions. Please review your message and avoid including sensitive personal information.`
        : `I ran into an issue processing your request.\n\n**Error:** ${msg}\n\nPlease try again or rephrase your message.`
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: friendlyMsg, timestamp: getTime(), isError: true }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, selectedModel, selectedAgent, mode, attachedFiles, filePreviews])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => { setMessages([]); setError(null) }

  const currentAgent = agents.find(a => a.id === selectedAgent)

  return (
    <div className="flex h-screen bg-gray-50 font-sans antialiased overflow-hidden">
      {/* MAIN CHAT AREA – full width */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-white/90 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Wordmark logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-linear-to-br from-gray-900 to-indigo-900 rounded-xl flex items-center justify-center shadow-md shrink-0">
                <span className="text-white font-bold text-sm tracking-tight select-none">C</span>
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight tracking-tight select-none">
                  <span className="text-gray-900">Console</span>
                  <span className="text-indigo-500"> AI</span>
                  <span className="text-gray-400 font-medium"> Assistant</span>
                </h1>
                <p className="text-xs text-gray-400 leading-tight">
                  {mode === 'agent' && currentAgent ? currentAgent.name : selectedModel || 'AI Model'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bodhiniStartGuide()}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-full hover:bg-indigo-50 border border-indigo-200"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              Tour
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-full hover:bg-red-50"
              >
                <IconTrash /> Clear
              </button>
            )}
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto py-6 bg-white">
          <div className="max-w-4xl mx-auto px-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              
              <h2 className="text-2xl font-semibold text-gray-700">Start a conversation</h2>
              <p className="text-sm text-gray-400 max-w-sm mt-2">
                Ask me anything – I'm here to help with analysis, writing, coding, and more.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              const isError = msg.isError
              return (
                <div key={idx} className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isUser ? 'bg-indigo-100 text-indigo-700' : isError ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'}`}>
                    {isUser ? 'U' : isError ? '⚠' : <IconBot />}
                  </div>
                  <div className={`max-w-4/5 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${isUser ? 'bg-gray-800 text-white rounded-br-sm' : isError ? 'bg-red-50 border border-red-300 text-red-800 rounded-bl-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      {msg.role === 'assistant' && !msg.content && isLoading && idx === messages.length - 1 ? (
                        <LoadingDots />
                      ) : isError ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-red-900">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : msg.role === 'assistant' ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-md font-semibold mt-2 mb-1">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                            a: ({ href, children }) => (
                              <a href={href} className="text-indigo-600 underline hover:text-indigo-800" target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 my-2">
                                {children}
                              </blockquote>
                            ),
                            code: ({ className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '')
                              const language = match ? match[1] : ''
                              const codeString = String(children).replace(/\n$/, '')
                              if (language) {
                                return <CodeBlock language={language}>{codeString}</CodeBlock>
                              }
                              return (
                                <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono text-red-600">
                                  {children}
                                </code>
                              )
                            },
                            pre: ({ children }) => <>{children}</>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-2">
                                <table className="min-w-full border border-gray-200 text-sm">{children}</table>
                              </div>
                            ),
                            th: ({ children }) => <th className="border border-gray-200 px-2 py-1 bg-gray-50">{children}</th>,
                            td: ({ children }) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {/* Attachment chips in user messages */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`flex flex-wrap gap-1.5 mt-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-[11px] text-white/90 backdrop-blur-sm">
                            {att.preview ? (
                              <img src={att.preview} alt={att.name} className="w-4 h-4 rounded object-cover" />
                            ) : (
                              <IconFile />
                            )}
                            <span className="max-w-25 truncate">{att.name}</span>
                            <span className="opacity-60">{att.size}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-[11px] text-gray-400 mt-1 block">{msg.timestamp}</span>
                  </div>
                </div>
              )
            })
          )}

          <div ref={messagesEndRef} />
          </div>{/* /max-w-4xl */}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 bg-white px-4 pt-4 pb-4">
          <div className="max-w-4xl mx-auto">
            {/* Char progress bar */}
            <div className="h-0.5 rounded-full bg-gray-100 mb-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  input.length > 1800 ? 'bg-red-400' : input.length > 1400 ? 'bg-amber-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${Math.min((input.length / 2000) * 100, 100)}%` }}
              />
            </div>

            {/* File chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {attachedFiles.map((file, idx) => {
                  const key = file.name + file.size
                  const preview = filePreviews[key]
                  const isImage = file.type.startsWith('image/')
                  return (
                    <div key={key} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-xl px-2.5 py-1.5 text-xs text-indigo-700 group">
                      {isImage && preview ? (
                        <img src={preview} alt={file.name} className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <span className="text-indigo-400"><IconFile /></span>
                      )}
                      <span className="max-w-30 truncate font-medium">{file.name}</span>
                      <span className="text-indigo-400 text-[10px]">{formatFileSize(file.size)}</span>
                      <button onClick={() => removeFile(idx)} className="ml-0.5 text-indigo-300 hover:text-indigo-600 transition-colors">
                        <IconX />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Input box: textarea + bottom toolbar as one unified card */}
            <div className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
              isFocused ? 'border-indigo-300 ring-2 ring-indigo-100 bg-white' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
            }`}>

              {/* Textarea */}
              <div className="relative px-4 pt-4 pb-2">
                {!input && !isLoading && attachedFiles.length === 0 && (
                  <div className="absolute left-[1.15rem] top-[1.1rem] pointer-events-none text-gray-300">
                    <IconMic />
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); resizeTextarea() }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={isLoading ? 'Waiting for response...' : 'Describe what to build'}
                  rows={3}
                  disabled={isLoading}
                  className={`w-full bg-transparent outline-none resize-none text-sm leading-relaxed min-h-20 max-h-56 transition-colors ${
                    (input || attachedFiles.length > 0) ? 'pl-0' : 'pl-6'
                  } ${
                    isLoading ? 'text-gray-400 placeholder-gray-300 cursor-not-allowed' : 'text-gray-700 placeholder-gray-400'
                  }`}
                />
                {input.length > 0 && (
                  <div className="flex justify-end">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                      input.length > 1800 ? 'text-red-500 bg-red-50' :
                      input.length > 1400 ? 'text-amber-600 bg-amber-50' :
                      'text-gray-300'
                    }`}>
                      {input.length} / 2000
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                {/* Left controls */}
                <div className="flex items-center gap-1">
                  {/* Attach */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    title="Attach file"
                    className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IconPaperclip />
                    <span className="text-[11px] font-medium">Attach</span>
                    {attachedFiles.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full leading-none">
                        {attachedFiles.length}
                      </span>
                    )}
                  </button>

                  <div className="w-px h-5 bg-gray-200 mx-1" />

                  {/* Agent dropdown */}
                  <Dropdown
                    icon="🤖"
                    label="Agent"
                    value={selectedAgent}
                    options={agents.map(a => ({ id: a.id, name: a.name }))}
                    active={mode === 'agent'}
                    accentClass="bg-violet-50 border-violet-200 text-violet-700"
                    onSelect={id => { setSelectedAgent(id); setMode('agent') }}
                  />

                  {/* Model dropdown */}
                  <Dropdown
                    icon="🧠"
                    label="Model"
                    value={selectedModel}
                    options={models.map(m => ({ id: m.id, name: m.id }))}
                    active={mode === 'model'}
                    accentClass="bg-blue-50 border-blue-200 text-blue-700"
                    onSelect={id => { setSelectedModel(id); setMode('model') }}
                  />
                </div>

                {/* Right: hints + send */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-300 hidden md:block">
                    <kbd className="font-mono bg-gray-100 px-1 rounded text-gray-400">↵</kbd> Send &nbsp;
                    <kbd className="font-mono bg-gray-100 px-1 rounded text-gray-400">⇧↵</kbd> New line
                  </span>
                  <button
                    onClick={() => sendMessage()}
                    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                    title="Send (Enter)"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 ${
                      (input.trim() || attachedFiles.length > 0) && !isLoading
                        ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <span className="w-3.5 h-3.5 block border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><IconSend /><span>Send</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.xml,.yaml,.yml,.docx,.xlsx"
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.2s ease-out forwards; }
        .animate-slide-in-right { animation: slide-in-right 0.25s ease-out forwards; }
      `}</style>
    </div>
  )
}