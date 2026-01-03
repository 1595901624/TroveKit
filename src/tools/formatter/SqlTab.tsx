import { useState, useRef, useEffect } from "react"
import { Button, Card, CardBody, ButtonGroup, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react"
import Editor, { OnMount } from "@monaco-editor/react"
import { Copy, Trash2, CheckCircle2, AlertCircle, Minimize2, Maximize2, BookOpen, Database } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../components/theme-provider"
import { format as formatSql } from 'sql-formatter'

const STORAGE_KEY = "sql-tool-state"

const loadStateFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const saveStateToStorage = (state: Record<string, any>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function SqlTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const savedState = loadStateFromStorage()

  const [code, setCode] = useState(savedState.code || "")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [dialect, setDialect] = useState(savedState.dialect || "sql")

  const editorRef = useRef<any>(null)

  useEffect(() => {
    saveStateToStorage({ code, dialect })
  }, [code, dialect])

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const handleFormatEditor = () => {
    if (!code) return
    try {
      const formatted = formatSql(code, { 
        language: dialect
      })
      setCode(formatted)
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  const handleMinifyEditor = () => {
    if (!code) return
    try {
      // Simple SQL minification using regex for offline usage
      // Remove comments, collapse whitespace, and trim
      let minified = code
        .replace(/--.*$/gm, "") // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
        .replace(/\s+/g, " ") // Collapse whitespace
        .replace(/\s*([=<>!+\-*/(),;])\s*/g, "$1") // Remove space around operators
        .replace(/\s+(AS|FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|SELECT)\s+/gi, " $1 ") // Ensure spaces around keywords
        .trim();
        
      setCode(minified)
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  const handleValidateEditor = () => {
    if (!code) {
      setIsValid(null)
      setErrorMsg("")
      return
    }
    try {
      // Try to format to validate
      formatSql(code, { language: dialect })
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  const copyToClipboard = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
  }

  // --- Example Operation ---
  const handleLoadExample = () => {
    const example = `-- TroveKit Database Example
CREATE TABLE trovekit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT '1.0.0',
    features JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO trovekit (name, version, features) 
VALUES 
('TroveKit', '1.0.0', '["Encoders", "Hash & Crypto", "Classical Ciphers", "QR Generator", "Formatters", "Generators"]');

SELECT 
    id,
    name,
    version,
    features
FROM trovekit
WHERE version LIKE '1.%'
ORDER BY name ASC
LIMIT 10;

UPDATE trovekit 
SET features = JSON_ARRAY_APPEND(features, '$', 'Log Manager')
WHERE name = 'TroveKit';

DELETE FROM trovekit 
WHERE id = 1;`
    setCode(example)
    setIsValid(true)
    setErrorMsg("")
  }

  const dialects = [
    { key: "sql", label: "SQL" },
    { key: "mysql", label: "MySQL" },
    { key: "postgresql", label: "PostgreSQL" },
    { key: "sqlite", label: "SQLite" },
    { key: "mariadb", label: "MariaDB" },
    { key: "tsql", label: "T-SQL" },
    { key: "plsql", label: "PL/SQL" },
    { key: "db2", label: "DB2" },
    { key: "snowflake", label: "Snowflake" },
    { key: "bigquery", label: "BigQuery" },
    { key: "redshift", label: "Redshift" },
    { key: "spark", label: "Spark" },
  ]

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 items-center flex-wrap">
            {/* Dialect Selector */}
            <Dropdown>
              <DropdownTrigger>
                <Button 
                  variant="flat" 
                  startContent={<Database className="w-4 h-4" />}
                  className="min-w-[120px]"
                >
                  {dialects.find(d => d.key === dialect)?.label || "SQL"}
                </Button>
              </DropdownTrigger>
              <DropdownMenu 
                aria-label="SQL Dialects"
                selectionMode="single"
                selectedKeys={[dialect]}
                onSelectionChange={(keys) => setDialect(Array.from(keys)[0] as string)}
              >
                {dialects.map((d) => (
                  <DropdownItem key={d.key}>{d.label}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            <div className="w-px h-6 bg-default-300 mx-2"></div>

            {/* Editor Controls */}
            <ButtonGroup variant="flat">
                <Button
                    color="primary"
                    variant="flat"
                    onPress={handleFormatEditor}
                    startContent={<Maximize2 className="w-4 h-4" />}
                >
                    {t("tools.formatter.format")}
                </Button>
                <Button
                    color="secondary"
                    variant="flat"
                    onPress={handleMinifyEditor}
                    startContent={<Minimize2 className="w-4 h-4" />}
                >
                    {t("tools.formatter.minify")}
                </Button>
                <Button
                    color="success"
                    variant="flat"
                    onPress={handleValidateEditor}
                    startContent={<CheckCircle2 className="w-4 h-4" />}
                >
                    {t("tools.formatter.validate")}
                </Button>
                <Button
                    color="warning"
                    variant="flat"
                    onPress={handleLoadExample}
                    startContent={<BookOpen className="w-4 h-4" />}
                >
                    {t("tools.formatter.example")}
                </Button>
            </ButtonGroup>
        </div>
        
        <div className="flex gap-2">
          <Button isIconOnly variant="light" onPress={copyToClipboard} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setCode(""); setIsValid(null); setErrorMsg(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-default-200 rounded-xl overflow-hidden shadow-sm relative group bg-content1 flex flex-row">
        <div className="w-full h-full">
            <Editor
            height="100%"
            defaultLanguage="sql"
            value={code}
            onChange={(value) => setCode(value || "")}
            onMount={handleEditorDidMount}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                formatOnPaste: true,
                formatOnType: true,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
            }}
            />
        </div>
      </div>

      {isValid === false && (
        <Card className="border-danger bg-danger-50 dark:bg-danger-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-danger font-medium text-xs">
              {t("tools.formatter.invalidSql")}: {errorMsg}
            </p>
          </CardBody>
        </Card>
      )}

      {isValid === true && (
        <Card className="border-success bg-success-50 dark:bg-success-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-success font-medium text-xs">
              {t("tools.formatter.validSql")}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
