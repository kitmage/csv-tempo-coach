import { buildTimeline, formatTime } from './csv.js';
import { normalizeWorkoutManifest } from './workouts.js';

const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries(['workoutSelect','csvFile','fileSummary','messages','startButton','pauseButton','stopButton','currentTime','currentBpm','currentCue','timelineBody','cueCount','playbackStatus','metronomeEnabled','speechEnabled','volume','volumeOutput'].map((id)=>[id,$(id)]));
let timeline=[]; let audioContext; let masterGain; let isPlaying=false; let pausedAt=0; let playbackStart=0; let schedulerId; let frameId; let nextBeatTime=0; let nextCueIndex=0; let activeIndex=-1;
const LOOKAHEAD=0.1; const SCHEDULER_MS=25;

function elapsed() { return isPlaying ? Math.max(0,audioContext.currentTime-playbackStart) : pausedAt; }
function activeAt(time) { let found=-1; for(let i=0;i<timeline.length && timeline[i].time<=time;i+=1) found=i; return found; }
function renderTimeline() { ui.timelineBody.innerHTML=timeline.map((item,i)=>`<tr data-index="${i}"><td>${formatTime(item.time)}</td><td>${item.bpm} BPM</td><td>${escapeHtml(item.text)||'<span class="muted">—</span>'}</td></tr>`).join(''); ui.cueCount.textContent=`${timeline.length} cue${timeline.length===1?'':'s'}`; }
function escapeHtml(value) { const node=document.createElement('div'); node.textContent=value; return node.innerHTML; }
function setActive(index, speak=false) { activeIndex=index; document.querySelectorAll('tbody tr').forEach((row)=>row.classList.toggle('active',Number(row.dataset.index)===index)); const cue=timeline[index]; ui.currentBpm.textContent=cue?.bpm??'—'; ui.currentCue.textContent=cue?.text|| (cue?'No cue text':'Ready when you are'); if(speak && cue?.text && ui.speechEnabled.checked && 'speechSynthesis' in window) { speechSynthesis.speak(new SpeechSynthesisUtterance(cue.text)); } }
function scheduleClick(time) { if(!ui.metronomeEnabled.checked) return; const oscillator=audioContext.createOscillator(); const gain=audioContext.createGain(); oscillator.frequency.value=1050; gain.gain.setValueAtTime(0.0001,time); gain.gain.exponentialRampToValueAtTime(0.5,time+0.002); gain.gain.exponentialRampToValueAtTime(0.0001,time+0.035); oscillator.connect(gain).connect(masterGain); oscillator.start(time); oscillator.stop(time+0.04); }
function scheduler() { if(!isPlaying)return; const now=audioContext.currentTime; const horizon=now+LOOKAHEAD; while(nextBeatTime<horizon) { const beatElapsed=nextBeatTime-playbackStart; const index=activeAt(beatElapsed); if(index<0){ nextBeatTime=playbackStart+timeline[0].time; continue; } scheduleClick(nextBeatTime); const cue=timeline[index]; const nextTransition=timeline[index+1]?.time; const proposed=nextBeatTime+(60/cue.bpm); nextBeatTime=nextTransition!==undefined && proposed-playbackStart>nextTransition ? playbackStart+nextTransition : proposed; } schedulerId=setTimeout(scheduler,SCHEDULER_MS); }
function updateFrame() { if(!isPlaying)return; const time=elapsed(); ui.currentTime.textContent=formatTime(time); while(nextCueIndex<timeline.length && timeline[nextCueIndex].time<=time) { setActive(nextCueIndex,true); nextCueIndex+=1; } frameId=requestAnimationFrame(updateFrame); }
async function start() { if(!timeline.length||isPlaying)return; if(!audioContext){ audioContext=new (window.AudioContext||window.webkitAudioContext)(); masterGain=audioContext.createGain(); masterGain.connect(audioContext.destination); } await audioContext.resume(); masterGain.gain.value=Number(ui.volume.value); playbackStart=audioContext.currentTime-pausedAt; nextBeatTime=audioContext.currentTime+.03; nextCueIndex=timeline.findIndex((item)=>item.time>pausedAt); if(nextCueIndex<0)nextCueIndex=timeline.length; isPlaying=true; ui.startButton.disabled=true; ui.pauseButton.disabled=false; ui.stopButton.disabled=false; ui.playbackStatus.textContent='Playing'; scheduler(); updateFrame(); }
function pause() { if(!isPlaying)return; pausedAt=elapsed(); isPlaying=false; clearTimeout(schedulerId); cancelAnimationFrame(frameId); audioContext.suspend(); if('speechSynthesis' in window) window.speechSynthesis.cancel(); ui.startButton.textContent='Resume'; ui.startButton.disabled=false; ui.pauseButton.disabled=true; ui.playbackStatus.textContent='Paused'; }
function stop() { isPlaying=false; clearTimeout(schedulerId); cancelAnimationFrame(frameId); if(audioContext)audioContext.suspend(); if('speechSynthesis'in window)speechSynthesis.cancel(); pausedAt=0; nextCueIndex=0; setActive(activeAt(0)); ui.currentTime.textContent='00:00'; ui.startButton.textContent='Start'; ui.startButton.disabled=!timeline.length; ui.pauseButton.disabled=true; ui.stopButton.disabled=true; ui.playbackStatus.textContent='Ready'; }

function loadTimelineText(csvText,displayName) {
  stop();
  try {
    const result=buildTimeline(csvText);
    timeline=result.timeline;
    ui.messages.innerHTML=[...result.errors.map(x=>`<div class="error">${escapeHtml(x)}</div>`),...result.warnings.map(x=>`<div class="warning">${escapeHtml(x)}</div>`)].join('');
    ui.fileSummary.textContent=result.errors.length?`${displayName} could not be loaded`:`${displayName} · ${timeline.length} cues loaded`;
    renderTimeline();
    pausedAt=0; nextCueIndex=0; setActive(activeAt(0));
    ui.currentTime.textContent='00:00';
    ui.startButton.textContent='Start'; ui.startButton.disabled=Boolean(result.errors.length)||!timeline.length;
    ui.pauseButton.disabled=true; ui.stopButton.disabled=true; ui.playbackStatus.textContent='Ready';
  } catch(error){
    timeline=[]; renderTimeline(); pausedAt=0; nextCueIndex=0; setActive(-1);
    ui.currentTime.textContent='00:00'; ui.messages.innerHTML=`<div class="error">${escapeHtml(error.message)}</div>`;
    ui.fileSummary.textContent=`${displayName} could not be loaded`;
    ui.startButton.textContent='Start'; ui.startButton.disabled=true; ui.pauseButton.disabled=true; ui.stopButton.disabled=true; ui.playbackStatus.textContent='Ready';
  }
}
function showSourceLoadError(displayName,message,error) {
  stop(); timeline=[]; renderTimeline(); setActive(-1);
  ui.fileSummary.textContent=`${displayName} could not be loaded`;
  ui.messages.innerHTML=`<div class="error">${escapeHtml(message)}: ${escapeHtml(error.message)}</div>`;
  ui.startButton.disabled=true; ui.pauseButton.disabled=true; ui.stopButton.disabled=true;
}
async function initializeWorkouts() { try { const response=await fetch('./workouts/index.json'); if(!response.ok)throw new Error(`Workout list request failed (${response.status}).`); const manifest=await response.json(); normalizeWorkoutManifest(manifest).forEach((entry)=>{ const option=document.createElement('option'); option.value=`./workouts/${entry.file}`; option.textContent=entry.name; ui.workoutSelect.append(option); }); } catch(error) { ui.workoutSelect.disabled=true; ui.messages.innerHTML=`<div class="warning">Premade workouts are unavailable: ${escapeHtml(error.message)}</div>`; } }
let workoutRequestId=0;
ui.workoutSelect.addEventListener('change',async()=>{
  const option=ui.workoutSelect.selectedOptions[0]; const requestId=++workoutRequestId;
  if(!option?.value)return;
  const workoutFile=option.value; const displayName=option.textContent;
  ui.csvFile.value=''; ui.workoutSelect.disabled=true;
  try {
    const response=await fetch(workoutFile);
    if(!response.ok)throw new Error(`request failed (${response.status})`);
    const csvText=await response.text();
    if(requestId!==workoutRequestId)return;
    loadTimelineText(csvText,displayName);
  } catch(error) {
    if(requestId===workoutRequestId)showSourceLoadError(displayName,`Could not download ${displayName}`,error);
  } finally {
    if(requestId===workoutRequestId)ui.workoutSelect.disabled=false;
  }
});
ui.csvFile.addEventListener('change',async()=>{
  const file=ui.csvFile.files[0];
  if(!file)return;
  const requestId=++workoutRequestId; ui.workoutSelect.disabled=false; ui.workoutSelect.value='';
  try { const csvText=await file.text(); if(requestId===workoutRequestId)loadTimelineText(csvText,file.name); }
  catch(error) { if(requestId===workoutRequestId)showSourceLoadError(file.name,`Could not read ${file.name}`,error); }
});
ui.startButton.addEventListener('click',start); ui.pauseButton.addEventListener('click',pause); ui.stopButton.addEventListener('click',stop); ui.volume.addEventListener('input',()=>{ui.volumeOutput.textContent=`${Math.round(ui.volume.value*100)}%`;if(masterGain)masterGain.gain.value=Number(ui.volume.value);});
initializeWorkouts();
