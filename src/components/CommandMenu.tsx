import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { ToolId } from "./Sidebar";
import { createPortal } from "react-dom";

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (toolId: ToolId, tabId?: string) => void;
}

interface SearchItem {
  id: string;
  toolId: ToolId;
  tabId?: string;
  label: string;
  category: string;
}

export function CommandMenu({ isOpen, onClose, onNavigate }: CommandMenuProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: SearchItem[] = useMemo(() => [
    // Crypto
    { id: 'crypto-md2', toolId: 'crypto', tabId: 'md2', label: t('tools.hash.md2'), category: t('nav.crypto') },
    { id: 'crypto-md4', toolId: 'crypto', tabId: 'md4', label: t('tools.hash.md4'), category: t('nav.crypto') },
    { id: 'crypto-md5', toolId: 'crypto', tabId: 'md5', label: t('tools.hash.md5'), category: t('nav.crypto') },
    { id: 'crypto-hmac', toolId: 'crypto', tabId: 'hmacMd5', label: t('tools.hash.hmacMd5', 'HMAC-MD5'), category: t('nav.crypto') },
    { id: 'crypto-sha', toolId: 'crypto', tabId: 'sha', label: t('tools.hash.sha'), category: t('nav.crypto') },
    { id: 'crypto-aes', toolId: 'crypto', tabId: 'aes', label: t('tools.hash.aes'), category: t('nav.crypto') },
    { id: 'crypto-sm2', toolId: 'crypto', tabId: 'sm2', label: t('tools.hash.sm2'), category: t('nav.crypto') },
    { id: 'crypto-sm3', toolId: 'crypto', tabId: 'sm3', label: t('tools.hash.sm3', 'SM3'), category: t('nav.crypto') },
    { id: 'crypto-sm4', toolId: 'crypto', tabId: 'sm4', label: t('tools.hash.sm4', 'SM4'), category: t('nav.crypto') },
    { id: 'crypto-des', toolId: 'crypto', tabId: 'des', label: t('tools.hash.des', 'DES'), category: t('nav.crypto') },
    { id: 'crypto-rc4', toolId: 'crypto', tabId: 'rc4', label: t('tools.hash.rc4', 'RC4'), category: t('nav.crypto') },
    { id: 'crypto-chacha20', toolId: 'crypto', tabId: 'chacha20', label: t('tools.hash.chacha20'), category: t('nav.crypto') },
    { id: 'crypto-trivium', toolId: 'crypto', tabId: 'trivium', label: t('tools.hash.trivium'), category: t('nav.crypto') },
    { id: 'crypto-blake', toolId: 'crypto', tabId: 'blake', label: t('tools.hash.blake'), category: t('nav.crypto') },

    // Encoder
    { id: 'encoder-url', toolId: 'encoder', tabId: 'url', label: t('tools.encoder.url'), category: t('nav.encoder') },
    { id: 'encoder-hex', toolId: 'encoder', tabId: 'hex', label: t('tools.encoder.hex'), category: t('nav.encoder') },
    { id: 'encoder-base64', toolId: 'encoder', tabId: 'base64', label: t('tools.encoder.base64'), category: t('nav.encoder') },
    { id: 'encoder-base32', toolId: 'encoder', tabId: 'base32', label: t('tools.encoder.base32'), category: t('nav.encoder') },
    { id: 'encoder-basex', toolId: 'encoder', tabId: 'basex', label: t('tools.encoder.baseX'), category: t('nav.encoder') },
    { id: 'encoder-jwt', toolId: 'encoder', tabId: 'jwt', label: t('tools.encoder.jwtToken'), category: t('nav.encoder') },

    // Classical
    { id: 'classical-caesar', toolId: 'classical', tabId: 'caesar', label: t('tools.classical.caesar'), category: t('nav.classical') },
    { id: 'classical-morse', toolId: 'classical', tabId: 'morse', label: t('tools.classical.morse.title', 'Morse Code'), category: t('nav.classical') },
    { id: 'classical-bacon', toolId: 'classical', tabId: 'bacon', label: t('tools.classical.bacon.title', 'Bacon Cipher'), category: t('nav.classical') },

    // Formatter
    { id: 'fmt-json', toolId: 'formatters', tabId: 'json', label: t('tools.formatter.json'), category: t('nav.formatters') },
    { id: 'fmt-xml', toolId: 'formatters', tabId: 'xml', label: t('tools.formatter.xml'), category: t('nav.formatters') },
    { id: 'fmt-css', toolId: 'formatters', tabId: 'css', label: t('tools.formatter.css'), category: t('nav.formatters') },
    { id: 'fmt-sql', toolId: 'formatters', tabId: 'sql', label: t('tools.formatter.sql'), category: t('nav.formatters') },

    // Generator
    { id: 'gen-uuid', toolId: 'generators', tabId: 'uuid', label: t('tools.generator.uuid'), category: t('nav.generators') },
    { id: 'gen-qr', toolId: 'generators', tabId: 'qr', label: t('nav.qr'), category: t('nav.generators') },

    // Converter
    { id: 'conv-jsonxml', toolId: 'converter', tabId: 'jsonXml', label: t('tools.converter.jsonXml'), category: t('nav.converter') },
    { id: 'conv-jsonyaml', toolId: 'converter', tabId: 'jsonYaml', label: t('tools.converter.jsonYaml'), category: t('nav.converter') },
    { id: 'conv-timestamp', toolId: 'converter', tabId: 'timestamp', label: t('tools.converter.timestamp'), category: t('nav.converter') },
    { id: 'conv-subnet', toolId: 'converter', tabId: 'subnet', label: t('tools.converter.subnet'), category: t('nav.converter') },

    // Main Tools
    { id: 'tool-logs', toolId: 'logManagement', label: t('nav.logManagement'), category: t('nav.home') },
    { id: 'tool-settings', toolId: 'settings', label: t('nav.settings'), category: t('nav.home') },
  ], [t]);

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
