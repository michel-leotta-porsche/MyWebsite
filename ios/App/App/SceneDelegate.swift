import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CalimaViewController()
        window?.makeKeyAndVisible()

        // Kaltstart über die Quick Action am App-Symbol: die Seite holt sie ab, sobald sie läuft (CalimaLaunch)
        if let item = connectionOptions.shortcutItem { _ = CalimaLaunch.receive(item) }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    /// Quick Action, während Calima im Hintergrund lag
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(CalimaLaunch.receive(shortcutItem))
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// Webansicht mit eigenem Router für den statischen Next-Export
class CalimaViewController: CAPBridgeViewController {
    override func router() -> Router {
        return CalimaRouter()
    }

    /// Eigene Plugins aus dem App-Ziel, ohne eigenes Paket: die Kamera (CalimaCamera.swift)
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CalimaCameraPlugin())
    }
}

/// Der Export legt jede Seite als eigene Datei ab: /zimmer → zimmer.html, / → index.html.
/// Capacitors Standard-Router schickt jeden Pfad ohne Endung auf index.html, dann zeigt /zimmer die Startseite.
struct CalimaRouter: Router {
    var basePath: String = ""

    func route(for path: String) -> String {
        if !URL(fileURLWithPath: path).pathExtension.isEmpty {
            return basePath + path
        }
        let page = path.hasSuffix("/") ? String(path.dropLast()) : path
        if page.isEmpty {
            return basePath + "/index.html"
        }
        let file = basePath + page + ".html"
        if FileManager.default.fileExists(atPath: file) {
            return file
        }
        // unbekannte Seite: eigene 404 mit Weg zurück statt leerer Ansicht
        return basePath + "/404.html"
    }
}
