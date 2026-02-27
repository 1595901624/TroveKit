import { useState, useMemo } from "react"
import { Card, CardBody, CardHeader, Input, Button } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { Search, Star, Eye, EyeOff } from "lucide-react"
import { useFeatures } from "../../hooks/useFeatures"
import { useFeaturePreferences } from "../../contexts/FeaturePreferencesContext"

export function FeatureManagement() {
  const { t } = useTranslation()
  const features = useFeatures()
  const { updatePreference, getPreference } = useFeaturePreferences()
  const [searchQuery, setSearchQuery] = useState("")

  // 过滤出算法功能（排除主工具如设置、日志等）
  const algorithmFeatures = useMemo(() => {
    return features.filter(f => f.tabId)
  }, [features])

  // 按分类分组
  const groupedFeatures = useMemo(() => {
    const groups: Record<string, typeof algorithmFeatures> = {}
    
    const filtered = algorithmFeatures.filter(f => 
      f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.forEach(f => {
      if (!groups[f.category]) {
        groups[f.category] = []
      }
      groups[f.category].push(f)
    })
    return groups
  }, [algorithmFeatures, searchQuery])

  const toggleVisibility = (id: string) => {
    const current = getPreference(id)
    updatePreference(id, { visible: !current.visible })
  }

  const toggleFavorite = (id: string) => {
    const current = getPreference(id)
    updatePreference(id, { isFavorite: !current.isFavorite })
  }

  return (
    <Card className="shadow-sm border border-default-200 mt-6">
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
        <div className="flex justify-between w-full items-center">
          <div>
            <h2 className="text-lg font-bold">{t("settings.featureManagement", "功能管理")}</h2>
            <p className="text-default-500 text-small mt-1">
              {t("settings.featureManagementDesc", "管理算法的显示/隐藏及常用状态")}
            </p>
          </div>
        </div>
        <div className="w-full mt-4">
          <Input
            placeholder={t("common.search", "搜索...")}
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Search className="w-4 h-4 text-default-400" />}
            size="sm"
            variant="faded"
          />
        </div>
      </CardHeader>
      <CardBody className="px-6 py-6">
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
          {Object.entries(groupedFeatures).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-default-500 sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-10">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(item => {
                  const pref = getPreference(item.id)
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-default-100 bg-default-50/50 hover:bg-default-100/50 transition-colors"
                    >
                      <span className="text-sm font-medium truncate mr-2" title={item.label}>
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color={pref.isFavorite ? "warning" : "default"}
                          onPress={() => toggleFavorite(item.id)}
                          title={t("settings.toggleFavorite", "切换常用")}
                        >
                          <Star className={`w-4 h-4 ${pref.isFavorite ? "fill-current" : ""}`} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color={pref.visible ? "primary" : "default"}
                          onPress={() => toggleVisibility(item.id)}
                          title={t("settings.toggleVisibility", "切换显示/隐藏")}
                        >
                          {pref.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {Object.keys(groupedFeatures).length === 0 && (
            <div className="text-center text-default-400 py-8">
              {t("common.noResults", "没有找到匹配的功能")}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
