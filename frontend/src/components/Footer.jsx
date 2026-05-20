export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white" data-testid="main-footer">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="font-display text-2xl font-black tracking-tighter">VEIKALS<span className="text-red-500">.</span></div>
          <p className="mt-3 text-sm text-neutral-500 max-w-xs">Apģērbs, elektronika un luksusa smaržas — viss vienuviet.</p>
        </div>
        <div>
          <div className="label-eyebrow">Veikals</div>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li>Apģērbs</li>
            <li>iPhone 17 Pro Max</li>
            <li>Smaržas</li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow">Palīdzība</div>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li><a href="/track" className="hover:text-black">Sekot pasūtījumam</a></li>
            <li>Piegāde</li>
            <li>Atgriešana</li>
            <li>FAQ</li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow">Maksājumi</div>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li>Apple Pay</li>
            <li>Google Pay</li>
            <li>Karte / PayPal</li>
            <li>Bankas pārskaitījums</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/10 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} Veikals. Visas tiesības aizsargātas.
      </div>
    </footer>
  );
}
