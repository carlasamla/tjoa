import Link from "next/link";

export default function AsamlaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
        &larr; tjoa
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Asamla</h1>

      <div className="mt-8 w-full overflow-hidden rounded-xl">
        <iframe
          src="https://www.asamla.com/events-public/dunder-mifflin/3381ebe0e2434b9dbf5058fa0f810c5e"
          width="100%"
          height="600"
          frameBorder="0"
          style={{ border: "none", borderRadius: "12px" }}
        />
      </div>
    </main>
  );
}
