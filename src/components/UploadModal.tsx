import React, { useState } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [metadata, setMetadata] = useState({ artist: '', title: '', year: '', genres: [] as string[] });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg p-6 rounded-xl shadow-2xl relative text-white">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">✕</button>
        
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Upload music</h2>
            <div className="border-2 border-dashed border-zinc-700 p-12 text-center rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-zinc-800 transition">
              <p className="text-zinc-400">⬆️ Select folder</p>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-indigo-600 p-3 rounded-lg font-bold hover:bg-indigo-700">Continue</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Upload music</h2>
            <div className="text-xs text-zinc-400">Upload progress 42%</div>
            <div className="bg-zinc-800 p-4 rounded-lg h-32 overflow-y-auto text-sm">
                {/* Simulated file list */}
                {Array.from({length: 13}).map((_, i) => <div key={i}>track_{i+1}.mp3</div>)}
            </div>
            <input type="text" placeholder="Artist" value={metadata.artist} onChange={e => setMetadata({...metadata, artist: e.target.value})} className="w-full bg-zinc-800 p-3 rounded-lg border border-zinc-700" />
            <div className="flex gap-2">
              <input type="text" placeholder="Title" value={metadata.title} onChange={e => setMetadata({...metadata, title: e.target.value})} className="flex-grow bg-zinc-800 p-3 rounded-lg border border-zinc-700" />
              <input type="number" placeholder="Year" value={metadata.year} onChange={e => setMetadata({...metadata, year: e.target.value})} className="w-24 bg-zinc-800 p-3 rounded-lg border border-zinc-700" />
            </div>
            <div className="flex flex-wrap gap-2">
              {['Rock', 'Jazz', 'Classical', 'Blues', 'Pop', 'Other'].map(g => (
                <button key={g} className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-full text-sm">{g}</button>
              ))}
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-indigo-600 p-3 rounded-lg font-bold hover:bg-indigo-700">Continue</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">The Rolling stones - Title...</h2>
            <div className="text-xs text-zinc-400">Upload progress 73%</div>
            <div className="border-2 border-dashed border-zinc-700 p-12 text-center rounded-lg cursor-pointer hover:border-indigo-500">
              <p className="text-zinc-400">⬆️ Upload cover image</p>
            </div>
            <div className="flex items-center justify-between">
                <span>Or choose custom color</span>
                <input type="color" className="w-10 h-10 rounded border-0" />
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-zinc-100 text-black p-3 rounded-lg font-bold hover:bg-white">Complete</button>
            <button onClick={() => setStep(2)} className="w-full border border-zinc-600 p-3 rounded-lg hover:bg-zinc-800">Back</button>
          </div>
        )}
      </div>
    </div>
  );
};
