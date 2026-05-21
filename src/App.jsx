import { useEffect, useState } from 'react'
import './App.css'

function formatNumber(n) {
  if (Number.isNaN(n) || n === Infinity || n === -Infinity) return 'Error'
  if (Number.isInteger(n)) return String(n)
  return String(parseFloat(n.toFixed(8)).toString())
}

function compute(a, op, b) {
  const x = Number(a)
  const y = Number(b)
  if (Number.isNaN(x) || Number.isNaN(y)) return 'Error'
  if (op === '+') return x + y
  if (op === '-') return x - y
  if (op === '×' || op === '*') return x * y
  if (op === '÷' || op === '/') {
    if (y === 0) return 'DivByZero'
    return x / y
  }
  if (op === 'xʸ' || op === '^' || op === '**') return Math.pow(x, y)
  return 'Error'
}

function computeUnary(value, op) {
  const x = Number(value)
  if (Number.isNaN(x)) return 'Error'
  if (op === '√') {
    if (x < 0) return 'Error'
    return Math.sqrt(x)
  }
  if (op === 'x²') return x * x
  if (op === '%') return x / 100
  if (op === '¹/x') {
    if (x === 0) return 'DivByZero'
    return 1 / x
  }
  return 'Error'
}

export default function App() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState(null)
  const [op, setOp] = useState(null)
  const [overwrite, setOverwrite] = useState(false)
  const [memory, setMemory] = useState('')
  const [history, setHistory] = useState([])
  const [memVal, setMemVal] = useState(0)
  const [mrcPressed, setMrcPressed] = useState(0)

  // load history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('calc_history')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setHistory(parsed)
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [])

  // persist history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('calc_history', JSON.stringify(history))
    } catch (e) {}
  }, [history])

  useEffect(() => {
    function onKey(e) {
      if ((e.key >= '0' && e.key <= '9') || e.key === '.') handleDigit(e.key)
      if (['+', '-', '*', '/'].includes(e.key)) handleOperator(e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key)
      if (e.key === '^') handleOperator('xʸ')
      if (e.key === 'Enter') handleEquals()
      if (e.key === 'Backspace') handleBackspace()
      if (e.key === 'c' || e.key === 'C') handleClear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function handleDigit(d) {
    if (overwrite) {
      setDisplay(d === '.' ? '0.' : d)
      setOverwrite(false)
      return
    }
    if (d === '.' && display.includes('.')) return
    setDisplay((prev) => (prev === '0' && d !== '.' ? d : prev + d))
  }

  function handleClear() {
    setDisplay('0')
    setPrev(null)
    setOp(null)
    setMemory('')
    setOverwrite(false)
    setMrcPressed(0)
  }

  function handleBackspace() {
    if (overwrite) { setDisplay('0'); setOverwrite(false); return }
    setDisplay((s) => (s.length <= 1 ? '0' : s.slice(0, -1)))
    setMrcPressed(0)
  }

  function handleToggleSign() {
    setDisplay((s) => (s.startsWith('-') ? s.slice(1) : s === '0' ? s : '-' + s))
  }

  function handleUnary(unaryOp) {
    let res
    if (unaryOp === '%') {
      const current = Number(display)
      if (Number.isNaN(current)) {
        setDisplay('Error')
        setOverwrite(true)
        return
      }
      if (prev !== null && (op === '+' || op === '-')) {
        res = prev * (current / 100)
      } else {
        res = current / 100
      }
    } else {
      res = computeUnary(display, unaryOp)
    }

    if (res === 'DivByZero') {
      setDisplay('❌ Cannot divide by zero!')
      setOverwrite(true)
      return
    }
    const out = formatNumber(res)
    setMemory(`${unaryOp}(${display})`)
    setDisplay(out)
    setOverwrite(true)
    setHistory((h) => [{ expr: `${unaryOp}(${display})`, result: out }, ...h].slice(0, 8))
    setMrcPressed(0)
  }

  function handleOperator(selected) {
    const symbolMap = { '*': '×', '/': '÷', '^': 'xʸ' }
    const symbol = symbolMap[selected] || selected
    const currentValue = parseFloat(display)

    if (prev === null) {
      setPrev(currentValue)
      setOp(symbol)
      setOverwrite(true)
      setMrcPressed(0)
      return
    }

    if (overwrite && op) {
      const res = compute(prev, op, display)
      if (res === 'DivByZero') {
        setDisplay('❌ Cannot divide by zero')
        setPrev(null)
        setOp(null)
        setOverwrite(true)
        return
      }
      setPrev(res)
      setDisplay(formatNumber(res))
      setOp(symbol)
      setOverwrite(true)
      setMrcPressed(0)
      return
    }

    if (overwrite) {
      setOp(symbol)
      return
    }

    if (op) {
      const res = compute(prev, op, display)
      if (res === 'DivByZero') {
        setDisplay('❌ Cannot divide by zero')
        setPrev(null)
        setOp(null)
        setOverwrite(true)
        return
      }
      setPrev(res)
      setDisplay(formatNumber(res))
      setOp(symbol)
      setOverwrite(true)
      setMrcPressed(0)
      return
    }

    setPrev(currentValue)
    setOp(symbol)
    setOverwrite(true)
  }

  function handleEquals() {
    if (op == null || prev == null) return
    const res = compute(prev, op, display)
    if (res === 'DivByZero') {
      setDisplay('❌ Cannot divide by zero!')
      setPrev(null)
      setOp(null)
      setOverwrite(true)
      return
    }
    const out = formatNumber(res)
    const expression = `${prev} ${op} ${display}`
    setMemory(expression)
    setHistory((h) => [{ expr: expression, result: out }, ...h].slice(0, 8))
    setDisplay(out)
    setPrev(null)
    setOp(null)
    setOverwrite(true)
    setMrcPressed(0)
  }

  // Memory functions (TI-108 style)
  function handleMPlus() {
    const val = Number(display)
    if (Number.isNaN(val)) return
    setMemVal((m) => m + val)
    setMrcPressed(0)
  }
  function handleMMinus() {
    const val = Number(display)
    if (Number.isNaN(val)) return
    setMemVal((m) => m - val)
    setMrcPressed(0)
  }
  function handleMRC() {
    if (mrcPressed === 0) {
      // recall
      setDisplay(formatNumber(memVal))
      setOverwrite(true)
      setMrcPressed(1)
    } else {
      // clear memory
      setMemVal(0)
      setMrcPressed(0)
    }
  }

  function deleteHistoryItem(idx) {
    setHistory((h) => h.filter((_, i) => i !== idx))
  }
  function clearHistory() {
    setHistory([])
    try { localStorage.removeItem('calc_history') } catch (e) {}
  }

  const buttons = [
    ['C', '±', '⌫', '÷'],
    ['√', 'x²', '%', '×'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', 'xʸ'],
    ['0', '.',],
  ]

  return (
    <div className="app-root">
      <div className="calculator glass">
        <div className="mem-row">
          <button className="mem-btn" onClick={handleMPlus}>M+</button>
          <button className="mem-btn" onClick={handleMMinus}>M-</button>
          <button className={`mem-btn memrc ${mrcPressed ? 'active' : ''}`} onClick={handleMRC}>MRC</button>
          <div className="mem-indicator">{memVal !== 0 ? 'M' : ''}</div>
        </div>
        <div className="screen">
          <div className="memory">{memory ? memory + ' =' : ''}</div>
          <div className="display" title={display}>{display}</div>
        </div>

        <div className="pad">
          {buttons.map((row, i) => (
            <div key={i} className="row">
              {row.map((b) => {
                const onClick = () => {
                  if (b === 'C') return handleClear()
                  if (b === '⌫') return handleBackspace()
                  if (b === '±') return handleToggleSign()
                  if (['√', 'x²', '%', '¹/x'].includes(b)) return handleUnary(b)
                  if (['+', '-', '×', '÷', 'xʸ'].includes(b)) return handleOperator(b)
                  if (b === '.') return handleDigit('.')
                  handleDigit(b)
                }
                const opClass = ['+', '-', '×', '÷', 'xʸ'].includes(b)
                return (
                  <button key={b} className={`btn ${opClass ? 'op' : ''}`} onClick={onClick}>
                    {b}
                  </button>
                )
              })}
            </div>
          ))}
          <div className="row">
            <button className="btn equals" onClick={handleEquals}>=</button>
          </div>
        </div>
      </div>

      <aside className="history">
        <div className="history-header">
          <h3>History</h3>
          <button className="delete-all" onClick={clearHistory}>Delete all</button>
        </div>
        <ul>
          {history.length === 0 && <li className="muted">No history yet</li>}
          {history.map((h, i) => (
            <li key={i} onClick={() => { setDisplay(h.result); setOverwrite(true); }}>
              <span className="expr">{h.expr}</span>
              <span className="res">{h.result}</span>
              <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteHistoryItem(i); }}>Delete</button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
