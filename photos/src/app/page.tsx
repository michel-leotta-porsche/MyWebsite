import { Book } from "@/components/book";
import { Intro } from "@/components/intro";

export default function Home() {
  return (
    <main>
      <Intro />
      {/* Zwei Bindungen desselben Buchs: Doppelseiten ab Tablet, Einzelseiten zum Wischen auf dem Telefon */}
      <Book mode="spread" className="hidden md:block" />
      <Book mode="single" className="md:hidden" />
      <footer className="linen relative hidden bg-table-deep px-4 py-10 text-sm text-on-table-2 md:block md:px-8">
        <p>
          <span className="font-semibold text-on-table">Fujiventura</span> · Fotografien von Michel Leotta,
          Fuerteventura
        </p>
      </footer>
    </main>
  );
}
