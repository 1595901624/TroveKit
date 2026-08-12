import { XMLBuilder, XMLParser } from "fast-xml-parser"
import yaml from "js-yaml"

export type ConverterOperation = "jsonToXml" | "xmlToJson" | "jsonToYaml" | "yamlToJson"

export interface ConverterWorkerRequest {
  id: number
  input: string
  operation: ConverterOperation
}

export interface ConverterWorkerResponse {
  id: number
  output?: string
  error?: string
}

function convert(operation: ConverterOperation, input: string) {
  if (operation === "jsonToXml") {
    const parsed = JSON.parse(input)
    return new XMLBuilder({ format: true, ignoreAttributes: false, suppressEmptyNode: true }).build(parsed)
  }
  if (operation === "xmlToJson") {
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(input)
    return JSON.stringify(parsed, null, 2)
  }
  if (operation === "jsonToYaml") {
    return yaml.dump(JSON.parse(input), { indent: 2, lineWidth: -1, noRefs: true })
  }
  return JSON.stringify(yaml.load(input), null, 2)
}

self.onmessage = (event: MessageEvent<ConverterWorkerRequest>) => {
  const { id, input, operation } = event.data
  try {
    const response: ConverterWorkerResponse = { id, output: convert(operation, input) }
    self.postMessage(response)
  } catch (error) {
    const response: ConverterWorkerResponse = { id, error: error instanceof Error ? error.message : String(error) }
    self.postMessage(response)
  }
}
