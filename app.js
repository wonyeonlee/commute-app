const SETTINGS_KEY='attendanceAppV2';
const HISTORY_KEY='attendanceHistoryV2';

const defaultSettings={
  employeeName:'',
  workplaceName:'가축위생방역지원본부 충북도본부',
  workplaceAddress:'',
  lat:'',
  lng:'',
  radius:100,
  checkinTime:'08:50',
  checkoutTime:'18:00',
  alarmDays:[1,2,3,4,5]
};

function $(id){return document.getElementById(id)}
function loadSettings(){
  try{return {...defaultSettings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}
  catch(e){return {...defaultSettings}}
}
function saveSettings(s){localStorage.setItem(SETTINGS_KEY,JSON.stringify(s))}
function loadHistory(){
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}
  catch(e){return []}
}
function saveHistory(h){localStorage.setItem(HISTORY_KEY,JSON.stringify(h))}
function localDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function localTime(){return new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}
function toast(msg){const t=$('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2200)}
function haversine(lat1,lon1,lat2,lon2){
  const R=6371000,rad=Math.PI/180;
  const dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a))
}

function showPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target=$('page-'+name);
  if(target) target.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  if(name==='history') renderHistory();
  if(name==='home') renderToday();
  window.scrollTo(0,0);
}

function fillSettings(){
  const s=loadSettings();
  $('employee-name').value=s.employeeName||'';
  $('workplace-name').value=s.workplaceName||'';
  $('workplace-address').value=s.workplaceAddress||'';
  $('lat').value=s.lat||'';
  $('lng').value=s.lng||'';
  $('lat-view').textContent=s.lat||'미등록';
  $('lng-view').textContent=s.lng||'미등록';
  $('radius').value=s.radius||100;
  $('checkin-time').value=s.checkinTime||'08:50';
  $('checkout-time').value=s.checkoutTime||'18:00';
  document.querySelectorAll('.day-check').forEach(c=>c.checked=(s.alarmDays||[1,2,3,4,5]).map(Number).includes(Number(c.value)));
  updateDaySummary();

  $('hello').textContent=s.employeeName
    ? `${s.employeeName}님, 오늘도 인증 누락을 확인해 주세요.`
    : '오늘의 출퇴근 인증을 잊지 않도록 확인해 주세요.';

  $('home-in-time').textContent=s.checkinTime||'08:50';
  $('home-out-time').textContent=s.checkoutTime||'18:00';
  $('home-workplace').textContent=s.workplaceName||'근무지 미등록';
  $('home-address').textContent=s.workplaceAddress||'주소 미등록';
}

function setAlarmDays(days){
  document.querySelectorAll('.day-check').forEach(c=>c.checked=days.includes(Number(c.value)));
  updateDaySummary();
}
function updateDaySummary(){
  const names=['일','월','화','수','목','금','토'];
  const days=Array.from(document.querySelectorAll('.day-check:checked')).map(c=>Number(c.value));
  days.sort((a,b)=>a-b);
  const el=$('day-summary');
  if(!el)return;
  el.textContent='현재 선택: '+(days.length?days.map(d=>names[d]).join(' · '):'없음');
}
function saveForm(){
  const s={
    employeeName:$('employee-name').value.trim(),
    workplaceName:$('workplace-name').value.trim(),
    workplaceAddress:$('workplace-address').value.trim(),
    lat:$('lat').value,
    lng:$('lng').value,
    radius:Number($('radius').value)||100,
    checkinTime:$('checkin-time').value||'08:50',
    checkoutTime:$('checkout-time').value||'18:00',
    alarmDays:Array.from(document.querySelectorAll('.day-check:checked')).map(c=>Number(c.value))
  };
  saveSettings(s);
  fillSettings();
  toast('설정을 저장했습니다.');
  $('settings-msg').textContent='저장 완료';
}

function registerGPS(){
  if(!navigator.geolocation){toast('이 기기에서 GPS를 사용할 수 없습니다.');return}
  $('settings-msg').textContent='현재 위치를 확인하는 중입니다…';
  navigator.geolocation.getCurrentPosition(pos=>{
    $('lat').value=pos.coords.latitude.toFixed(7);
    $('lng').value=pos.coords.longitude.toFixed(7);
    $('lat-view').textContent=$('lat').value;
    $('lng-view').textContent=$('lng').value;
    $('settings-msg').textContent='위치를 등록했습니다. 주소는 바로 아래 주소란에 입력해 주세요.';
    toast('현재 위치를 근무지 위치로 등록했습니다.');
  },()=>{
    $('settings-msg').textContent='위치 정보를 가져오지 못했습니다. 브라우저 위치 권한을 확인해 주세요.';
    toast('GPS 위치 확인에 실패했습니다.');
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function certify(type){
  const s=loadSettings();
  if(!s.lat||!s.lng){toast('설정에서 먼저 근무지 위치를 등록해 주세요.');showPage('settings');return}
  if(!navigator.geolocation){toast('GPS를 사용할 수 없습니다.');return}

  $('gps-result').textContent='현재 위치를 확인하는 중입니다…';
  navigator.geolocation.getCurrentPosition(pos=>{
    const distance=Math.round(haversine(Number(s.lat),Number(s.lng),pos.coords.latitude,pos.coords.longitude));
    if(distance>Number(s.radius)){
      $('gps-result').textContent=`인증 확인 실패 · 근무지에서 ${distance}m · 허용 ${s.radius}m`;
      return;
    }

    const date=localDate(),time=localTime(),h=loadHistory();
    let row=h.find(x=>x.date===date);
    if(!row){
      row={date,employeeName:s.employeeName,checkIn:'',checkOut:'',inDistance:'',outDistance:'',lat:'',lng:''};
      h.unshift(row);
    }
    if(type==='in'){row.checkIn=time;row.inDistance=distance}
    else {row.checkOut=time;row.outDistance=distance}
    row.lat=pos.coords.latitude.toFixed(7);
    row.lng=pos.coords.longitude.toFixed(7);
    saveHistory(h.slice(0,500));

    $('gps-result').textContent=`${type==='in'?'출근':'퇴근'} 확인 완료 · 거리 ${distance}m · ${time}`;
    renderToday();renderHistory();
    toast(`${type==='in'?'출근':'퇴근'} 확인이 완료되었습니다.`);
  },()=>{
    $('gps-result').textContent='GPS 확인 실패 · 위치 권한을 확인해 주세요.';
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function renderToday(){
  const date=localDate(),row=loadHistory().find(x=>x.date===date);
  $('today-in').textContent=row?.checkIn||'미확인';
  $('today-out').textContent=row?.checkOut||'미확인';
}

function renderHistory(){
  const list=$('history-list'),h=loadHistory();
  if(!h.length){list.innerHTML='<p class="muted">아직 인증 기록이 없습니다.</p>';return}
  list.innerHTML=h.slice(0,30).map(r=>`
    <div class="record">
      <b>${r.date}</b>
      <div>출근: ${r.checkIn||'미확인'} ${r.inDistance!==''?`· ${r.inDistance}m`:''}</div>
      <div>퇴근: ${r.checkOut||'미확인'} ${r.outDistance!==''?`· ${r.outDistance}m`:''}</div>
    </div>`).join('');
}

function csvDownload(){
  const h=loadHistory();
  if(!h.length){toast('다운로드할 기록이 없습니다.');return}
  const rows=[['날짜','출근','출근거리(m)','퇴근','퇴근거리(m)','확인위도','확인경도'],
    ...h.map(r=>[r.date,r.checkIn,r.inDistance,r.checkOut,r.outDistance,r.lat,r.lng])];
  const csv='\ufeff'+rows.map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='출퇴근누락방지기록.csv';a.click();URL.revokeObjectURL(url);
}

function clearHistory(){
  if(confirm('모든 개인 인증 기록을 삭제할까요?')){
    localStorage.removeItem(HISTORY_KEY);renderHistory();renderToday();toast('기록을 삭제했습니다.')
  }
}

async function notify(){
  if(!('Notification'in window)){toast('이 브라우저는 알림을 지원하지 않습니다.');return}
  const p=await Notification.requestPermission();
  toast(p==='granted'?'알림 권한이 허용되었습니다.':'알림 권한이 허용되지 않았습니다.');
}

function testNotify(){
  if('Notification'in window&&Notification.permission==='granted'){
    new Notification('출퇴근 누락방지 알림',{body:'알림 테스트입니다. 기존 출퇴근 시스템의 인증을 확인해 주세요.'});
  }else toast('먼저 알림 권한을 요청해 주세요.');
}

function scheduleCheck(){
  const now=new Date(), day=now.getDay();
  const s=loadSettings();
  if(!(s.alarmDays||[1,2,3,4,5]).map(Number).includes(day))return;
  if(!('Notification'in window)||Notification.permission!=='granted')return;
  const current=now.getHours()*60+now.getMinutes();
  const dateKey=now.toLocaleDateString('ko-KR');
  const checkAlarm=(time,type,suffix)=>{
    if(!time)return;
    const [h,m]=time.split(':').map(Number), target=h*60+m;
    // 앱이 정확히 그 순간 실행되지 않아도 같은 분 또는 직전 2분 내에는 1회 알림
    if(current>=target && current<=target+2){
      const key='alarm_'+dateKey+'_'+suffix;
      if(localStorage.getItem(key)!=='1'){
        localStorage.setItem(key,'1');
        new Notification(type==='in'?'출근 인증 알림':'퇴근 인증 알림',{body:(type==='in'?'출근':'퇴근')+' 인증을 해주세요. 기존 출퇴근 시스템에서 인증을 확인해 주세요.'});
      }
    }
  };
  checkAlarm(s.checkinTime,'in','in');
  checkAlarm(s.checkoutTime,'out','out');
}