// ===== 5단계: 예약 알림 + 안정성 개선 =====
const KEY="attendanceAppV1";
let alarmTimer=null;
let refreshTimer=null;

const $=id=>document.getElementById(id);

function localDateKey(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isWeekday(d=new Date()){
  const n=d.getDay(); return n>=1 && n<=5;
}
function loadSettings(){
  return JSON.parse(localStorage.getItem(KEY)||"{}");
}
function saveSettingsObj(d){
  localStorage.setItem(KEY,JSON.stringify(d));
}
function timeToDate(value, base=new Date()){
  const [h,m]=String(value||"00:00").split(":").map(Number);
  const t=new Date(base); t.setHours(h||0,m||0,0,0); return t;
}

async function requestNotificationPermission(){
  if(!("Notification" in window)){
    alert("이 브라우저는 알림 기능을 지원하지 않습니다."); return false;
  }
  const p=await Notification.requestPermission();
  updateNotificationStatus();
  if(p==="granted"){
    alert("알림 권한이 허용되었습니다.");
    scheduleLocalAlarms();
    return true;
  }
  alert("알림 권한이 허용되지 않았습니다. Chrome의 사이트 알림 설정을 확인해주세요.");
  return false;
}
function updateNotificationStatus(){
  const el=$("notificationStatus"); if(!el) return;
  if(!("Notification" in window)){el.textContent="이 브라우저는 알림 기능을 지원하지 않습니다.";return;}
  el.textContent=Notification.permission==="granted" ? "✅ 알림 허용됨" :
    Notification.permission==="denied" ? "⛔ 알림 차단됨" : "⚠️ 알림 권한 필요";
}
async function notify(title,body,tag){
  try{
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification(title,{body,icon:"./icon-192.png",badge:"./icon-192.png",tag,data:{url:"./"}});
    return true;
  }catch(e){
    try{new Notification(title,{body});return true;}catch(_){return false;}
  }
}
async function showTestNotification(){
  if(!("Notification" in window)) return alert("이 브라우저는 알림 기능을 지원하지 않습니다.");
  if(Notification.permission!=="granted" && !(await requestNotificationPermission())) return;
  await notify("출퇴근 인증 알림","알림 테스트가 정상적으로 작동합니다.","commute-test");
}

function nextAlarmInfo(){
  const s=loadSettings(), now=new Date(), candidates=[];
  const inTime=s.inAlarm||"08:50", outTime=s.outAlarm||"17:50";
  if(isWeekday(now)){
    for(const [kind,label,value,title] of [
      ["in","출근",inTime,"출근 인증을 해주세요."],
      ["out","퇴근",outTime,"퇴근 인증을 해주세요."]
    ]){
      const t=timeToDate(value,now);
      if(t>now)candidates.push({kind,label,value,title,time:t});
    }
  }
  if(!candidates.length){
    let d=new Date(now); d.setDate(d.getDate()+1);
    while(!isWeekday(d)) d.setDate(d.getDate()+1);
    const t=timeToDate(inTime,d);
    return {kind:"in",label:"출근",value:inTime,title:"출근 인증을 해주세요.",time:t};
  }
  candidates.sort((a,b)=>a.time-b.time);
  return candidates[0];
}
function getNextAlarmText(){
  const n=nextAlarmInfo();
  const diff=Math.max(0,n.time-new Date());
  const mins=Math.floor(diff/60000), hrs=Math.floor(mins/60), rem=mins%60;
  const remain=hrs?`${hrs}시간 ${rem}분 후`:`${rem}분 후`;
  return `다음 알림: ${n.label} ${n.value} (${remain})`;
}
function updateNextAlarm(){
  const el=$("nextAlarm"); if(el) el.textContent=getNextAlarmText();
}

async function scheduleLocalAlarms(){
  if(alarmTimer) clearTimeout(alarmTimer);
  updateNextAlarm();
  if(!("Notification" in window) || Notification.permission!=="granted") return;
  const next=nextAlarmInfo();
  const delay=Math.max(1000,next.time-new Date());
  alarmTimer=setTimeout(async()=>{
    await notify("출퇴근 인증 알림",next.title,`commute-${next.kind}-${localDateKey()}`);
    scheduleLocalAlarms();
  },delay);
}

function load(){
  const d=loadSettings();
  $("nameInput").value=d.name||"가축위생방역지원본부 충북도본부";
  $("addressInput").value=d.address||"";
  $("inAlarmInput").value=d.inAlarm||"08:50";
  $("outAlarmInput").value=d.outAlarm||"17:50";
  $("radiusInput").value=String(d.radius||100);
  $("workplaceName").textContent=$("nameInput").value;
  $("workplaceAddress").textContent=$("addressInput").value||"주소를 설정해주세요";
  $("coordText").textContent=(d.lat!=null&&d.lng!=null)
    ? `위도 ${Number(d.lat).toFixed(6)}, 경도 ${Number(d.lng).toFixed(6)} / 반경 ${d.radius||100}m`
    : "아직 등록되지 않았습니다.";
  updateAuth(d); updateRecordSummary(d);
  updateNextAlarm();
}
function save(){
  const d=loadSettings();
  d.name=$("nameInput").value.trim();
  d.address=$("addressInput").value.trim();
  d.inAlarm=$("inAlarmInput").value;
  d.outAlarm=$("outAlarmInput").value;
  d.radius=Number($("radiusInput").value||100);
  saveSettingsObj(d); load(); scheduleLocalAlarms();
  alert("설정이 저장되었습니다.");
}
function getPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error("GPS 미지원"));return;}
    navigator.geolocation.getCurrentPosition(resolve,reject,{
      enableHighAccuracy:true,timeout:10000,maximumAge:0
    });
  });
}
function distanceMeters(lat1,lon1,lat2,lon2){
  const R=6371000,rad=Math.PI/180;
  const dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
async function setWorkplace(){
  try{
    $("coordText").textContent="현재 위치를 확인하는 중입니다...";
    const pos=await getPosition(),d=loadSettings();
    d.lat=pos.coords.latitude; d.lng=pos.coords.longitude;
    d.radius=Number($("radiusInput").value||100);
    saveSettingsObj(d); load();
    alert("현재 위치가 근무지 GPS로 등록되었습니다.");
  }catch(e){
    alert("GPS 위치를 확인하지 못했습니다.\n스마트폰 위치 권한을 허용하고 다시 시도해주세요.");
  }
}
async function certify(type){
  const d=loadSettings(),today=localDateKey();
  const time=new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});
  if(type==="in"&&d.inDate===today)return alert("오늘은 이미 출근 인증이 완료되었습니다.");
  if(type==="out"&&d.outDate===today)return alert("오늘은 이미 퇴근 인증이 완료되었습니다.");
  if(d.lat==null||d.lng==null)return alert("먼저 설정에서 [현재 위치를 근무지로 등록]해 주세요.");
  try{
    $("locationStatus").textContent="GPS 확인 중...";
    const pos=await getPosition(),lat=pos.coords.latitude,lng=pos.coords.longitude;
    const dist=distanceMeters(lat,lng,Number(d.lat),Number(d.lng)),radius=Number(d.radius||100);
    $("locationStatus").textContent=`근무지에서 ${Math.round(dist)}m`;
    if(dist>radius){
      alert(`인증할 수 없습니다.\n현재 근무지에서 약 ${Math.round(dist)}m 떨어져 있습니다.\n인증 가능 반경은 ${radius}m입니다.`);
      return;
    }
    if(type==="in"){
      d.inDate=today;d.inTime=time;d.inLat=lat;d.inLng=lng;d.inDistance=Math.round(dist);
      alert(`출근 인증이 완료되었습니다.\n인증시간: ${time}\n근무지 거리: ${Math.round(dist)}m`);
    }else{
      d.outDate=today;d.outTime=time;d.outLat=lat;d.outLng=lng;d.outDistance=Math.round(dist);
      alert(`퇴근 인증이 완료되었습니다.\n인증시간: ${time}\n근무지 거리: ${Math.round(dist)}m`);
    }
    saveSettingsObj(d);updateAuth(d);updateRecordSummary(d);
  }catch(e){
    $("locationStatus").textContent="위치 확인 실패";
    alert("GPS 위치를 확인하지 못했습니다.\n스마트폰 위치 권한을 허용한 후 다시 시도해주세요.");
  }
}
function updateAuth(d){
  const today=localDateKey();
  const inDone=d.inDate===today,outDone=d.outDate===today;
  $("inStatus").textContent=inDone?"인증완료":"미인증";
  $("outStatus").textContent=outDone?"인증완료":"미인증";
  $("inStatus").className="badge "+(inDone?"done":"pending");
  $("outStatus").className="badge "+(outDone?"done":"pending");
  $("inTime").textContent=inDone?d.inTime:"--:--";
  $("outTime").textContent=outDone?d.outTime:"--:--";
}
function updateRecordSummary(d){
  const today=localDateKey();
  const a=d.inDate===today?`출근 ${d.inTime}`:"출근 미인증";
  const b=d.outDate===today?`퇴근 ${d.outTime}`:"퇴근 미인증";
  $("recordSummary").textContent=`오늘 기록: ${a} · ${b}`;
}
function clearToday(){
  if(!confirm("오늘의 출근·퇴근 인증 기록을 초기화할까요?"))return;
  const d=loadSettings(),today=localDateKey();
  if(d.inDate===today){delete d.inDate;delete d.inTime;delete d.inLat;delete d.inLng;delete d.inDistance;}
  if(d.outDate===today){delete d.outDate;delete d.outTime;delete d.outLat;delete d.outLng;delete d.outDistance;}
  saveSettingsObj(d);load();
  alert("오늘 인증 기록을 초기화했습니다.");
}
function tick(){
  const now=new Date();
  $("today").textContent=now.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  $("clock").textContent=now.toLocaleTimeString("ko-KR",{hour12:false});
  updateNextAlarm();
}

document.addEventListener("DOMContentLoaded",()=>{
  $("saveBtn").addEventListener("click",save);
  $("setWorkplaceBtn").addEventListener("click",setWorkplace);
  $("checkInBtn").addEventListener("click",()=>certify("in"));
  $("checkOutBtn").addEventListener("click",()=>certify("out"));
  $("clearTodayBtn").addEventListener("click",clearToday);
  $("allowNotificationBtn").addEventListener("click",requestNotificationPermission);
  $("testNotificationBtn").addEventListener("click",showTestNotification);
  $("scheduleBtn").addEventListener("click",async()=>{
    if(Notification.permission!=="granted" && !(await requestNotificationPermission()))return;
    scheduleLocalAlarms();
    alert("알림 예약을 시작했습니다.");
  });
  updateNotificationStatus(); load(); tick();
  setInterval(tick,1000);
  setInterval(scheduleLocalAlarms,60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleLocalAlarms();});
});
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
}