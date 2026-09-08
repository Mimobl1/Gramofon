const audios = [deckAudio, startCueAudio, vinylNoiseAudio, endSound, clickSound, powerSound, sleeveSound];
audios.forEach(a => {
  if(!a.src) a.src = "data:audio/mp3;base64,//MkxAA";
  a.play().catch(()=>{});
  a.pause();
});
