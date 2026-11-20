import Link from 'next/link';

export default function NotFound() {
  return <main className="min-h-screen bg-[#f4faf9] text-[#163c3c] flex items-center justify-center p-6">
    <section className="max-w-md rounded-2xl border border-[#d7e8e6] bg-white p-8 text-center shadow-lg">
      <p className="text-sm font-semibold text-[#038c8c]">Erro 404</p>
      <h1 className="mt-2 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-3 text-[#607b79]">O endereço informado não existe ou não está disponível para sua conta.</p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#038c8c] px-5 py-3 font-semibold text-white">Voltar ao PilaManager</Link>
    </section>
  </main>;
}
