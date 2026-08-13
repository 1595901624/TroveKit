import { lazy, Suspense, useRef, useState } from "react"
import { Layout } from "./components/Layout"
import { ThemeProvider } from "./components/theme-provider"
import { ToolId } from "./components/Sidebar"
import { Card, CardBody } from "./components/ui/base-ui"
import { Lock, Code2, FileCode2, Shield, Wand2, ArrowRightLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { WorkspaceLoadingSkeleton } from "./components/LoadingSkeleton"

// 工具页使用懒加载，避免首页启动时一次性加载所有工具及其重依赖。
const HashTool = lazy(() => import("./tools/HashTool").then(module => ({ default: module.HashTool })))
const EncoderTool = lazy(() => import("./tools/EncoderTool").then(module => ({ default: module.EncoderTool })))
const ClassicalTool = lazy(() => import("./tools/ClassicalTool").then(module => ({ default: module.ClassicalTool })))
const GeneratorTool = lazy(() => import("./tools/GeneratorTool").then(module => ({ default: module.GeneratorTool })))
const Settings = lazy(() => import("./tools/Settings").then(module => ({ default: module.Settings })))
const FormatterTool = lazy(() => import("./tools/FormatterTool").then(module => ({ default: module.FormatterTool })))
const ConverterTool = lazy(() => import("./tools/ConverterTool").then(module => ({ default: module.ConverterTool })))
const OthersTool = lazy(() => import("./tools/OthersTool").then(module => ({ default: module.OthersTool })))
const LogManagementTool = lazy(() => import("./tools/LogManagementTool").then(module => ({ default: module.LogManagementTool })))

/**
 * 主应用组件
 * 整个应用程序的根组件，负责管理全局状态和渲染主布局
 * 
 * 状态管理:
 * - activeTool: 当前选中的工具/页面
 * - activeTab: 当前工具的活跃标签页
 * 
 * 功能:
 * - 使用 ThemeProvider 提供主题支持
 * - 使用 useTranslation 进行国际化
 * - 维护用户访问历史以优化性能
 */
function App() {
  // 当前选中的工具ID，默认为首页
  const [activeTool, setActiveTool] = useState<ToolId>("home")
  // 当前工具的活跃标签页（可选）
  const [activeTab, setActiveTab] = useState<string | undefined>()
  const settingsReturnLocation = useRef<{ toolId: ToolId; tabId?: string } | null>(null)
  // 翻译函数，用于获取国际化文本
  const { t } = useTranslation()
  const features = useFeatures()
  const { getPreference } = useFeaturePreferences()

  const resolveTab = (toolId: ToolId, tabId?: string) => {
    if (tabId) return tabId
    return features.find(feature => feature.toolId === toolId && feature.tabId && getPreference(feature.id).visible)?.tabId
  }

  /**
   * 处理工具切换
   * 当用户从侧边栏选择不同工具时调用
   * @param id - 要切换到的工具ID
   */
  const handleToolChange = (id: ToolId) => {
    if (id === "settings" && activeTool !== "settings") {
      settingsReturnLocation.current = { toolId: activeTool, tabId: activeTab }
    }
    setActiveTool(id)
    setActiveTab(resolveTab(id))
  }

  /**
   * 处理导航操作
   * 支持导航到指定工具的特定标签页
   * @param toolId - 目标工具ID
   * @param tabId - 可选的目标标签页ID
   */
  const handleNavigate = (toolId: ToolId, tabId?: string) => {
    if (toolId === "settings" && activeTool !== "settings") {
      settingsReturnLocation.current = { toolId: activeTool, tabId: activeTab }
    }
    setActiveTool(toolId)
    setActiveTab(resolveTab(toolId, tabId))
  }

  const handleSettingsBack = () => {
    const previous = settingsReturnLocation.current ?? { toolId: "home" as ToolId, tabId: undefined }
    settingsReturnLocation.current = null
    setActiveTool(previous.toolId)
    setActiveTab(previous.tabId)
  }

  /**
   * 获取当前工具的标题
   * 根据当前活跃的工具ID返回对应的国际化标题
   * @returns 当前页面显示的标题文本
   */
  const getTitle = () => {
    const activeFeature = features.find(feature => feature.toolId === activeTool && feature.tabId === activeTab)
    if (activeFeature) return activeFeature.label
    switch (activeTool) {
      case "home": return t("home.title")
      case "crypto": return t("nav.crypto")
      case "encoder": return t("nav.encoder")
      case "classical": return t("nav.classical")
      case "formatters": return t("nav.formatters")
      case "generators": return t("nav.generators")
      case "converter": return t("nav.converter")
      case "others": return t("nav.others")
      case "logManagement": return t("nav.logManagement")
      case "settings": return t("settings.title")
      default: return "TroveKit"
    }
  }

  /**
   * 只渲染当前工具页。
   * 工具内部的编辑状态由各自的持久化逻辑恢复，避免切换工具后旧页面仍常驻内存。
   */
  const renderActiveTool = () => {
    switch (activeTool) {
      case "crypto":
        return <HashTool activeTab={activeTab} isVisible />
      case "encoder":
        return <EncoderTool activeTab={activeTab} isVisible />
      case "classical":
        return <ClassicalTool activeTab={activeTab} isVisible />
      case "formatters":
        return <FormatterTool activeTab={activeTab} isVisible />
      case "generators":
        return <GeneratorTool activeTab={activeTab} isVisible />
      case "converter":
        return <ConverterTool activeTab={activeTab} isVisible />
      case "others":
        return <OthersTool activeTab={activeTab} isVisible />
      case "logManagement":
        return <LogManagementTool />
      case "settings":
        return <Settings />
      case "home":
      default:
        return <HomeView onNavigate={handleNavigate} />
    }
  }

  return (
    <ThemeProvider storageKey="trovekit-theme">
      <Layout
        activeTool={activeTool}
        activeTab={activeTab}
        onToolChange={handleToolChange}
        onNavigate={handleNavigate}
        title={getTitle()}
        onBack={activeTool === "settings" ? handleSettingsBack : undefined}
      >
        <div className="h-full">
          {/* 工具 chunk 加载期间显示稳定的工作区骨架，避免空白闪烁和布局跳动。 */}
          <Suspense fallback={<WorkspaceLoadingSkeleton />}>
            {renderActiveTool()}
          </Suspense>
        </div>
      </Layout>
    </ThemeProvider>
  )
}

import { useFeaturePreferences } from "./contexts/FeaturePreferencesContext"
import { useFeatures } from "./hooks/useFeatures"

/**
 * 首页视图组件
 * 应用的欢迎页面，展示所有可用工具的卡片和常用功能
 * 
 * Props:
 * - onNavigate: 导航回调函数，用于跳转到指定工具
 * 
 * 功能:
 * - 显示工具分类卡片（加密、编码器、转换器等）
 * - 显示用户收藏的常用功能
 * - 根据用户偏好过滤显示的工具
 */
function HomeView({ onNavigate }: { onNavigate: (toolId: ToolId, tabId?: string) => void }) {
  // 翻译函数
  const { t } = useTranslation()
  // 用户功能偏好设置
  const { preferences, getPreference } = useFeaturePreferences()
  // 所有可用功能列表
  const features = useFeatures()

  /**
   * 获取用户收藏的功能列表
   * 过滤条件：
   * 1. 功能必须有 tabId（子功能）
   * 2. 功能必须被设置为收藏
   * 3. 功能必须可见
   */
  const favoriteFeatures = features.filter(f => f.tabId && preferences[f.id]?.isFavorite && preferences[f.id]?.visible !== false)

  /**
   * 工具卡片配置数组
   * 定义首页显示的各个工具分类卡片
   * 包含：ID、标题、描述、图标、渐变背景、图标颜色
   */
  const tools = [
    {
      id: "crypto",
      title: t("home.cards.crypto.title"),
      desc: t("home.cards.crypto.desc"),
      icon: <Lock className="w-6 h-6" />,
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      id: "classical",
      title: t("home.cards.classical.title"),
      desc: t("home.cards.classical.desc"),
      icon: <Shield className="w-6 h-6" />,
      gradient: "from-orange-500/20 to-red-500/20",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    {
      id: "generators",
      title: t("nav.generators"),
      desc: t("home.cards.qr.desc"),
      icon: <Wand2 className="w-6 h-6" />,
      gradient: "from-amber-500/20 to-yellow-500/20",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
      id: "encoder",
      title: t("home.cards.encoder.title"),
      desc: t("home.cards.encoder.desc"),
      icon: <Code2 className="w-6 h-6" />,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      id: "formatters",
      title: t("home.cards.formatters.title"),
      desc: t("home.cards.formatters.desc"),
      icon: <FileCode2 className="w-6 h-6" />,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      id: "converter",
      title: t("nav.converter", "转换器"),
      desc: t("tools.converter.jsonXml"),
      icon: <ArrowRightLeft className="w-6 h-6" />,
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-600 dark:text-cyan-400"
    },
    /**
     * 过滤工具卡片
     * 根据用户偏好设置隐藏或显示某些工具
     * 检查逻辑：
     * 1. 检查顶级功能是否可见
     * 2. 检查该工具下的所有子功能是否都隐藏
     */
  ].filter(tool => {
    const topLevelFeature = features.find(f => f.toolId === tool.id && !f.tabId);
    if (topLevelFeature) {
      const pref = getPreference(topLevelFeature.id);
      if (!pref.visible) return false;
    }

    const subItems = features.filter(f => f.toolId === tool.id && f.tabId);
    if (subItems.length > 0) {
      const allHidden = subItems.every(f => !getPreference(f.id).visible);
      if (allHidden) return false;
    }

    return true;
  })

  /**
   * 首页视图渲染
   * 包含三个主要部分：
   * 1. 欢迎标题区域 - 显示应用名称和副标题
   * 2. 工具卡片网格 - 展示所有可用工具分类
   * 3. 常用功能区域 - 显示用户收藏的功能（如果有）
   */
  return (
    <div className="animate-in space-y-10 py-5 fade-in duration-300">
      {/* 欢迎标题区域 */}
      <div className="max-w-2xl space-y-2">
        <h2 className="text-[30px] font-semibold tracking-[-0.035em]">
          <span>{t("home.welcome")}</span>
        </h2>
        <p className="text-[15px] leading-relaxed text-default-500">
          {t("home.subtitle")}
        </p>
      </div>

      {/* 工具卡片网格区域 - 使用响应式布局 */}
      <div className="home-tool-grid grid grid-cols-1 gap-3">
        {tools.map((item) => (
          <Card
            key={item.id}
            isPressable
            onPress={() => onNavigate(item.id as ToolId)}
            className="group border border-default-200/80 bg-default-50/60 transition-colors duration-150 hover:bg-default-100/80"
            shadow="none"
          >
            <CardBody className="space-y-4 p-5">
              {/* 工具图标带渐变背景 */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-default-200 bg-background text-default-600 shadow-sm">
                <div>
                  {item.icon}
                </div>
              </div>
              {/* 工具标题和描述 */}
              <div className="space-y-2">
                <h3 className="text-[15px] font-semibold tracking-tight">{item.title}</h3>
                <p className="line-clamp-2 text-[13px] leading-relaxed text-default-500">{item.desc}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* 常用功能区域 - 仅在有收藏功能时显示 */}
      {favoriteFeatures.length > 0 && (
        <div className="space-y-4 border-t border-default-200/70 pt-7">
          <h3 className="text-[17px] font-semibold tracking-tight">{t("home.frequentlyUsed", "常用功能")}</h3>
          <div className="home-favorite-grid grid grid-cols-2 gap-3">
            {favoriteFeatures.map(f => (
              <Card
                key={f.id}
                isPressable
                onPress={() => onNavigate(f.toolId, f.tabId)}
                className="group border border-default-200/80 bg-default-50/60 transition-colors hover:bg-default-100/80"
                shadow="none"
              >
                <CardBody className="flex flex-row items-center gap-3 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-default-200 bg-background text-default-500">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">{f.label}</div>
                    <div className="text-xs text-default-400 truncate">{f.category}</div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
