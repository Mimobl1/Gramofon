const fs = require('fs');
let html = fs.readFileSync('public/vinyl-player.html', 'utf-8');

const oldFlip = `    async function flipVinyl(){
      if(isFlipping) return;
      isFlipping=true;

      const flipBtn=document.querySelector('.flip-nav-btn');
      const recordStage = $("recordStage");
      const LIFT_UP_MS=460;
      const HOLD_MS=80;
      const LIFT_DOWN_MS=620;

      flipBtn?.setAttribute('disabled','true');

      try {
        const wasPlaying = playing || leadInNoiseActive || (playStartMs != null);
        handlePress(null,'stop',{silent:!wasPlaying});
        if(wasPlaying) await sleep(1250);

        document.body.classList.add('is-flipping');
        const prevStageTransition = recordStage ? recordStage.style.transition : "";

        if (recordStage) {
          recordStage.style.transition = \`transform \${LIFT_UP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)\`;
        }
        document.documentElement.style.setProperty('--lift-scale','1.28');
        document.documentElement.style.setProperty('--flip-rot','90deg');
        await sleep(LIFT_UP_MS);

        currentSide = currentSide === "A" ? "B" : "A";
        syncDisplay();
        ensureTrackIndexInCurrentSide();
        await setDeckSourceByIndex(currentTrackIndex);
        speed = 0;
        target = 0;
        scratch = 0;
        dragRec = false;
        elapsedMs = 0;
        setTimer(getSideDuration());
        
        if (recordStage) {
           recordStage.style.transition = 'none';
        }
        document.documentElement.style.setProperty('--flip-rot','-90deg');
        void recordStage.offsetWidth; // force reflow

        await sleep(HOLD_MS);

        if (recordStage) {
          recordStage.style.transition = \`transform \${LIFT_DOWN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)\`;
        }
        document.documentElement.style.setProperty('--lift-scale','1');
        document.documentElement.style.setProperty('--flip-rot','0deg');
        
        const handoffMs = Math.max(180, Math.floor(LIFT_DOWN_MS * 0.82));
        await sleep(handoffMs);
        document.body.classList.remove('is-flipping');
        await sleep((LIFT_DOWN_MS - handoffMs));
        if (recordStage) recordStage.style.transition = prevStageTransition;
      } finally {
        document.body.classList.remove('is-flipping');
        await sleep(120);
        flipBtn?.removeAttribute('disabled');
        isFlipping=false;
        if(powered){
          handlePress($("playBtn"), "play");
        }
      }
    }`;

const newFlip = `    async function flipVinyl(){
      if(isFlipping) return;
      isFlipping=true;

      const flipBtn=document.querySelector('.flip-nav-btn');
      const recordStage = $("recordStage");
      const LIFT_UP_MS=400;
      const FLIP_IN_MS=200;
      const FLIP_OUT_MS=250;
      const LIFT_DOWN_MS=500;

      flipBtn?.setAttribute('disabled','true');

      try {
        const wasPlaying = playing || leadInNoiseActive || (playStartMs != null);
        handlePress(null,'stop',{silent:!wasPlaying});
        if(wasPlaying) await sleep(1250);

        document.body.classList.add('is-flipping');
        const prevStageTransition = recordStage ? recordStage.style.transition : "";

        // 1. Lift up
        if (recordStage) {
          recordStage.style.transition = \`transform \${LIFT_UP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)\`;
        }
        document.documentElement.style.setProperty('--lift-scale','1.28');
        await sleep(LIFT_UP_MS);

        // 2. Rotate to 90deg (ease-in)
        if (recordStage) {
          recordStage.style.transition = \`transform \${FLIP_IN_MS}ms cubic-bezier(0.32, 0, 0.67, 0)\`; // ease-in
        }
        document.documentElement.style.setProperty('--flip-rot','90deg');
        await sleep(FLIP_IN_MS);

        // 3. Swap side data instantly
        currentSide = currentSide === "A" ? "B" : "A";
        syncDisplay();
        ensureTrackIndexInCurrentSide();
        await setDeckSourceByIndex(currentTrackIndex);
        speed = 0;
        target = 0;
        scratch = 0;
        dragRec = false;
        elapsedMs = 0;
        setTimer(getSideDuration());
        
        if (recordStage) {
           recordStage.style.transition = 'none';
        }
        document.documentElement.style.setProperty('--flip-rot','-90deg');
        void recordStage.offsetWidth; // force reflow

        // 4. Rotate from -90deg to 0deg (ease-out)
        if (recordStage) {
          recordStage.style.transition = \`transform \${FLIP_OUT_MS}ms cubic-bezier(0.33, 1, 0.68, 1)\`; // ease-out
        }
        document.documentElement.style.setProperty('--flip-rot','0deg');
        await sleep(FLIP_OUT_MS);

        // 5. Drop down
        if (recordStage) {
          recordStage.style.transition = \`transform \${LIFT_DOWN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)\`;
        }
        document.documentElement.style.setProperty('--lift-scale','1');
        
        const handoffMs = Math.max(180, Math.floor(LIFT_DOWN_MS * 0.82));
        await sleep(handoffMs);
        document.body.classList.remove('is-flipping');
        await sleep((LIFT_DOWN_MS - handoffMs));
        if (recordStage) recordStage.style.transition = prevStageTransition;
      } finally {
        document.body.classList.remove('is-flipping');
        await sleep(120);
        flipBtn?.removeAttribute('disabled');
        isFlipping=false;
        if(powered){
          handlePress($("playBtn"), "play");
        }
      }
    }`;

html = html.replace(oldFlip, newFlip);
fs.writeFileSync('public/vinyl-player.html', html);
