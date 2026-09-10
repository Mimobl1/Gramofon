/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {/* Mobile view warning */}
      <div className="flex md:hidden w-full h-full items-center justify-center p-8 text-center bg-zinc-950 text-zinc-100">
        <p className="text-lg font-medium leading-relaxed max-w-sm">
          This app is not optimized for mobile devices, please load on bigger screen.
        </p>
      </div>

      {/* Desktop / larger screen view */}
      <div className="hidden md:block w-full h-full">
        <iframe
          src="/vinyl-player.html"
          className="w-full h-full border-none"
          title="Vinyl Player"
          allow="autoplay; encrypted-media; clipboard-write"
        />
      </div>
    </div>
  );
}
