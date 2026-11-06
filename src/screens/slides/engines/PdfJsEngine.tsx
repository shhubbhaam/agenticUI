// Slide renderer: pdf.js inside a WebView we own (see pdfViewerHtml.ts). The app owns the page
// number; this engine only follows it, and reports swipes back so the screen stays the single
// source of truth (buttons, swipes and full screen all agree on the current slide).
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { buildPdfViewerHtml, parseViewerMessage, PDFJS_ORIGIN } from './pdfViewerHtml';

// react-native-webview 14's class typings collapse their props to `never` under @types/react 19.3
// (same workaround as the YouTube engine).
const WebView = RNWebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<RNWebView> }>;

interface PdfJsEngineProps {
  /** The whole PDF, base64. */
  base64: string;
  /** 1-based page to show. */
  page: number;
  background: string;
  onLoaded: (total: number, aspect: number) => void;
  onSwipe: (dir: 'next' | 'prev') => void;
  onError: (code: string) => void;
}

export const PdfJsEngine: React.FC<PdfJsEngineProps> = ({ base64, page, background, onLoaded, onSwipe, onError }) => {
  const web = useRef<RNWebView>(null);
  const loaded = useRef(false);
  const pageRef = useRef(page);
  pageRef.current = page;
  const html = useMemo(() => buildPdfViewerHtml(background), [background]);

  const inject = useCallback((js: string) => web.current?.injectJavaScript(`${js};true;`), []);

  useEffect(() => {
    if (loaded.current) inject(`window.__slides&&window.__slides.show(${Math.floor(page)})`);
  }, [page, inject]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    const m = parseViewerMessage(e.nativeEvent.data);
    if (!m) return;
    if (m.t === 'ready') {
      // base64 is [A-Za-z0-9+/=] only; JSON.stringify keeps it a safe string literal regardless.
      inject(`window.__slides.open(${JSON.stringify(base64)},${Math.floor(pageRef.current)})`);
    } else if (m.t === 'loaded') {
      loaded.current = true;
      onLoaded(m.total, m.aspect);
    } else if (m.t === 'swipe') {
      onSwipe(m.dir);
    } else if (m.t === 'error') {
      if (__DEV__) console.log('[slides] viewer error:', m.code, m.msg ?? '', 'base64 length:', base64.length);
      onError(m.code);
    }
  }, [base64, inject, onLoaded, onSwipe, onError]);

  return (
    <View style={{ flex: 1, backgroundColor: background }} testID="pdf-engine">
      <WebView
        ref={web}
        testID="pdf-webview"
        // The page's origin is pdf.js's CDN so its worker loads same-origin.
        source={{ html, baseUrl: `${PDFJS_ORIGIN}/` }}
        originWhitelist={['https://*']}
        onMessage={onMessage}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        // Never navigate away from the viewer page.
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(PDFJS_ORIGIN) || r.url.startsWith('about:')}
        style={{ flex: 1, backgroundColor: background }}
      />
    </View>
  );
};
