import { Book } from "@/components/book";

export default function Home() {
  return (
    <main>
      {/* Zwei Bindungen desselben Buchs: Doppelseiten ab Tablet, Einzelseiten auf dem Telefon */}
      <Book mode="spread" className="hidden md:block" />
      <Book mode="single" className="md:hidden" />
      <footer className="linen relative bg-table-deep text-on-table-2 px-4 py-10 text-sm md:px-8">
        <p>
          <span className="text-on-table font-semibold">Fujiventura</span> · Fotografien von Michel
          Leotta, Fuerteventura
        </p>
      </footer>
    </main>
  );
}
