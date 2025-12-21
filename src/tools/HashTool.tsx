import { Card, CardBody, Button, Textarea } from "@heroui/react"
import { Copy, RefreshCw } from "lucide-react"

export function HashTool() {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm border border-default-200">
        <CardBody className="p-6 gap-4">
          <Textarea 
             label="Input Text" 
             placeholder="Enter text to hash..." 
             minRows={3}
             variant="bordered"
             radius="sm"
             classNames={{
               inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
             }}
          />
          <div className="flex gap-2 justify-end">
             <Button size="sm" variant="flat" startContent={<RefreshCw className="w-4 h-4" />}>Clear</Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["MD5", "SHA-1", "SHA-256", "SHA-512"].map((algo) => (
          <Card key={algo} className="shadow-sm border border-default-200" isHoverable>
            <CardBody className="gap-2">
              <div className="flex justify-between items-center">
                 <span className="text-small font-medium text-default-500">{algo}</span>
                 <Button isIconOnly size="sm" variant="light" radius="full">
                    <Copy className="w-4 h-4 text-default-400" />
                 </Button>
              </div>
              <div className="bg-default-100/50 p-3 rounded-medium font-mono text-xs text-default-600 break-all select-all hover:bg-default-100 transition-colors cursor-text">
                {/* Placeholder hash */}
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
