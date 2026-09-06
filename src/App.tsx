/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <iframe
        src="/vinyl-player.html"
        className="w-full h-full border-none"
        title="Vinyl Player"
        allow="autoplay; encrypted-media; clipboard-write"
      />
    </div>
  );
}
