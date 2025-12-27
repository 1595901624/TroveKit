import { Textarea } from "@heroui/react"
import { useTranslation } from "react-i18next"

interface TextTabProps {
  value: string
  onChange: (value: string) => void
}

export function TextTab({ value, onChange }: TextTabProps) {
  const { t } = useTranslation()
  const byteCount = new TextEncoder().encode(value).length

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.qr.content")}
        placeholder={t("tools.classical.inputPlaceholder")}
        minRows={4}
        variant="bordered"
        value={value}
        onValueChange={onChange}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
        description={`${byteCount} / 2000 bytes`}
      />
    </div>
  )
}
