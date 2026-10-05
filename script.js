const $ = (s) => document.querySelector(s);
const content = $('#gameContent');
const intro = $('#intro'), game = $('#game'), win = $('#win'), failScreen = $('#fail');
let score=0, round=0, mistakes=0, soundOn=true, timerId=null;
let best=Number(localStorage.getItem('vsp29-best')||0);
$('#bestScore').textContent=String(best).padStart(5,'0');

// Ambient pixel stars + soft cloud wisps — generated so deployment needs no image assets.
for(let i=0;i<78;i++){
  const s=document.createElement('i'); s.className='star'; s.style.left=Math.random()*100+'%'; s.style.top=Math.random()*100+'%';
  s.style.animationDelay=(Math.random()*3)+'s'; s.style.opacity=(.18+Math.random()*.75); $('#stars').appendChild(s);
}
for(let i=0;i<8;i++){
  const c=document.createElement('i'); c.className='sky-cloud cloud-extra'; c.style.left=(Math.random()*112-6)+'%'; c.style.top=(Math.random()*92)+'%';
  c.style.transform=`scale(${.55+Math.random()*.85})`; c.style.animationDelay=(-Math.random()*18)+'s'; $('#cloudField').appendChild(c);
}

let audioCtx;
function beep(freq=440,dur=.08,type='square',gain=.035){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur)}catch(e){}}
function success(){beep(660,.08);setTimeout(()=>beep(880,.1),70)}
function fail(){beep(150,.14,'sawtooth')}
function chime(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.14,'square',.045),i*100))}
function alarm(){[180,120,180,100].forEach((f,i)=>setTimeout(()=>beep(f,.16,'sawtooth',.045),i*120))}
$('#soundBtn').onclick=()=>{soundOn=!soundOn;$('#soundBtn').textContent=soundOn?'♫':'×';if(soundOn)beep(700,.06)};

function resetRun(){score=0;round=0;mistakes=0;clearInterval(timerId);timerId=null;$('#mistakeCount').textContent='0 / 2';}
$('#startBtn').onclick=()=>{resetRun();intro.classList.remove('active');win.classList.remove('active');failScreen.classList.remove('active');game.classList.add('active');renderRound()};
$('#replayBtn').onclick=()=>{$('#confetti').innerHTML='';game.classList.add('active');win.classList.remove('active');failScreen.classList.remove('active');resetRun();renderRound()};

const pad=n=>String(Math.max(0,n)).padStart(5,'0');
function setHud(){
 $('#roundLabel').textContent=String(Math.min(round+1,5)).padStart(2,'0')+' / 05';
 $('#score').textContent=pad(score); $('#progressBar').style.width=(round/5*100)+'%';
 $('#mistakeCount').textContent=`${mistakes} / 2`;
}
function card(inner){content.innerHTML=`<div class="round-card glass-card">${inner}</div>`}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1500)}

// A run allows exactly ONE wrong answer. The first mistake deducts points and continues.
// The SECOND mistake immediately ends the mission. No question ever gets a retry.
function mistake(reason='WRONG DECISION'){
  mistakes++; score=Math.max(0,score-75); setHud(); fail();
  if(mistakes>=2){setTimeout(()=>missionFailed(reason),380); return false;}
  toast('MISTAKE  •  -75  •  1 STRIKE REMAINING'); return true;
}
function correct(points){score+=points;setHud();success()}
function finishRound(){clearInterval(timerId);timerId=null;round++;setHud();setTimeout(()=>{if(round>=5)finishGame();else renderRound()},560)}
function renderRound(){clearInterval(timerId);timerId=null;setHud();[roundPhish,roundMemory,roundForensics,roundNetwork,roundCipher][round]();}

function roundPhish(){
 const items=[
  {from:'security@campus.edu',sub:'Password rotation reminder',body:'Your password expires in 7 days. Open the portal from your usual bookmark to update it.',ok:true,why:'The sender is an official campus domain and does not demand credentials through a strange link.'},
  {from:'it-helpdesk@campus-support.xyz',sub:'URGENT — account suspension',body:'Your account will be disabled in 10 minutes. Verify your password at campus-login-check.xyz.',ok:false,why:'Look at the domain and the urgency. It is impersonation plus a credential-harvesting link.'},
  {from:'events@campus.edu',sub:'Workshop seat confirmed',body:'Your seat for the security workshop is reserved. Open the official events portal yourself to view details.',ok:true,why:'No attachment, no credential request, and the message points you to the known portal.'},
  {from:'finance@campus.edu',sub:'Fee refund — action required',body:'Reply with your OTP and UPI PIN so the finance team can release your refund today.',ok:false,why:'Legitimate staff never need your OTP or UPI PIN. The request is a classic social-engineering trap.'},
  {from:'library-notice@campus.edu',sub:'Overdue item notice',body:'One item is due tomorrow. Sign in through your normal library bookmark to check the record.',ok:true,why:'The message does not ask for credentials in the email and uses the expected campus domain.'},
  {from:'career-cell@campus.edu',sub:'Placement shortlist',body:'You have been shortlisted. Download the attached .scr file to unlock your interview slot.',ok:false,why:'A .scr attachment is executable content and is highly suspicious in an unsolicited placement message.'}
 ];
 let idx=0;
 const draw=()=>{
  const x=items[idx];
  card(`<div class="round-num">ROUND 01 // PHISH OR FISH? • ${idx+1}/6</div><h2 class="round-title">READ BETWEEN THE LINES.</h2><p class="round-sub">One decision only. A second mistake ends the mission. Look at the domain, request, attachment and urgency.</p><div class="email-box"><div class="email-head">FROM: <b>${x.from}</b><br>SUBJECT: ${x.sub}</div><div>${x.body.replace(/(https?:\/\/[^\s]+)/g,'<span class="redact">$1</span>')}</div></div><div class="options"><button class="choice" data-a="safe"><b>✓ LEGIT</b><p>Allow it through.</p></button><button class="choice" data-a="phish"><b>⚠ PHISHING</b><p>Quarantine the message.</p></button></div><div class="feedback" id="fb"></div>`);
  document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.choice').forEach(z=>z.disabled=true); const correctCall=(b.dataset.a==='safe')===x.ok;
    if(correctCall){b.classList.add('correct');$('#fb').className='feedback good';$('#fb').textContent=`✓ CORRECT  +120  •  ${x.why}`;correct(120)}
    else{b.classList.add('wrong');$('#fb').className='feedback bad';$('#fb').textContent='✕ WRONG CALL — '+x.why;if(!mistake('PHISHING ANALYSIS FAILED'))return;}
    setTimeout(()=>{idx++; if(idx<items.length)draw(); else finishRound()},850);
  });
 };draw();
}

function roundMemory(){
 const packet=`USER      : ADMIN_07\nIP        : 10.42.17.93\nPORTS     : 443 / 8443\nTOKEN     : VX-72-K9\nNODE      : LAB-3\nACTION    : FILE_EXPORT\nHASH      : 9A7F-C21D\nTIME      : 22:14:08`;
 card(`<div class="round-num">ROUND 02 // MEMORY LEAK</div><h2 class="round-title">CACHE THE EVIDENCE.</h2><p class="round-sub">Memorise the packet. Hard mode: only <b>7 seconds</b>, then answer a detail that is easy to confuse.</p><div class="packet"><div class="memory-flash" id="memoryFlash">${packet}</div></div><div class="countdown" id="count">07</div>`);
 let n=7;const c=$('#count');timerId=setInterval(()=>{n--;c.textContent=String(n).padStart(2,'0');if(n<=0){clearInterval(timerId);ask()}},1000);
 function ask(){
  const questions=[['Which node was involved?','LAB-3'],['Which port was NOT listed?','22'],['What was the token?','VX-72-K9'],['What was the hash?','9A7F-C21D'],['Which user appeared?','ADMIN_07'],['What time was recorded?','22:14:08']];
  const q=questions[Math.floor(Math.random()*questions.length)];
  card(`<div class="round-num">ROUND 02 // MEMORY LEAK</div><h2 class="round-title">WHAT DID YOU SEE?</h2><p class="round-sub">The packet is gone. You get exactly one answer.</p><div class="terminal"><span style="color:#777">[PACKET PURGED]</span><br><span style="color:var(--danger)">██ ██ ██ ██ ██ ██</span><br><br>QUERY: <b style="color:var(--yellow)">${q[0]}</b></div><div class="input-row"><input id="answer" class="text-input" autocomplete="off" spellcheck="false" placeholder="TYPE ANSWER"><button class="small-btn" id="submit">VERIFY</button></div><div class="feedback" id="fb"></div>`);
  $('#submit').onclick=()=>{const raw=$('#answer').value.trim().toUpperCase();const ok=raw===q[1].toUpperCase();$('#submit').disabled=true;$('#answer').disabled=true;if(ok){$('#fb').className='feedback good';$('#fb').textContent='✓ MEMORY INTACT  +180';correct(180);setTimeout(finishRound,650)}else{$('#fb').className='feedback bad';$('#fb').textContent=`✕ MEMORY CORRUPTED  •  ANSWER: ${q[1]}`;if(mistake('MEMORY EVIDENCE LOST'))setTimeout(finishRound,700)}};
 }
}

function roundForensics(){
 const events=[['09:14','LOGIN SUCCESS'],['09:17','USB CONNECTED'],['09:21','PASSWORD RESET'],['09:23','FILE EXPORT'],['09:26','PRIVILEGE ESCALATION'],['09:28','LOGOUT']];
 const shuffled=[...events].sort(()=>Math.random()-.5);let selected=[];
 card(`<div class="round-num">ROUND 03 // DIGITAL FORENSICS</div><h2 class="round-title">REBUILD THE ATTACK.</h2><p class="round-sub">Tap the evidence in chronological order. One wrong selection counts as your one allowed mistake.</p><div class="timeline" id="timeline"></div><div class="feedback" id="fb"></div>`);
 shuffled.forEach((e,i)=>{const b=document.createElement('button');b.className='event-card';b.innerHTML=`<div class="time">${e[0]}</div><div class="evt">${e[1]}</div>`;b.onclick=()=>{
   if(selected.includes(i))return; const expectedIndex=selected.length; selected.push(i); b.classList.add('selected'); beep(500+i*70,.05);
   if(e[0]!==events[expectedIndex][0]){
     $('#fb').className='feedback bad';$('#fb').textContent='✕ TIMELINE BREAK — '+events[expectedIndex][0]+' SHOULD COME NEXT';
     document.querySelectorAll('.event-card').forEach(z=>z.disabled=true);
     if(mistake('FORENSIC TIMELINE BROKEN'))setTimeout(finishRound,700); return;
   }
   if(selected.length===events.length){$('#fb').className='feedback good';$('#fb').textContent='✓ ATTACK CHAIN RECONSTRUCTED  +260';correct(260);setTimeout(finishRound,650)}
 };$('#timeline').appendChild(b)})
}

function roundNetwork(){
 const nodes=[{n:'GATE',x:10,y:43,infected:false},{n:'LAB-A',x:31,y:18,infected:true},{n:'DB',x:55,y:12,infected:false},{n:'ADMIN',x:78,y:27,infected:true},{n:'LAB-B',x:38,y:72,infected:false},{n:'CAM',x:12,y:76,infected:false},{n:'VAULT',x:72,y:75,infected:true},{n:'DNS',x:88,y:57,infected:false},{n:'MAIL',x:55,y:52,infected:true}];
 card(`<div class="round-num">ROUND 04 // BREACH CONTROL</div><h2 class="round-title">CUT THE WIRES.</h2><p class="round-sub">Hard mode: <b>4 compromised nodes</b>, 18 seconds, 9 possible targets. Isolate the red nodes. A false positive is a strike.</p><div class="timer" id="netTimer">18</div><div class="network" id="network"></div><div class="feedback" id="fb"></div>`);
 const net=$('#network');let isolated=0;nodes.forEach((n)=>{const el=document.createElement('button');el.className='node '+(n.infected?'infected':'decoy');el.style.left=n.x+'%';el.style.top=n.y+'%';el.innerHTML=`<span>${n.n}</span>`;el.onclick=()=>{if(el.classList.contains('isolated'))return;if(n.infected){el.classList.remove('infected');el.classList.add('isolated');el.querySelector('span').textContent='CUT';success();isolated++;if(isolated===4){clearInterval(timerId);$('#fb').className='feedback good';$('#fb').textContent='✓ BREACH CONTAINED  +320';correct(320);setTimeout(finishRound,650)}}else{el.disabled=true;el.classList.add('decoy-hit');$('#fb').className='feedback bad';$('#fb').textContent='✕ FALSE POSITIVE — SERVICE DISRUPTED';mistake('NETWORK FALSE POSITIVE')}};net.appendChild(el)});
 for(let i=0;i<9;i++){const l=document.createElement('div');l.className='netline';l.style.left=(9+i*8)+'%';l.style.top=(20+(i%4)*17)+'%';l.style.width=(85-i*5)+'px';l.style.transform=`rotate(${i%2?18:-13}deg)`;net.appendChild(l)}
 let n=18;timerId=setInterval(()=>{n--;$('#netTimer').textContent=n;if(n<=5)$('#netTimer').classList.add('danger');if(n<=0){clearInterval(timerId);if(isolated<4){$('#fb').className='feedback bad';$('#fb').textContent='✕ BREACH ESCAPED — TIMEOUT';if(mistake('BREACH RESPONSE TIMEOUT'))setTimeout(finishRound,700)}}},1000)
}

function roundCipher(){
 const puzzles=[
  {enc:'RSHQ WKH JDWH',ans:'OPEN THE GATE'},
  {enc:'WUXVW QR OLQN',ans:'TRUST NO LINK'},
  {enc:'SDWFK WKH QRGH',ans:'PATCH THE NODE'}
 ];
 let idx=0;
 const draw=()=>{const p=puzzles[idx];card(`<div class="round-num">ROUND 05 // THE VSP PROTOCOL • ${idx+1}/3</div><h2 class="round-title">BREAK THE LAST LAYER.</h2><p class="round-sub">Three fragments. Shift every letter <b>3 steps back</b>. No second attempt.</p><div class="cipher">${p.enc}</div><div class="input-row"><input id="answer" class="text-input" autocomplete="off" spellcheck="false" placeholder="DECODE MESSAGE"><button class="small-btn" id="submit">EXECUTE</button></div><div class="feedback" id="fb"></div>`);$('#submit').onclick=()=>{const ok=$('#answer').value.trim().toUpperCase()===p.ans;$('#submit').disabled=true;$('#answer').disabled=true;if(ok){$('#fb').className='feedback good';$('#fb').textContent='✓ LAYER BROKEN  +140';correct(140);setTimeout(()=>{idx++;if(idx<puzzles.length)draw();else finishRound()},650)}else{$('#fb').className='feedback bad';$('#fb').textContent=`✕ ACCESS DENIED  •  ${p.ans}`;if(mistake('FINAL PROTOCOL ERROR'))setTimeout(()=>{idx++;if(idx<puzzles.length)draw();else missionFailed('FINAL PROTOCOL INCOMPLETE')},700)}}};draw();
}

function missionFailed(reason){
 clearInterval(timerId);timerId=null;game.classList.remove('active');win.classList.remove('active');failScreen.classList.add('active');
 document.querySelectorAll('#fail button').forEach(b=>b.remove());
 $('#failScore').textContent=pad(score);$('#failMistakes').textContent=`${mistakes} / 2`;$('#failReason').textContent=reason;
 alarm();
}
function finishGame(){clearInterval(timerId);game.classList.remove('active');failScreen.classList.remove('active');win.classList.add('active');$('#finalScore').textContent=pad(score);const rank=score>=1450?'VSP ELITE':score>=1100?'THREAT HUNTER':score>=800?'CYBER OPERATIVE':'CYBER CADET';$('#finalRank').textContent=rank;$('#medalText').textContent=score>=1450?'◇ ZERO-DAY LEGEND ◇':score>=1100?'◇ THREAT HUNTER ◇':'◇ CYBER OPERATIVE ◇';if(score>best){best=score;localStorage.setItem('vsp29-best',best);$('#bestScore').textContent=pad(best)}chime();makeConfetti()}
function makeConfetti(){const c=$('#confetti');c.innerHTML='';for(let i=0;i<90;i++){const p=document.createElement('i');p.className='confetti-piece';p.style.left=Math.random()*100+'%';p.style.animationDelay=(Math.random()*1.5)+'s';p.style.background=['#ff39cf','#35f4ff','#ffe45e','#a83cff','#6dff9b'][i%5];p.style.transform=`rotate(${Math.random()*360}deg)`;c.appendChild(p)}}
