'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen bg-[#f4faf9] text-[#163c3c] flex items-center justify-center p-6">
    <section className="max-w-md rounded-2xl border border-[#d7e8e6] bg-white p-8 text-center shadow-lg">
      <h1 className="text-2xl font-bold">Não foi possível carregar esta área</h1>
      <p className="mt-3 text-[#607b79]">Tente novamente. Se o problema continuar, encerre a sessão e entre de novo.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-xl bg-[#038c8c] px-5 py-3 font-semibold text-white">Tentar novamente</button>
    </section>
  </main>;
}
