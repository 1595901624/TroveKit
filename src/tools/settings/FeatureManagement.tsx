import { useState, useMemo } from "react"
import { Input, Button } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { Search, Star, Eye, EyeOff } from "lucide-react"
import { useFeatures } from "../../hooks/useFeatures"
import { useFeaturePreferences } from "../../contexts/FeaturePreferencesContext"

export function FeatureManagement() {
  const { t } = useTranslation()
  // 全部功能定义（来自 hooks）
  const features = useFeatures()
  // 读取/更新用户的功能偏好（显示、常用）
  const { updatePreference, getPreference } = useFeaturePreferences()
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState("")

  // 二级功能：一般是具体算法项（有 tabId）
  const algorithmFeatures = useMemo(() => {
    return features.filter(f => f.tabId)
  }, [features])

  // 一级功能：分类入口（排除首页、设置、日志）
  const topLevelFeatures = useMemo(() => {
    return features.filter(f => !f.tabId && !['home', 'settings', 'logManagement'].includes(f.toolId))
  }, [features])

  // 按分类分组，并应用搜索过滤
  const groupedFeatures = useMemo(() => {
    const groups: Record<string, { topLevel?: typeof features[0], items: typeof algorithmFeatures }> = {}
    
    // 先按关键词过滤算法项（匹配名称或分类）
    const filteredAlgorithms = algorithmFeatures.filter(f => 
      f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // 把算法项放进对应分类
    filteredAlgorithms.forEach(f => {
      if (!groups[f.category]) {
        groups[f.category] = { items: [] }
      }
      groups[f.category].items.push(f)
    })

    // 关联一级功能；若分类下暂无算法项但一级功能命中搜索，也显示该分类
    topLevelFeatures.forEach(f => {
      if (groups[f.category]) {
        groups[f.category].topLevel = f
      } else if (f.label.toLowerCase().includes(searchQuery.toLowerCase()) || f.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        groups[f.category] = { topLevel: f, items: [] }
      }
    })

    return groups
  }, [algorithmFeatures, topLevelFeatures, searchQuery])

  // 切换功能显示/隐藏
  const toggleVisibility = (id: string) => {
    const current = getPreference(id)
    updatePreference(id, { visible: !current.visible })
  }

  // 切换是否加入常用
  const toggleFavorite = (id: string) => {
    const current = getPreference(id)
    updatePreference(id, { isFavorite: !current.isFavorite })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部搜索框 */}
      <div className="px-6 py-4 border-b border-default-200 shrink-0">
        <Input
          placeholder={t("common.search", "搜索...")}
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="w-4 h-4 text-default-400" />}
          size="sm"
          variant="faded"
        />
      </div>
      {/* 分类列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {Object.entries(groupedFeatures).map(([category, group]) => {
            const topLevelPref = group.topLevel ? getPreference(group.topLevel.id) : null;
            return (
            <div key={category} className="space-y-3">
              {/* 分类标题 + 一级功能显示开关 */}
              <div className="flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-10">
                <h3 className="text-sm font-semibold text-default-500">
                  {category}
                </h3>
                {group.topLevel && (
                  <Button
                    size="sm"
                    variant="flat"
                    color={topLevelPref?.visible ? "primary" : "default"}
                    onPress={() => toggleVisibility(group.topLevel!.id)}
                    startContent={topLevelPref?.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  >
                    {topLevelPref?.visible ? t("settings.visible", "显示") : t("settings.hidden", "隐藏")}
                  </Button>
                )}
              </div>
              {/* 该分类下的具体功能卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.items.map(item => {
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
                          title={t("settings.toggleFavorite")}
                        >
                          {/* 常用开关 */}
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
                          {/* 显示/隐藏开关 */}
                          {pref.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            )
          })}
          {/* 没有搜索结果时的提示 */}
          {Object.keys(groupedFeatures).length === 0 && (
            <div className="text-center text-default-400 py-8">
              {t("common.noResults", "没有找到匹配的功能")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
