import { Intro } from "@/components/intro";
import { Library } from "@/components/books";
import { books } from "@/content/books";

export default function Home() {
  return (
    <main>
      <Intro />
      <Library
        books={books}
        footer={
          <footer className="linen table-surface relative hidden bg-table-deep px-4 py-10 text-sm text-on-table-2 md:block md:px-8">
            <p>
              <span className="font-semibold text-on-table">Fujiventura</span> · Fotografien von Michel Leotta,
              Fuerteventura und Japan
            </p>
          </footer>
        }
      />
    </main>
  );
}
