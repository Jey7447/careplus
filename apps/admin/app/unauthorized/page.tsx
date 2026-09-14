export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-lg font-semibold text-red-700">
          !
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">Access restricted</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account is authenticated, but it is not authorized to access the CarePlus administration portal.
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Contact a CarePlus administrator if you believe you should have access.
        </p>
      </section>
    </main>
  );
}
