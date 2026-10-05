import { IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google"

export const sans = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

// Setzt das Farbschema vor dem ersten Paint. Hell ist Standard, Dunkel nur auf Wunsch.
export const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`
