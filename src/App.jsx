import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const paragraphs = [
  'The best way to learn something new is to take one small step every day. With a little patience and steady practice, what once felt difficult will begin to feel natural.',
  'Morning light falls through the window as the city slowly wakes. A quiet moment, a warm drink, and a fresh page are all you need to begin something wonderful today.',
  'Take a deep breath and let your hands find their rhythm. There is no need to rush. Each careful word is a chance to build confidence and enjoy the simple act of learning.',
  'Beyond the busy streets, a small garden offers a place to rest. Leaves move gently in the breeze while birds sing above the path. Sometimes progress begins with a peaceful mind.',
]

function randomParagraph(previous = '') {
  const choices = paragraphs.filter((paragraph) => paragraph !== previous)
  return choices[Math.floor(Math.random() * choices.length)]
}

const words = 'the be to of and a in that have it for not on with as you do at this but by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us learn light river calm quiet home world small begin open find still move green great right place write read every life through little morning story between hand change mind long help try start keep word next clear sound garden water blue sun walk night'.split(' ')

function generateText(mode, count, punctuation, numbers) {
  if (mode === 'quote') return randomParagraph()
  return Array.from({ length: mode === 'words' ? count : 45 }, (_, index) => {
    let word = numbers && index % 9 === 5 ? String(Math.floor(Math.random() * 999) + 1) : words[Math.floor(Math.random() * words.length)]
    if (punctuation) {
      if (index % 8 === 0) word = word[0].toUpperCase() + word.slice(1)
      if (index % 8 === 7) word += '.'
      else if (index % 5 === 3) word += ','
    }
    return word
  }).join(' ')
}

function readBests() {
  try {
    const saved = JSON.parse(localStorage.getItem('typesprint-bests'))
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch { return {} }
}

function countCorrect(text, passage) {
  return [...text].filter((character, index) => character === passage[index]).length
}

const defaultPreferences = {
  textSize: 23, lineHeight: 2.15, letterSpacing: 0, font: 'mono',
  contrast: false, reducedMotion: false, underlineErrors: true,
}

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('typesprint-accessibility')) || {}
    const preferences = { ...defaultPreferences }
    for (const [key, min, max] of [['textSize', 16, 36], ['lineHeight', 1.5, 2.5], ['letterSpacing', 0, 3]]) {
      if (Number.isFinite(saved[key])) preferences[key] = Math.min(max, Math.max(min, saved[key]))
    }
    if (['mono', 'sans', 'serif'].includes(saved.font)) preferences.font = saved.font
    for (const key of ['contrast', 'reducedMotion', 'underlineErrors']) {
      if (typeof saved[key] === 'boolean') preferences[key] = saved[key]
    }
    return preferences
  } catch { return { ...defaultPreferences } }
}

function App() {
  const [preferences, setPreferences] = useState(readPreferences)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [preferencesSaved, setPreferencesSaved] = useState(true)
  const [duration, setDuration] = useState(30)
  const [mode, setMode] = useState('time')
  const [wordCount, setWordCount] = useState(25)
  const [punctuation, setPunctuation] = useState(false)
  const [numbers, setNumbers] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [isTypingFocused, setIsTypingFocused] = useState(false)
  const [passage, setPassage] = useState(() => generateText('time', 25, false, false))
  const [typed, setTyped] = useState('')
  const [status, setStatus] = useState('ready')
  const [elapsed, setElapsed] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [bests, setBests] = useState(readBests)
  const startedAt = useRef(null)
  const latest = useRef({ text: '', passage: '', attempts: 0, hits: 0 })
  const ended = useRef(false)
  const inputRef = useRef(null)
  const passageRef = useRef(null)
  const restartRef = useRef(null)
  const correct = countCorrect(typed, passage)
  const wpm = elapsed > 0 ? Math.round((correct / 5) / (elapsed / 60)) : 0
  const rawWpm = elapsed > 0 ? Math.round((typed.length / 5) / (elapsed / 60)) : 0
  const remaining = Math.max(0, Math.ceil(duration - elapsed))
  const bestKey = `${mode}:${mode === 'time' ? duration : mode === 'words' ? wordCount : 'all'}:${mode !== 'quote' && punctuation}:${mode !== 'quote' && numbers}`
  const best = Number.isFinite(bests[bestKey]) ? bests[bestKey] : 0
  const completedWords = Math.min(passage.split(' ').length, typed.split(' ').length - (typed.length < passage.length ? 1 : 0))

  const finish = useCallback((seconds) => {
    if (ended.current) return
    ended.current = true
    const finalWpm = seconds > 0 ? Math.round(countCorrect(latest.current.text, latest.current.passage) / 5 / (seconds / 60)) : 0
    setElapsed(seconds)
    setBests((previous) => ({ ...previous, [bestKey]: Math.max(Number.isFinite(previous[bestKey]) ? previous[bestKey] : 0, finalWpm) }))
    setStatus('finished')
  }, [bestKey])

  useEffect(() => {
    if (status !== 'running') return
    const timer = window.setInterval(() => {
      const seconds = (performance.now() - startedAt.current) / 1000
      if (mode === 'time' && seconds >= duration) finish(duration)
      else setElapsed(seconds)
    }, 100)
    return () => window.clearInterval(timer)
  }, [status, duration, mode, finish])

  useEffect(() => {
    try { localStorage.setItem('typesprint-bests', JSON.stringify(bests)) }
    catch { /* Tests remain available when storage is blocked. */ }
  }, [bests])

  useEffect(() => {
    const current = passageRef.current?.querySelector('.character-current')
    const container = passageRef.current
    if (current && container) {
      const top = current.getBoundingClientRect().top - container.getBoundingClientRect().top
      if (top > container.clientHeight - 45 || top < 0) container.scrollTop += top - 40
    }
  }, [typed, preferences])

  function updatePreference(key, value) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    try {
      localStorage.setItem('typesprint-accessibility', JSON.stringify(next))
      setPreferencesSaved(true)
    } catch { setPreferencesSaved(false) }
  }

  function resetPreferences() {
    setPreferences({ ...defaultPreferences })
    try {
      localStorage.setItem('typesprint-accessibility', JSON.stringify(defaultPreferences))
      setPreferencesSaved(true)
    } catch { setPreferencesSaved(false) }
  }

  function restart(options = {}) {
    const next = { mode, duration, wordCount, punctuation, numbers, ...options }
    setMode(next.mode)
    setDuration(next.duration)
    setWordCount(next.wordCount)
    setPunctuation(next.punctuation)
    setNumbers(next.numbers)
    setPassage(generateText(next.mode, next.wordCount, next.punctuation, next.numbers))
    setTyped('')
    setAccuracy(0)
    setElapsed(0)
    setStatus('ready')
    setCapsLock(false)
    startedAt.current = null
    ended.current = false
    latest.current = { text: '', passage: '', attempts: 0, hits: 0 }
    if (passageRef.current) passageRef.current.scrollTop = 0
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleTyping(event) {
    if (ended.current) return
    if (mode === 'time' && startedAt.current !== null && performance.now() - startedAt.current >= duration * 1000) {
      finish(duration)
      return
    }
    const text = mode === 'time' ? event.target.value : event.target.value.slice(0, passage.length)
    if (status === 'ready' && text.length > 0) {
      startedAt.current = performance.now()
      setStatus('running')
    }
    let nextPassage = passage
    if (mode === 'time' && text.length >= passage.length - 40) {
      nextPassage += ' ' + generateText('time', wordCount, punctuation, numbers)
      setPassage(nextPassage)
    }
    let prefix = 0
    while (prefix < typed.length && prefix < text.length && typed[prefix] === text[prefix]) prefix++
    const inserted = text.slice(prefix)
    const hits = [...inserted].filter((character, index) => character === nextPassage[prefix + index]).length
    latest.current = { text, passage: nextPassage, attempts: latest.current.attempts + inserted.length, hits: latest.current.hits + hits }
    setAccuracy(latest.current.attempts ? Math.round(latest.current.hits / latest.current.attempts * 100) : 0)
    setTyped(text)
    const seconds = startedAt.current === null ? 0 : (performance.now() - startedAt.current) / 1000
    setElapsed(seconds)
    if (mode !== 'time' && text.length === passage.length) finish(seconds)
  }

  function handleKeys(event) {
    setCapsLock(event.getModifierState('CapsLock'))
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      restartRef.current?.focus()
    }
    if (event.key === 'Escape') {
      setFocusMode(false)
      inputRef.current?.blur()
    }
  }

  return (
    <main className={`app-shell ${focusMode ? 'focus-mode' : ''} ${preferences.contrast ? 'high-contrast' : ''} ${preferences.reducedMotion ? 'reduce-motion' : ''} ${preferences.underlineErrors ? '' : 'color-errors'}`}
      style={{ '--typing-size': `${preferences.textSize}px`, '--typing-line-height': preferences.lineHeight,
        '--typing-spacing': `${preferences.letterSpacing}px`, '--typing-font': preferences.font === 'sans' ? 'Arial, sans-serif' : preferences.font === 'serif' ? 'Georgia, serif' : "'JetBrains Mono', monospace" }}>
      <header className="site-header">
        <a className="brand" href="./" aria-label="TypeSprint home">
          <span className="brand-icon" aria-hidden="true">↗</span>
          TypeSprint<span className="brand-dot">.</span>
        </a>
        <span className="header-note"><span className="status-dot" /> A little practice. A lot of progress.</span>
      </header>

      <section className="intro">
        <p className="eyebrow">FIND YOUR FLOW</p>
        <h1>Small sprints.<br /><span>Sharper skills.</span></h1>
        <p className="intro-copy">Clear your mind, find your rhythm, and make every keystroke count.</p>
      </section>

      <section className="test-panel" aria-label="Typing practice">
        <div className="panel-toolbar">
          <div className="mode-label"><span aria-hidden="true">⌨</span> Typing practice <span className="preview-badge">{status === 'running' ? 'LIVE' : status === 'finished' ? 'DONE' : 'READY'}</span></div>
          <div className="duration-picker" role="group" aria-label={mode === 'time' ? 'Test duration' : 'Word count'}>
            {(mode === 'time' ? [15, 30, 60, 120] : mode === 'words' ? [10, 25, 50, 100] : []).map((seconds) => (
              <button key={seconds} type="button" aria-pressed={(mode === 'time' ? duration : wordCount) === seconds}
                className={(mode === 'time' ? duration : wordCount) === seconds ? 'selected' : ''}
                onClick={() => restart(mode === 'time' ? { duration: seconds } : { wordCount: seconds })}>{seconds}{mode === 'time' ? 's' : ''}</button>
            ))}
          </div>
        </div>

        <div className="test-settings">
          <div className="settings-group" role="group" aria-label="Test mode">
            {['time', 'words', 'quote'].map((item) => <button type="button" key={item} aria-pressed={mode === item} onClick={() => restart({ mode: item })}>{item}</button>)}
          </div>
          <div className="settings-group" role="group" aria-label="Text options">
            <button type="button" disabled={mode === 'quote'} aria-pressed={punctuation && mode !== 'quote'} onClick={() => restart({ punctuation: !punctuation })}>@ punctuation</button>
            <button type="button" disabled={mode === 'quote'} aria-pressed={numbers && mode !== 'quote'} onClick={() => restart({ numbers: !numbers })}># numbers</button>
          </div>
          <button className="focus-toggle" type="button" aria-pressed={focusMode} onClick={() => setFocusMode(!focusMode)}>{focusMode ? 'Exit focus' : 'Focus mode'}</button>
        </div>
        <div className="accessibility-toolbar">
          <button className="accessibility-toggle" type="button" aria-expanded={settingsOpen} aria-controls="accessibility-settings" onClick={() => setSettingsOpen(!settingsOpen)}>
            <span aria-hidden="true">Aa</span> Reading & accessibility <span aria-hidden="true">{settingsOpen ? '−' : '+'}</span>
          </button>
          <span>Make this space yours</span>
        </div>
        {settingsOpen && (
          <section id="accessibility-settings" className="accessibility-panel" aria-labelledby="accessibility-title">
            <div className="accessibility-heading"><div><h2 id="accessibility-title">Your comfort. Your rhythm.</h2><p>Adjust the passage below. Your test progress stays in place.</p></div>
              <button type="button" className="restart-button" onClick={resetPreferences}>Reset settings</button>
            </div>
            <div className="reading-controls">
              <label htmlFor="text-size">Text size <output htmlFor="text-size">{preferences.textSize}px</output>
                <input id="text-size" type="range" min="16" max="36" value={preferences.textSize} onChange={(event) => updatePreference('textSize', Number(event.target.value))} />
              </label>
              <label htmlFor="line-height">Line spacing <output htmlFor="line-height">{preferences.lineHeight.toFixed(2)}×</output>
                <input id="line-height" type="range" min="1.5" max="2.5" step="0.05" value={preferences.lineHeight} onChange={(event) => updatePreference('lineHeight', Number(event.target.value))} />
              </label>
              <label htmlFor="letter-spacing">Letter spacing <output htmlFor="letter-spacing">{preferences.letterSpacing}px</output>
                <input id="letter-spacing" type="range" min="0" max="3" step="0.25" value={preferences.letterSpacing} onChange={(event) => updatePreference('letterSpacing', Number(event.target.value))} />
              </label>
              <label htmlFor="reading-font">Passage font
                <select id="reading-font" value={preferences.font} onChange={(event) => updatePreference('font', event.target.value)}>
                  <option value="mono">Monospace · JetBrains Mono</option><option value="sans">Sans serif · Arial</option><option value="serif">Serif · Georgia</option>
                </select>
              </label>
            </div>
            <div className="accessibility-switches">
              <label><input type="checkbox" checked={preferences.contrast} onChange={(event) => updatePreference('contrast', event.target.checked)} /><span>High contrast<small>Brighter text and clearer borders throughout the page.</small></span></label>
              <label><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => updatePreference('reducedMotion', event.target.checked)} /><span>Reduce motion<small>Steady caret and no animated transitions. System preference is also respected.</small></span></label>
              <label><input type="checkbox" checked={preferences.underlineErrors} onChange={(event) => updatePreference('underlineErrors', event.target.checked)} /><span>Underline mistakes<small>Mark incorrect characters with more than color.</small></span></label>
            </div>
            <p className="preference-note" role="status">{preferencesSaved ? 'Preferences save automatically in this browser.' : 'Browser storage is unavailable. Changes apply for this visit.'}</p>
          </section>
        )}
        <div className="stats-grid">
          <div className="stat"><span className="stat-label">WORDS / MIN</span><div className="stat-value">{wpm} <span>wpm</span></div></div>
          <div className="stat"><span className="stat-label">ACCURACY</span><div className="stat-value">{typed.length ? accuracy : '—'} <span>%</span></div></div>
          <div className="stat time-stat"><span className="stat-label">{mode === 'time' ? 'TIME LEFT' : 'PROGRESS'}</span><div className="stat-value">{mode === 'time' ? remaining : mode === 'words' ? completedWords : typed.length} <span>{mode === 'time' ? 'sec' : mode === 'words' ? `/ ${wordCount}` : `/ ${passage.length}`}</span></div></div>
        </div>

        <div className="typing-area">
          <div className="passage-heading"><span>YOUR NEXT SPRINT</span><span>01 / PRACTICE</span></div>
          <div className={`inline-typing ${isTypingFocused ? 'is-focused' : ''} ${status === 'finished' ? 'is-finished' : ''}`}>
          <div ref={passageRef} className="passage-scroll">
            <p id="typing-passage" className="passage" aria-label={passage}>
              {[...passage].map((character, index) => (
                <span key={index} className={`${index < typed.length ? (character === typed[index] ? 'character-correct' : 'character-incorrect') : ''} ${index === typed.length ? 'character-current' : ''}`}>
                  {character}
                </span>
              ))}
            </p>
          </div>
          <label className="sr-only" htmlFor="typing-input">Type the displayed passage</label>
          <textarea className="inline-input" ref={inputRef} id="typing-input" value={typed} onChange={handleTyping} onKeyDown={handleKeys} onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
            onFocus={() => setIsTypingFocused(true)} onBlur={() => { setIsTypingFocused(false); setCapsLock(false) }}
            onSelect={(event) => {
              const input = event.currentTarget
              if (input.selectionStart !== input.value.length || input.selectionEnd !== input.value.length) {
                input.setSelectionRange(input.value.length, input.value.length)
              }
            }}
            readOnly={status === 'finished'} onPaste={(event) => event.preventDefault()}
            onDrop={(event) => event.preventDefault()} autoCapitalize="off" autoCorrect="off"
            rows={1} spellCheck={false} aria-describedby="typing-note typing-passage" />
          </div>
          {capsLock && <p className="caps-warning" role="status">Caps Lock is on</p>}
          <div className="typing-footer"><span id="typing-note">{status === 'ready' ? (isTypingFocused ? 'Start typing to begin your sprint.' : 'Click or tap the words to start typing.') : status === 'running' ? (mode === 'time' ? 'Keep going! More text appears as you type.' : 'Type the whole passage to finish.') : 'Sprint complete. Ready for another?'}</span>
            <button ref={restartRef} className="restart-button" type="button" onClick={() => restart()}>↻ Restart</button>
          </div>
          {status === 'finished' && (
            <section className="results-card" aria-live="polite" aria-label="Test results">
              <p className="eyebrow">SPRINT COMPLETE</p>
              <h2>One sprint stronger.</h2>
              <p><strong>{wpm} WPM</strong> · {accuracy}% accuracy · {elapsed.toFixed(1)} seconds</p>
              <p>Raw speed: {rawWpm} WPM · Uncorrected errors: {typed.length - correct}</p>
              <p>{correct} correct characters out of {typed.length} currently typed.</p>
              {wpm > 0 && wpm >= best && <p className="best-message">You matched or set your personal best!</p>}
              <button className="again-button" type="button" onClick={() => restart()}>Try another sprint ↗</button>
            </section>
          )}
        </div>
      </section>

      <section className="below-panel" aria-label="Personal best">
        <div className="best-card"><span className="best-icon" aria-hidden="true">♜</span><div><p>YOUR PERSONAL BEST</p><span>{mode === 'time' ? `${duration}-second` : mode === 'words' ? `${wordCount}-word` : 'Quote'} sprint{mode !== 'quote' && punctuation ? ' · punctuation' : ''}{mode !== 'quote' && numbers ? ' · numbers' : ''}</span></div><strong>{best || '—'} <span>wpm</span></strong></div>
        <div className="practice-tip"><span className="tip-line" /><p>Speed follows consistency.<br /><span>Focus on accuracy. The rest will come.</span></p></div>
      </section>
      <footer className="site-footer"><span>BUILT FOR YOUR NEXT BREAKTHROUGH</span><span>Tab then Enter to restart · Esc to leave focus</span></footer>
    </main>
  )
}

export default App
