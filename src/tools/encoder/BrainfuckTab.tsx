import { useState, useEffect } from "react"
import { Textarea, Button } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

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
  const tokens = input.match(/Ook[.!?]/g)
  if (!tokens) return ""
  if (tokens.length % 2 !== 0) throw new Error("Invalid Ook sequence")
  let bf = ""
  for (let i = 0; i < tokens.length; i += 2) {
    const pair = tokens[i] + " " + tokens[i + 1]
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

export function BrainfuckTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [bfInput, setBfInput] = useState("")
  const [bfOutput, setBfOutput] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.bfInput) setBfInput(state.bfInput)
          if (state.bfOutput) setBfOutput(state.bfOutput)
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
      setStoredItem(STORAGE_KEY, JSON.stringify({ bfInput, bfOutput }))
    }
  }, [bfInput, bfOutput, isLoaded])

  const handleEncodeBrainfuck = () => {
    if (!bfInput) return
    try {
      const result = bfEncodePlain(bfInput)
      setBfOutput(result)
      addLog({ method: "Brainfuck Encode", input: bfInput, output: result }, "success")
    } catch (e) {
      addLog({ method: "Brainfuck Encode", input: bfInput, output: (e as Error).message }, "error")
    }
  }

  const handleDecodeBrainfuck = () => {
    if (!bfInput) return
    try {
      // Detect Ook
      let code = bfInput.trim()
      if (/Ook[.!?]/.test(code)) {
        code = ookToBrainfuck(code)
      }
      const result = bfInterpret(code)
      setBfOutput(result)
      addLog({ method: "Brainfuck Decode", input: bfInput, output: result }, "success")
    } catch (e) {
      addLog({ method: "Brainfuck Decode", input: bfInput, output: (e as Error).message }, "error")
    }
  }

  const handleEncodeOok = () => {
    if (!bfInput) return
    try {
      const bf = bfEncodePlain(bfInput)
      const result = brainfuckToOok(bf)
      setBfOutput(result)
      addLog({ method: "Ook Encode", input: bfInput, output: result }, "success")
    } catch (e) {
      addLog({ method: "Ook Encode", input: bfInput, output: (e as Error).message }, "error")
    }
  }

  const handleDecodeOok = () => {
    if (!bfInput) return
    try {
      const bf = ookToBrainfuck(bfInput)
      const result = bfInterpret(bf)
      setBfOutput(result)
      addLog({ method: "Ook Decode", input: bfInput, output: result }, "success")
    } catch (e) {
      addLog({ method: "Ook Decode", input: bfInput, output: (e as Error).message }, "error")
    }
  }

  const swap = () => {
    setBfInput(bfOutput)
    setBfOutput(bfInput)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.encoder.input")}
        placeholder={t("tools.encoder.base64Placeholder")}
        minRows={6}
        variant="bordered"
        value={bfInput}
        onValueChange={setBfInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex items-center justify-center gap-4 py-2">
        <Button color="primary" variant="flat" onPress={handleEncodeBrainfuck} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.encode")} (BF)
        </Button>
        <Button color="secondary" variant="flat" onPress={handleDecodeBrainfuck} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.decode")} (BF)
        </Button>
        <Button color="primary" variant="flat" onPress={handleEncodeOok} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.encode")} (Ook)
        </Button>
        <Button color="secondary" variant="flat" onPress={handleDecodeOok} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.decode")} (Ook)
        </Button>

        <Button isIconOnly variant="light" onPress={swap} title={t("tools.encoder.swap")}>
          <ArrowDownUp className="w-4 h-4" />
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={() => { setBfInput(""); setBfOutput(""); removeStoredItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.encoder.output")}
          readOnly
          minRows={6}
          variant="bordered"
          value={bfOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(bfOutput)} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
