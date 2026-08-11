import { useState, useEffect } from "react"
import { Select, SelectItem } from "../../components/ui/base-ui"
import { Database } from "lucide-react"
import { useTranslation } from "react-i18next"
import { format as formatSql } from 'sql-formatter'
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { FormatterWorkbench } from "./FormatterWorkbench"

const STORAGE_KEY = "sql-tool-state"

export function SqlTab() {
  const { t } = useTranslation()

  const [code, setCode] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [dialect, setDialect] = useState("sql")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.code) setCode(state.code)
          if (state.isValid !== undefined) setIsValid(state.isValid)
          if (state.errorMsg) setErrorMsg(state.errorMsg)
          if (state.dialect) setDialect(state.dialect)
        } catch (e) {
          console.error("Failed to parse SqlTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ code, dialect, isValid, errorMsg }))
    }
  }, [code, dialect, isValid, errorMsg, isLoaded])

  // ... later replace clear handler

  const handleFormatEditor = () => {
    if (!code) return
    try {
      const formatted = formatSql(code, { 
        language: dialect as any
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
      formatSql(code, { language: dialect as any })
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  const handleCodeChange = (value: string) => {
    setCode(value)
    setIsValid(null)
    setErrorMsg("")
  }

  const handleClear = () => {
    setCode("")
    setIsValid(null)
    setErrorMsg("")
    removeStoredItem(STORAGE_KEY)
  }

  const handleDialectChange = (value: string) => {
    setDialect(value)
    setIsValid(null)
    setErrorMsg("")
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
    { key: "tsql", label: "T-SQL(SQL Server)" },
    { key: "plsql", label: "PL/SQL" },
    { key: "db2", label: "DB2" },
    { key: "snowflake", label: "Snowflake" },
    { key: "bigquery", label: "BigQuery" },
    { key: "redshift", label: "Redshift" },
    { key: "spark", label: "Spark" },
  ]

  return (
    <FormatterWorkbench
      id="sql"
      label={t("tools.formatter.sql")}
      language="sql"
      code={code}
      onCodeChange={handleCodeChange}
      onFormat={handleFormatEditor}
      onMinify={handleMinifyEditor}
      onValidate={handleValidateEditor}
      onExample={handleLoadExample}
      onClear={handleClear}
      status={isValid}
      errorMessage={errorMsg}
      validMessage={t("tools.formatter.validSql")}
      invalidMessage={t("tools.formatter.invalidSql")}
      toolbarStart={(
        <div className="flex shrink-0 items-center gap-1.5">
          <Database className="h-4 w-4 text-default-400" />
          <span className="whitespace-nowrap text-[11px] font-medium text-default-500">{t("tools.formatter.dialect")}</span>
          <Select
            aria-label={t("tools.formatter.dialect")}
            className="w-36"
            classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }}
            selectedKeys={[dialect]}
            onChange={(event) => handleDialectChange(event.target.value)}
          >
            {dialects.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
          </Select>
        </div>
      )}
    />
  )
}
