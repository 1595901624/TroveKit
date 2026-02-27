import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { ToolId } from "./Sidebar";
import { createPortal } from "react-dom";
import { useFeatures } from "../hooks/useFeatures";
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext";

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (toolId: ToolId, tabId?: string) => void;
}

export function CommandMenu({ isOpen, onClose, onNavigate }: CommandMenuProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const allItems = useFeatures();
  const { getPreference } = useFeaturePreferences();

  const items = useMemo(() => {
    return allItems.filter(item => {
      // Main tools are always visible in search
      if (!item.tabId) return true;
      return getPreference(item.id).visible;
    });
  }, [allItems, getPreference]);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.label.toLowerCase().includes(lowerQuery) || 
      item.category.toLowerCase().includes(lowerQuery)
    );
  }, [query, items]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        e.stopPropagation();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        // Simple scroll into view logic could be added here
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          const item = filteredItems[selectedIndex];
          onNavigate(item.toolId, item.tabId);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex, onNavigate]);

  // Ensure selected index is valid when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (listRef.current && isOpen) {
        const selectedElement = listRef.current.children[0]?.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-background border border-divider rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 border-b border-divider">
          <Search className="w-5 h-5 text-default-400" />
          <input
            ref={inputRef}
            className="flex-1 h-12 px-3 bg-transparent border-none outline-none text-foreground placeholder:text-default-400"
            placeholder={t('common.search', 'Search tools...')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="text-xs text-default-400 border border-divider px-1.5 py-0.5 rounded">Esc</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide" ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-default-400 text-sm">
              No results found.
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredItems.map((item, index) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                    index === selectedIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-default-100'
                  }`}
                  onClick={() => {
                    onNavigate(item.toolId, item.tabId);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-default-400">{item.category}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-4 py-2 border-t border-divider bg-default-50 text-[10px] text-default-400 flex justify-between">
           <span>Navigate: ⇅</span>
           <span>Select: ↵</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
