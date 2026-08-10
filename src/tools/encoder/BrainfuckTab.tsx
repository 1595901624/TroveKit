import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { EncoderWorkbench } from "./EncoderWorkbench"

const STORAGE_KEY = "brainfuck-tool-state"

const OOK_TO_BF: Record<string, string> = {
  "Ook. Ook?": ">",
  "Ook? Ook.": "<",
  "Ook. Ook.": "+",
  "Ook! Ook!": "-",
  "Ook! Ook.": ".",
  "Ook. Ook!": ",",
  "Ook! Ook?": "[",
  "Ook? Ook!": "]",
}

const BF_TO_OOK: Record<string, string> = Object.fromEntries(
  Object.entries(OOK_TO_BF).map(([k, v]) => [v, k])
)

function generateDeltaCode(signedDiff: number) {
  const sign = signedDiff >= 0 ? 1 : -1
  const d = Math.abs(signedDiff)
  if (d === 0) return ""
  // small changes: do direct repeats
  if (d <= 12) return (sign > 0 ? "+" : "-").repeat(d)

  // try loop-based schemes and pick the shortest generated code
  let best = (sign > 0 ? "+" : "-").repeat(d)

  for (let k = 2; k <= 20; k++) {
    const q = Math.floor(d / k)
    const r = d - q * k
    if (q <= 0) continue

    // Build pattern that uses two temp cells (cell+1 and cell+2):
    // >[-] +++... (q) >[-] < [> +++... (k) < -] > +++... (r) [<< (+|-) >> -] <<
    // Final copy loop uses + to add or - to subtract depending on sign
    const addK = "+".repeat(k)
    const addR = "+".repeat(r)
    const copyOp = sign > 0 ? "+" : "-"

    const code = 
      ">[-]" +            // clear cell+1
      "+".repeat(q) +    // set cell+1 = q
      ">[-]" +            // clear cell+2
      "<" +               // back to cell+1
      "[>" + addK + "<-]" + // loop: add k to cell+2 q times
      ">" + addR +        // add remainder to cell+2
      "[<<" + copyOp + ">>-]" + // move cell+2 value to cell (add or sub)
      "<<"                // return to original cell

    if (code.length < best.length) best = code
  }

  return best
}

function bfEncodePlain(text: string) {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  let cur = 0
  let out = ""
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    const signed = ((b - cur + 128) % 256) - 128
    if (Math.abs(signed) <= 12) {
      if (signed > 0) out += "+".repeat(signed)
      else if (signed < 0) out += "-".repeat(-signed)
    } else {
      out += generateDeltaCode(signed)
    }
    out += "."
    cur = b
  }
  return out
}

function bfInterpret(code: string, maxSteps = 5_000_000) {
  const commands = Array.from(code).filter((c) => "><+-.,[]".includes(c))
  const codeStr = commands.join("")
  const loopMap = new Map<number, number>()
  const stack: number[] = []
  for (let i = 0; i < codeStr.length; i++) {
    const c = codeStr[i]
    if (c === "[") stack.push(i)
    else if (c === "]") {
      const start = stack.pop()
      if (start === undefined) throw new Error("Unmatched ']'")
      loopMap.set(start, i)
      loopMap.set(i, start)
    }
  }
  if (stack.length) throw new Error("Unmatched '['")

  const tape = new Uint8Array(30000)
  let ptr = 0
  let pc = 0
  let steps = 0
  const outBytes: number[] = []

  while (pc < codeStr.length) {
    if (steps++ > maxSteps) throw new Error("Execution step limit exceeded")
    const cmd = codeStr[pc]
    switch (cmd) {
      case ">":
        ptr++
        if (ptr >= tape.length) throw new Error("Pointer out of bounds")
        break
      case "<":
        ptr--
        if (ptr < 0) throw new Error("Pointer out of bounds")
        break
      case "+":
        tape[ptr] = (tape[ptr] + 1) & 0xff
        break
      case "-":
        tape[ptr] = (tape[ptr] - 1) & 0xff
        break
      case ".":
        outBytes.push(tape[ptr])
        break
      case ",":
        // No stdin support — treat as zero
        tape[ptr] = 0
        break
      case "[":
        if (tape[ptr] === 0) pc = loopMap.get(pc) ?? pc
        break
      case "]":
        if (tape[ptr] !== 0) pc = loopMap.get(pc) ?? pc
        break
    }
    pc++
  }

  try {
    const decoder = new TextDecoder()
    return decoder.decode(new Uint8Array(outBytes))
  } catch (e) {
    // Fallback: construct string assuming Latin1 mapping
    let s = ""
    for (let i = 0; i < outBytes.length; i++) s += String.fromCharCode(outBytes[i])
    return s
  }
}

function ookToBrainfuck(input: string) {
  const tokens = input.match(/Ook[.!?]/gi)
  if (!tokens) return ""
  if (tokens.length % 2 !== 0) throw new Error("Invalid Ook sequence")
  let bf = ""
  for (let i = 0; i < tokens.length; i += 2) {
    const normalize = (t: string) => "Ook" + t.slice(3)
    const pair = normalize(tokens[i]) + " " + normalize(tokens[i + 1])
    const cmd = OOK_TO_BF[pair]
    if (!cmd) throw new Error(`Invalid Ook pair: ${pair}`)
    bf += cmd
  }
  return bf
}

function brainfuckToOok(bfCode: string) {
  return Array.from(bfCode)
    .filter((c) => "><+-.,[]".includes(c))
    .map((c) => BF_TO_OOK[c])
    .join(" ")
}

type BrainfuckMode = "bf-encode" | "bf-decode" | "ook-encode" | "ook-decode"

function transformBrainfuck(value: string, mode: BrainfuckMode) {
  switch (mode) {
    case "bf-encode":
      return bfEncodePlain(value)
    case "bf-decode": {
      const trimmed = value.trim()
      return bfInterpret(/Ook[.!?]/i.test(trimmed) ? ookToBrainfuck(trimmed) : trimmed)
    }
    case "ook-encode":
      return brainfuckToOok(bfEncodePlain(value))
    case "ook-decode":
      return bfInterpret(ookToBrainfuck(value))
  }
}

const LOG_METHODS: Record<BrainfuckMode, string> = {
  "bf-encode": "Brainfuck Encode",
  "bf-decode": "Brainfuck Decode",
  "ook-encode": "Ook Encode",
  "ook-decode": "Ook Decode",
}

export function BrainfuckTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  const [bfInput, setBfInput] = useState("")
  const [bfOutput, setBfOutput] = useState("")
  const [activeMode, setActiveMode] = useState<BrainfuckMode>("bf-encode")
  const [autoTransform, setAutoTransform] = useState(false)
  const [transformError, setTransformError] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const latestAutoResult = useRef({ activeMode, autoTransform, transformError, bfInput, bfOutput })
  const addLogRef = useRef(addLog)

  addLogRef.current = addLog
  latestAutoResult.current = { activeMode, autoTransform, transformError, bfInput, bfOutput }

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.bfInput) setBfInput(state.bfInput)
          if (state.bfOutput) setBfOutput(state.bfOutput)
          if (["bf-encode", "bf-decode", "ook-encode", "ook-decode"].includes(state.activeMode)) {
            setActiveMode(state.activeMode)
          }
          if (typeof state.autoTransform === "boolean") setAutoTransform(state.autoTransform)
        } catch (e) {
          console.error("Failed to parse BrainfuckTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ bfInput, bfOutput, activeMode, autoTransform }))
    }
  }, [activeMode, autoTransform, bfInput, bfOutput, isLoaded])

  useEffect(() => {
    if (!isLoaded || !autoTransform) return
    if (!bfInput) {
      setBfOutput("")
      setTransformError("")
      return
    }

    const timer = window.setTimeout(() => {
      try {
        setBfOutput(transformBrainfuck(bfInput, activeMode))
        setTransformError("")
      } catch (e) {
        setBfOutput("")
        setTransformError((e as Error).message)
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [activeMode, autoTransform, bfInput, isLoaded])

  useEffect(() => () => {
    const state = latestAutoResult.current
    if (!state.autoTransform || !state.bfInput || !state.bfOutput || state.transformError) return
    addLogRef.current({ method: LOG_METHODS[state.activeMode], input: state.bfInput, output: state.bfOutput }, "success")
  }, [])

  const runTransform = (writeLog: boolean) => {
    if (!bfInput) return
    const method = LOG_METHODS[activeMode]
    try {
      const result = transformBrainfuck(bfInput, activeMode)
      setBfOutput(result)
      setTransformError("")
      if (writeLog) addLog({ method, input: bfInput, output: result }, "success")
    } catch (e) {
      const message = (e as Error).message
      setTransformError(message)
      if (writeLog) addLog({ method, input: bfInput, output: message }, "error")
    }
  }

  const swap = () => {
    setBfInput(bfOutput)
    setBfOutput(bfInput)
    if (autoTransform) {
      const inverseMode: Record<BrainfuckMode, BrainfuckMode> = {
        "bf-encode": "bf-decode",
        "bf-decode": "bf-encode",
        "ook-encode": "ook-decode",
        "ook-decode": "ook-encode",
      }
      setActiveMode(inverseMode[activeMode])
    }
    setTransformError("")
  }

  const clearAll = () => {
    setBfInput("")
    setBfOutput("")
    setTransformError("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <EncoderWorkbench
      id="brainfuck"
      modes={[
        { key: "bf-encode", label: `${t("tools.encoder.encode")} BF` },
        { key: "bf-decode", label: `${t("tools.encoder.decode")} BF` },
        { key: "ook-encode", label: `${t("tools.encoder.encode")} Ook` },
        { key: "ook-decode", label: `${t("tools.encoder.decode")} Ook` },
      ]}
      activeMode={activeMode}
      onModeChange={setActiveMode}
      autoTransform={autoTransform}
      onAutoTransformChange={setAutoTransform}
      onTransform={() => runTransform(!autoTransform)}
      onSwap={swap}
      onClear={clearAll}
      input={bfInput}
      onInputChange={setBfInput}
      inputPlaceholder={t("tools.encoder.brainfuckPlaceholder")}
      output={bfOutput}
      error={transformError}
    />
  )
}
