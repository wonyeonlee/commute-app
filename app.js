const SETTINGS_KEY='attendanceAppV1';
const HISTORY_KEY='attendanceHistoryV1';
const defaultSettings={employeeName:'',employeeId:'',workplaceName:'가축위생방역지원본부 충북도본부',lat:'',lng:'',radius:100};

function $(id){return document.getElementById(id)}
function loadSettings(){try{return {...defaultSettings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch(e){return {...defaultSettings}}}
function saveSettings(s){localStorage.setItem(SETTINGS_KEY,JSON.stringify(s))}
function loadHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch(e){return []}}
function saveHistory(h){localStorage.setItem(HISTORY_KEY,JSON.stringify(h))}
function localDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function localTime(){return new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}
function toast(msg){const t=$('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2200)}
function haversine(lat1,lon1,lat2,lon2){const R=6371000,rad=Math.PI/180;const dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;const a=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a))}

function showPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target=$('page-'+name); if(target) target.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  if(name==='history') renderHistory();
  if(name==='admin') renderStats();
  if(name==='home') renderToday();
  window.scrollTo(0,0);
}

function fillSettings(){
 const s=loadSettings();
 $('employee-name').value=s.employeeName||'';
 $('employee-id').value=s.employeeId||'';
 $('workplace-name').value=s.workplaceName||defaultSettings.workplaceName;
 $('lat').value=s.lat||'';
 $('lng').value=s.lng||'';
 $('radius').value=s.radius||100;
 $('hello').textContent=s.employeeName?`${s.employeeName}님, 오늘도 안전하게 인증해 주세요.`:'직원 정보를 설정해 주세요.';
}
function saveForm(){
 const s={employeeName:$('employee-name').value.trim(),employeeId:$('employee-id').value.trim(),workplaceName:$('workplace-name').value.trim(),lat:$('lat').value,lng:$('lng').value,radius:Number($('radius').value)||100};
 saveSettings(s);fillSettings();toast('설정을 저장했습니다.');$('settings-msg').textContent='저장 완료';
}
function registerGPS(){
 if(!navigator.geolocation){toast('이 기기에서 GPS를 사용할 수 없습니다.');return}
 navigator.geolocation.getCurrentPosition(pos=>{
   $('lat').value=pos.coords.latitude.toFixed(7);$('lng').value=pos.coords.longitude.toFixed(7);saveForm();toast('현재 위치를 근무지로 등록했습니다.');
 },()=>toast('위치 정보를 가져오지 못했습니다. 브라우저 위치 권한을 확인해 주세요.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function certify(type){
 const s=loadSettings();
 if(!s.employeeName||!s.employeeId){toast('먼저 설정에서 직원명과 직원번호를 입력해 주세요.');showPage('settings');return}
 if(!s.lat||!s.lng){toast('먼저 근무지 위치를 등록해 주세요.');showPage('settings');return}
 if(!navigator.geolocation){toast('GPS를 사용할 수 없습니다.');return}
 $('gps-result').textContent='현재 위치를 확인하는 중입니다…';
 navigator.geolocation.getCurrentPosition(pos=>{
   const distance=Math.round(haversine(Number(s.lat),Number(s.lng),pos.coords.latitude,pos.coords.longitude));
   if(distance>Number(s.radius)){ $('gps-result').textContent=`인증 실패: 근무지에서 ${distance}m 떨어져 있습니다. (허용 ${s.radius}m)`;return}
   const date=localDate(),time=localTime(),h=loadHistory();
   let row=h.find(x=>x.date===date&&x.employeeId===s.employeeId);
   if(!row){row={date,employeeName:s.employeeName,employeeId:s.employeeId,checkIn:'',checkOut:'',inDistance:'',outDistance:'',lat:'',lng:''};h.unshift(row)}
   if(type==='in')row.checkIn=time,row.inDistance=distance;else row.checkOut=time,row.outDistance=distance;
   row.lat=pos.coords.latitude.toFixed(7);row.lng=pos.coords.longitude.toFixed(7);
   saveHistory(h.slice(0,500));
   $('gps-result').textContent=`${type==='in'?'출근':'퇴근'} 인증 완료 · 거리 ${distance}m · ${time}`;
   renderToday();renderHistory();renderStats();toast('인증이 완료되었습니다.');
 },()=>{$('gps-result').textContent='GPS 인증 실패: 위치 권한을 확인해 주세요.'},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function renderToday(){
 const s=loadSettings(),date=localDate(),row=loadHistory().find(x=>x.date===date&&x.employeeId===s.employeeId);
 $('today-in').textContent=row?.checkIn||'미인증';$('today-out').textContent=row?.checkOut||'미인증';
}
function renderHistory(){
 const list=$('history-list'),h=loadHistory();
 if(!h.length){list.innerHTML='<p class="muted">아직 인증 기록이 없습니다.</p>';return}
 list.innerHTML=h.slice(0,20).map(r=>`<div class="record"><b>${r.date} · ${r.employeeName||'-'} (${r.employeeId||'-'})</b><div>출근: ${r.checkIn||'미인증'} ${r.inDistance!==''?`· ${r.inDistance}m`:''}</div><div>퇴근: ${r.checkOut||'미인증'} ${r.outDistance!==''?`· ${r.outDistance}m`:''}</div></div>`).join('');
}
function renderStats(){
 const h=loadHistory();
 $('stat-days').textContent=new Set(h.map(x=>x.date)).size;
 $('stat-in').textContent=h.filter(x=>x.checkIn).length;
 $('stat-out').textContent=h.filter(x=>x.checkOut).length;
 const by={};
 h.forEach(r=>{const k=r.employeeId||'미등록';if(!by[k])by[k]={name:r.employeeName||'-',id:k,days:0,ins:0,outs:0};by[k].days++;if(r.checkIn)by[k].ins++;if(r.checkOut)by[k].outs++;});
 const rows=Object.values(by);
 const box=$('employee-summary'); if(box) box.innerHTML=rows.length
 ? '<div class="admin-table">'+rows.map(r=>`<div class="admin-row"><b>${r.name}</b><span>${r.id}</span><span>기록 ${r.days}일</span><span>출근 ${r.ins}</span><span>퇴근 ${r.outs}</span></div>`).join('')+'</div>'
 : '<p class="muted">아직 기록이 없습니다.</p>';
}
function csvDownload(){
 const h=loadHistory();if(!h.length){toast('다운로드할 기록이 없습니다.');return}
 const rows=[['날짜','직원명','직원번호','출근','출근거리(m)','퇴근','퇴근거리(m)','위도','경도'],...h.map(r=>[r.date,r.employeeName,r.employeeId,r.checkIn,r.inDistance,r.checkOut,r.outDistance,r.lat,r.lng])];
 const csv='\ufeff'+rows.map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='출퇴근인증기록.csv';a.click();URL.revokeObjectURL(url);
}
function clearHistory(){if(confirm('모든 인증 기록을 삭제할까요?')){localStorage.removeItem(HISTORY_KEY);renderHistory();renderStats();renderToday();toast('기록을 삭제했습니다.')}}
async function notify(){
 if(!('Notification'in window)){toast('이 브라우저는 알림을 지원하지 않습니다.');return}
 const p=await Notification.requestPermission();toast(p==='granted'?'알림 권한이 허용되었습니다.':'알림 권한이 허용되지 않았습니다.');
}
function testNotify(){if('Notification'in window&&Notification.permission==='granted'){new Notification('출퇴근 인증 알림',{body:'알림 테스트입니다. 출근/퇴근 인증을 확인해 주세요.'});}else toast('먼저 알림 권한을 요청해 주세요.')}
function scheduleCheck(){
 const now=new Date(),day=now.getDay();if(day===0||day===6)return;
 const key='notified_'+localDate(),h=now.getHours(),m=now.getMinutes();
 if(h===8&&m===50&&localStorage.getItem(key+'_in')!=='1'&&Notification.permission==='granted'){new Notification('출근 인증 알림',{body:'출근 인증을 해주세요.'});localStorage.setItem(key+'_in','1')}
 if(h===18&&m===0&&localStorage.getItem(key+'_out')!=='1'&&Notification.permission==='granted'){new Notification('퇴근 인증 알림',{body:'퇴근 인증을 해주세요.'});localStorage.setItem(key+'_out','1')}
}

document.addEventListener('DOMContentLoaded',()=>{
  // Robust event delegation: bottom navigation keeps working even if DOM changes.
  document.addEventListener('click',e=>{
    const b=e.target.closest('.nav-btn');
    if(b){e.preventDefault();e.stopPropagation();showPage(b.dataset.page);return}
  });
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
  $('btn-checkin').addEventListener('click',()=>certify('in'));
  $('btn-checkout').addEventListener('click',()=>certify('out'));
  $('btn-save').addEventListener('click',saveForm);
  $('btn-register-gps').addEventListener('click',registerGPS);
  $('btn-csv').addEventListener('click',csvDownload);
  $('btn-csv-admin').addEventListener('click',csvDownload);
  $('btn-clear').addEventListener('click',clearHistory);
  $('btn-notify').addEventListener('click',notify);
  $('btn-test-notify').addEventListener('click',testNotify);
  fillSettings();renderToday();renderHistory();renderStats();scheduleCheck();
  setInterval(scheduleCheck,30000);
  if('serviceWorker'in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
});
