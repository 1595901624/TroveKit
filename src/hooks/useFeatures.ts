import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ToolId } from "../components/Sidebar";

export interface FeatureItem {
  id: string;
  toolId: ToolId;
  tabId?: string;
  label: string;
  category: string;
}

export function useFeatures() {
  const { t } = useTranslation();

  const items: FeatureItem[] = useMemo(() => [
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
    { id: 'crypto-triple-des', toolId: 'crypto', tabId: 'tripleDes', label: t('tools.hash.tripleDes', '3DES'), category: t('nav.crypto') },
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
    { id: 'encoder-brainfuck', toolId: 'encoder', tabId: 'brainfuck', label: t('tools.encoder.brainfuck'), category: t('nav.encoder') },
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

    // Others
    { id: 'others-regex', toolId: 'others', tabId: 'regex', label: t('nav.regex'), category: t('nav.others') },

    // Main Tools
    { id: 'tool-home', toolId: 'home', label: t('nav.home'), category: t('nav.home') },
    { id: 'tool-crypto', toolId: 'crypto', label: t('nav.crypto'), category: t('nav.crypto') },
    { id: 'tool-encoder', toolId: 'encoder', label: t('nav.encoder'), category: t('nav.encoder') },
    { id: 'tool-classical', toolId: 'classical', label: t('nav.classical'), category: t('nav.classical') },
    { id: 'tool-formatters', toolId: 'formatters', label: t('nav.formatters'), category: t('nav.formatters') },
    { id: 'tool-generators', toolId: 'generators', label: t('nav.generators'), category: t('nav.generators') },
    { id: 'tool-converter', toolId: 'converter', label: t('nav.converter'), category: t('nav.converter') },
    { id: 'tool-others', toolId: 'others', label: t('nav.others'), category: t('nav.others') },
    { id: 'tool-logs', toolId: 'logManagement', label: t('nav.logManagement'), category: t('nav.logManagement') },
    { id: 'tool-settings', toolId: 'settings', label: t('nav.settings'), category: t('nav.settings') },
  ], [t]);

  return items;
}
