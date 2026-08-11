import { Textarea } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"

interface TextTabProps {
  value: string
  onChange: (value: string) => void
}

export function TextTab({ value, onChange }: TextTabProps) {
  const { t } = useTranslation()
  const byteCount = new TextEncoder().encode(value).length

  return (
    <div>
      <Textarea
        label={t("tools.qr.content")}
        placeholder={t("tools.classical.inputPlaceholder")}
        minRows={4}
        variant="bordered"
        value={value}
        onValueChange={onChange}
        classNames={{
          inputWrapper: "bg-background",
          input: "font-mono text-xs"
        }}
        description={`${byteCount} / 2000 bytes`}
      />
    </div>
  )
}
