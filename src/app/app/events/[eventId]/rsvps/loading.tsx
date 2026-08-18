export default function EventRsvpsLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl animate-pulse px-6 py-14">
      <div className="h-4 w-28 rounded bg-black/10" />
      <div className="mt-8 h-10 w-72 rounded bg-black/10" />
      <div className="mt-4 h-5 w-full max-w-xl rounded bg-black/5" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl bg-black/5" />)}
      </div>
      <div className="mt-6 h-80 rounded-2xl bg-black/5" />
    </main>
  );
}
