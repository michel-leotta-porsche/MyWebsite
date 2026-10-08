import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CalimaViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
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
