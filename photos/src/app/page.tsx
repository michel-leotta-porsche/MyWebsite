import { Books } from "@/components/books";
import { Intro } from "@/components/intro";

export default function Home() {
  return (
    <main>
      <Intro />
      <Books />
      <footer className="linen relative hidden bg-table-deep px-4 py-10 text-sm text-on-table-2 md:block md:px-8">
        <p>
          <span className="font-semibold text-on-table">Fujiventura</span> · Fotografien von Michel Leotta,
          Fuerteventura
        </p>
      </footer>
    </main>
  );
}
