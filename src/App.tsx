import { useState, useEffect } from "react"
import { Layout } from "./components/Layout"
import { ThemeProvider } from "./components/theme-provider"
import { HashTool } from "./tools/HashTool"
import { EncoderTool } from "./tools/EncoderTool"
import { ClassicalTool } from "./tools/ClassicalTool"
import { GeneratorTool } from "./tools/GeneratorTool"
import { Settings } from "./tools/Settings"
import { FormatterTool } from "./tools/FormatterTool"
import { ConverterTool } from "./tools/ConverterTool"
import { OthersTool } from "./tools/OthersTool"
import { LogManagementTool } from "./tools/LogManagementTool"
import { ToolId } from "./components/Sidebar"
import { Card, CardBody } from "@heroui/react"
import { ArrowRight, Lock, Code2, FileCode2, Shield, Wand2, ArrowRightLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

/**
 * 主应用组件
 * 整个应用程序的根组件，负责管理全局状态和渲染主布局
 * 
 * 状态管理:
 * - activeTool: 当前选中的工具/页面
 * - activeTab: 当前工具的活跃标签页
 * - visitedTools: 用户访问过的工具集合，用于实现懒加载
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
  // 用户访问过的工具集合，用于条件渲染和性能优化
  const [visitedTools, setVisitedTools] = useState<Set<ToolId>>(new Set(["home"]))
  // 翻译函数，用于获取国际化文本
  const { t } = useTranslation()

  /**
   * 副作用：跟踪用户访问的工具
   * 当 activeTool 改变时，将其添加到已访问工具集合中
   * 这样可以延迟加载未访问的工具组件，优化初始加载性能
   */
  useEffect(() => {
    setVisitedTools(prev => {
      // 如果当前工具已经访问过，直接返回之前的集合
      if (prev.has(activeTool)) return prev
      // 创建新集合并添加当前工具
      const newSet = new Set(prev)
      newSet.add(activeTool)
      return newSet
    })
  }, [activeTool])

  /**
   * 处理工具切换
   * 当用户从侧边栏选择不同工具时调用
   * @param id - 要切换到的工具ID
   */
  const handleToolChange = (id: ToolId) => {
    setActiveTool(id)
    // 切换工具时重置标签页状态
    setActiveTab(undefined)
  }

  /**
   * 处理导航操作
   * 支持导航到指定工具的特定标签页
   * @param toolId - 目标工具ID
   * @param tabId - 可选的目标标签页ID
   */
  const handleNavigate = (toolId: ToolId, tabId?: string) => {
    setActiveTool(toolId)
    setActiveTab(tabId)
  }

  /**
   * 获取当前工具的标题
   * 根据当前活跃的工具ID返回对应的国际化标题
   * @returns 当前页面显示的标题文本
   */
  const getTitle = () => {
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
   * 主页渲染逻辑：
   * 使用条件渲染和visitedTools集合实现按需加载
   * 只有当用户访问过某个工具时才会渲染对应的组件
   * activeTool === 工具ID 时显示该组件，否则隐藏
   * 这种方式可以提高初始加载性能
   */
  return (
    <ThemeProvider storageKey="trovekit-theme">
      <Layout
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onNavigate={handleNavigate}
        title={getTitle()}
      >
        <div className="max-w-7xl mx-auto h-full">
          {visitedTools.has("home") && (
            <div className={activeTool === "home" ? "block h-full" : "hidden"}>
              <HomeView onNavigate={handleNavigate} />
            </div>
          )}
          {visitedTools.has("crypto") && (
            <div className={activeTool === "crypto" ? "block h-full" : "hidden"}>
              <HashTool activeTab={activeTool === "crypto" ? activeTab : undefined} isVisible={activeTool === "crypto"} />
            </div>
          )}
          {visitedTools.has("encoder") && (
            <div className={activeTool === "encoder" ? "block h-full" : "hidden"}>
              <EncoderTool activeTab={activeTool === "encoder" ? activeTab : undefined} isVisible={activeTool === "encoder"} />
            </div>
          )}
          {visitedTools.has("classical") && (
            <div className={activeTool === "classical" ? "block h-full" : "hidden"}>
              <ClassicalTool activeTab={activeTool === "classical" ? activeTab : undefined} isVisible={activeTool === "classical"} />
            </div>
          )}
          {visitedTools.has("formatters") && (
            <div className={activeTool === "formatters" ? "block h-full" : "hidden"}>
              <FormatterTool activeTab={activeTool === "formatters" ? activeTab : undefined} isVisible={activeTool === "formatters"} />
            </div>
          )}
          {visitedTools.has("generators") && (
            <div className={activeTool === "generators" ? "block h-full" : "hidden"}>
              <GeneratorTool activeTab={activeTool === "generators" ? activeTab : undefined} isVisible={activeTool === "generators"} />
            </div>
          )}
          {visitedTools.has("converter") && (
            <div className={activeTool === "converter" ? "block h-full" : "hidden"}>
              <ConverterTool isVisible={activeTool === "converter"} activeTab={activeTool === "converter" ? activeTab : undefined} />
            </div>
          )}
          {visitedTools.has("others") && (
            <div className={activeTool === "others" ? "block h-full" : "hidden"}>
              <OthersTool activeTab={activeTool === "others" ? activeTab : undefined} isVisible={activeTool === "others"} />
            </div>
          )}
          {visitedTools.has("logManagement") && (
            <div className={activeTool === "logManagement" ? "block h-full" : "hidden"}>
              <LogManagementTool />
            </div>
          )}
          {visitedTools.has("settings") && (
            <div className={activeTool === "settings" ? "block h-full" : "hidden"}>
              <Settings />
            </div>
          )}
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
      desc: "JSON 与 XML 互转",
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
    <div className="space-y-12 py-8 animate-in fade-in duration-500">
      {/* 欢迎标题区域 */}
      <div className="space-y-3 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70">
            {t("home.welcome")}
          </span>
        </h2>
        <p className="text-default-500 text-lg leading-relaxed">
          {t("home.subtitle")}
        </p>
      </div>

      {/* 工具卡片网格区域 - 使用响应式布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((item) => (
          <Card
            key={item.id}
            isPressable
            onPress={() => onNavigate(item.id as ToolId)}
            className="group border border-default-200/50 bg-background/60 backdrop-blur-sm hover:bg-default-100/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/5"
            shadow="none"
          >
            <CardBody className="p-8 space-y-6">
              {/* 工具图标带渐变背景 */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <div className={item.iconColor}>
                  {item.icon}
                </div>
              </div>
              {/* 工具标题和描述 */}
              <div className="space-y-2">
                <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-default-500 text-sm leading-relaxed line-clamp-2">{item.desc}</p>
              </div>
              {/* "Get started" 悬停提示 */}
              <div className="pt-2 flex items-center gap-2 text-primary font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <span className="text-xs">Get started</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* 常用功能区域 - 仅在有收藏功能时显示 */}
      {favoriteFeatures.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-default-200/50">
          <h3 className="text-xl font-bold tracking-tight">{t("home.frequentlyUsed", "常用功能")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoriteFeatures.map(f => (
              <Card
                key={f.id}
                isPressable
                onPress={() => onNavigate(f.toolId, f.tabId)}
                className="group border border-default-200/50 bg-background/60 backdrop-blur-sm hover:bg-default-100/50 transition-all duration-300 hover:-translate-y-1"
                shadow="none"
              >
                <CardBody className="p-4 flex flex-row items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
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
