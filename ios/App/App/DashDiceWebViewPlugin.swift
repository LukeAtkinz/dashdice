import Foundation
import Capacitor

/**
 * Custom WebView configuration for DashDice
 * Prevents external navigation and keeps everything in the app
 */
@objc(DashDiceWebViewPlugin)
public class DashDiceWebViewPlugin: CAPPlugin {
    
    @objc override public func load() {
        // Configure WebView to prevent external navigation
        if let webView = bridge?.webView {
            webView.navigationDelegate = self
        }
    }
}

extension DashDiceWebViewPlugin: WKNavigationDelegate {
    
    public func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        
        // Always allow navigation to dashdice.gg domain
        if url.host?.contains("dashdice.gg") == true {
            decisionHandler(.allow)
            return
        }
        
        // Allow initial load and same-origin requests
        if navigationAction.navigationType == .other || url.scheme == "capacitor" {
            decisionHandler(.allow)
            return
        }
        
        // For all other navigation, stay in the app
        decisionHandler(.allow)
    }
    
    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        // Log the error but don't redirect to Safari
        print("WebView navigation failed: \(error.localizedDescription)")
        
        // Try to reload the main URL
        if let mainURL = URL(string: "https://dashdice.gg") {
            webView.load(URLRequest(url: mainURL))
        }
    }
}