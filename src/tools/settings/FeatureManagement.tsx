import { useState, useMemo } from "react"
import { Input, Switch } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"
import { Search } from "lucide-react"
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
  // const toggleFavorite = (id: string) => {
  //   const current = getPreference(id)
  //   updatePreference(id, { isFavorite: !current.isFavorite })
  // }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-default-200 bg-default-50/55 px-5 py-3">
        <Input
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="h-4 w-4 text-default-400" />}
          size="sm"
          classNames={{ inputWrapper: "bg-background" }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {Object.entries(groupedFeatures).map(([category, group]) => {
            const topLevelPref = group.topLevel ? getPreference(group.topLevel.id) : null;
            return (
            <section key={category} className="overflow-hidden rounded-xl border border-default-200 bg-background">
              <div className="flex min-h-11 items-center justify-between gap-3 border-b border-default-200 bg-default-50/45 px-3.5 py-2">
                <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                {group.topLevel && (
                  <Switch
                    size="sm"
                    isSelected={Boolean(topLevelPref?.visible)}
                    onValueChange={() => toggleVisibility(group.topLevel!.id)}
                  >
                    {topLevelPref?.visible ? t("settings.visible") : t("settings.hidden")}
                  </Switch>
                )}
              </div>
              <div className="grid grid-cols-1 divide-y divide-default-200 sm:grid-cols-2 sm:divide-y-0">
                {group.items.map(item => {
                  const pref = getPreference(item.id)
                  return (
                    <div 
                      key={item.id} 
                      className="flex min-h-12 items-center justify-between gap-3 border-default-200 px-3.5 py-2.5 odd:sm:border-r"
                    >
                      <span className="min-w-0 truncate text-sm text-foreground" title={item.label}>
                        {item.label}
                      </span>
                      <Switch size="sm" isSelected={pref.visible} onValueChange={() => toggleVisibility(item.id)} aria-label={`${item.label}: ${t("settings.toggleVisibility")}`}>
                        <span className="hidden text-[11px] sm:inline">{pref.visible ? t("settings.visible") : t("settings.hidden")}</span>
                      </Switch>
                    </div>
                  )
                })}
              </div>
            </section>
            )
          })}
          {Object.keys(groupedFeatures).length === 0 && (
            <div className="py-12 text-center text-sm text-default-400">
              {t("common.noResults")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
