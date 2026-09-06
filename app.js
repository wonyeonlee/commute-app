const KEY='attendanceAppStable1', HIST='attendanceHistoryStable1';
const DEF={employeeName:'',workplaceName:'가축위생방역지원본부 충북도본부',lat:'',lng:'',radius:100,workTime:'08:50',offTime:'18:00',days:[1,2,3,4,5]};
const $=id=>document.getElementById(id); const settings=()=>{try{return {...DEF,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...DEF}}};
const saveS=s=>localStorage.setItem(KEY,JSON.stringify(s)); const hist=()=>{try{return JSON.parse(localStorage.getItem(HIST)||'[]')}catch{return []}}; const saveH=h=>localStorage.setItem(HIST,JSON.stringify(h));
function date(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`} function time(){return new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}
function toast(x){const t=$('toast');t.textContent=x;t.style.display='block';setTimeout(()=>t.style.display='none',2500)} function min(x){const [h,m]=x.split(':').map(Number);return h*60+m}
function dist(a,b,c,d){const R=6371000,r=Math.PI/180,dl=(c-a)*r,dn=(d-b)*r;const x=Math.sin(dl/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function showPage(n){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$('page-'+n)?.classList.add('active');document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===n));if(n==='history')renderHistory();if(n==='home')renderToday();scrollTo(0,0)}
function fill(){const s=settings();$('employee-name').value=s.employeeName||'';$('workplace-name').value=s.workplaceName||DEF.workplaceName;$('lat').value=s.lat||'';$('lng').value=s.lng||'';$('radius').value=s.radius||100;$('work-time').value=s.workTime||'08:50';$('off-time').value=s.offTime||'18:00';document.querySelectorAll('.day').forEach(x=>x.checked=(s.days||DEF.days).map(Number).includes(Number(x.value)));$('hello').textContent=s.employeeName?`${s.employeeName}님, 오늘도 인증을 확인해 주세요.`:'설정에서 이름과 근무지를 등록해 주세요.';updateNotifyStatus();updateNext()}
function saveForm(){const s={employeeName:$('employee-name').value.trim(),workplaceName:$('workplace-name').value.trim(),lat:$('lat').value,lng:$('lng').value,radius:Number($('radius').value)||100,workTime:$('work-time').value||'08:50',offTime:$('off-time').value||'18:00',days:[...document.querySelectorAll('.day:checked')].map(x=>Number(x.value))};saveS(s);fill();$('settings-msg').textContent='저장 완료';toast('설정을 저장했습니다.')}
function setDays(a){document.querySelectorAll('.day').forEach(x=>x.checked=a.includes(Number(x.value)))}
function registerGPS(){if(!navigator.geolocation)return toast('이 기기에서 GPS를 사용할 수 없습니다.');navigator.geolocation.getCurrentPosition(p=>{$('lat').value=p.coords.latitude.toFixed(7);$('lng').value=p.coords.longitude.toFixed(7);saveForm();toast('현재 위치를 근무지로 등록했습니다.')},()=>toast('위치 권한을 확인해 주세요.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0})}
function certify(type){const s=settings();if(!s.lat||!s.lng){toast('먼저 설정에서 근무지 위치를 등록해 주세요.');showPage('settings');return}if(!navigator.geolocation)return toast('GPS를 사용할 수 없습니다.');const out=type==='in'?'gps-result':'gps-result-2';$(out).textContent='현재 위치 확인 중…';navigator.geolocation.getCurrentPosition(p=>{const d=Math.round(dist(Number(s.lat),Number(s.lng),p.coords.latitude,p.coords.longitude));if(d>Number(s.radius)){$(out).textContent=`인증 실패 · 근무지에서 ${d}m · 허용 ${s.radius}m`;return}const h=hist(),today=date();let r=h.find(x=>x.date===today);if(!r){r={date:today,employeeName:s.employeeName,checkIn:'',checkOut:'',inDistance:'',outDistance:''};h.unshift(r)}if(type==='in'){r.checkIn=time();r.inDistance=d}else{r.checkOut=time();r.outDistance=d}r.lat=p.coords.latitude.toFixed(7);r.lng=p.coords.longitude.toFixed(7);saveH(h.slice(0,500));$(out).textContent=`${type==='in'?'출근':'퇴근'} 인증 완료 · ${d}m · ${time()}`;renderToday();renderHistory();toast('인증이 완료되었습니다.')},()=>$(out).textContent='GPS 인증 실패 · 위치 권한을 확인해 주세요.',{enableHighAccuracy:true,timeout:15000,maximumAge:0})}
function renderToday(){const r=hist().find(x=>x.date===date());$('today-in').textContent=r?.checkIn||'미인증';$('today-out').textContent=r?.checkOut||'미인증'}
function renderHistory(){const h=hist();$('history-list').innerHTML=h.length?h.slice(0,30).map(r=>`<div class="record"><b>${r.date}</b><div>출근: ${r.checkIn||'미인증'}${r.inDistance!==''?` · ${r.inDistance}m`:''}</div><div>퇴근: ${r.checkOut||'미인증'}${r.outDistance!==''?` · ${r.outDistance}m`:''}</div></div>`).join(''):'<p class="muted">아직 인증 기록이 없습니다.</p>'}
function csv(){const h=hist();if(!h.length)return toast('다운로드할 기록이 없습니다.');const rows=[['날짜','이름','출근','출근거리','퇴근','퇴근거리'],...h.map(r=>[r.date,r.employeeName,r.checkIn,r.inDistance,r.checkOut,r.outDistance])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='출퇴근인증기록.csv';a.click();URL.revokeObjectURL(u)}
async function notifyPermission(){if(!('Notification'in window))return toast('이 브라우저는 웹 알림을 지원하지 않습니다.');const p=await Notification.requestPermission();updateNotifyStatus();toast(p==='granted'?'알림 권한이 허용되었습니다.':'알림 권한이 허용되지 않았습니다.')}
async function testNotify(){if(!('Notification'in window))return toast('웹 알림을 지원하지 않습니다.');if(Notification.permission!=='granted'){const p=await Notification.requestPermission();if(p!=='granted')return toast('알림 권한을 먼저 허용해 주세요.')}try{const reg=await navigator.serviceWorker.ready;await reg.showNotification('🔔 출퇴근 알림 테스트',{body:'알림이 정상적으로 표시되는지 확인해 주세요.',tag:'attendance-test'});toast('알림을 보냈습니다.')}catch(e){try{new Notification('🔔 출퇴근 알림 테스트',{body:'알림 테스트입니다.'});toast('알림을 보냈습니다.')}catch{toast('알림 전송에 실패했습니다.')}}}
function updateNotifyStatus(){const p='Notification'in window?Notification.permission:'지원 안 함';$('notify-status').textContent=`알림 권한: ${p}`}
function updateNext(){const s=settings(),d=new Date(),wd=d.getDay(),ok=(s.days||[]).map(Number).includes(wd);$('next-alarm').textContent=ok?`오늘 알림: 출근 ${s.workTime} / 퇴근 ${s.offTime}`:`오늘은 알림 요일이 아닙니다. (설정한 요일 기준)`}
async function sendScheduledNotification(type,k){
  const title=type==='in'?'⏰ 출근 인증 알림':'🏠 퇴근 인증 알림';
  const body=type==='in'?'출근 인증을 해주세요.':'퇴근 인증을 해주세요.';
  try{
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification(title,{body,tag:`attendance-${k}-${type}`,renotify:true});
      return true;
    }
  }catch(e){}
  try{new Notification(title,{body,tag:`attendance-${k}-${type}`});return true}catch(e){return false}
}
function schedule(){
  const s=settings(),d=new Date(),wd=d.getDay();
  if(!(s.days||[]).map(Number).includes(wd)||!('Notification'in window)||Notification.permission!=='granted')return;
  const k=date(), nowMin=d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
  for(const [type,t] of [['in',s.workTime],['out',s.offTime]]){
    const target=min(t);
    // 예약시각을 조금 지나 앱이 깨어난 경우도 놓치지 않도록 2분 동안 인정
    if(nowMin>=target && nowMin<target+2 && localStorage.getItem(`sent_${k}_${type}`)!=='1'){
      localStorage.setItem(`sent_${k}_${type}`,'1');
      sendScheduledNotification(type,k);
    }
  }
}

function init(){document.addEventListener('click',e=>{const b=e.target.closest('.nav-btn');if(b)showPage(b.dataset.page)});$('btn-checkin').onclick=()=>certify('in');$('btn-checkout').onclick=()=>certify('out');$('btn-checkin-2').onclick=()=>certify('in');$('btn-checkout-2').onclick=()=>certify('out');$('btn-save').onclick=saveForm;$('btn-register-gps').onclick=registerGPS;$('btn-csv').onclick=csv;$('btn-clear').onclick=()=>{if(confirm('모든 인증 기록을 삭제할까요?')){localStorage.removeItem(HIST);renderHistory();renderToday();toast('기록을 삭제했습니다.')}};$('btn-notify').onclick=notifyPermission;$('btn-test-notify').onclick=testNotify;$('days-week').onclick=()=>setDays([1,2,3,4,5]);$('days-all').onclick=()=>setDays([0,1,2,3,4,5,6]);$('days-none').onclick=()=>setDays([]);fill();renderToday();renderHistory();schedule();setInterval(schedule,15000);if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js?v=stable1',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});}
document.addEventListener('DOMContentLoaded',init);
