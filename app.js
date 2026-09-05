
// ===== 4단계: 스마트폰 알림 기능 =====
function getLocalDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isWeekday(d=new Date()) {
  const n=d.getDay(); return n>=1 && n<=5;
}
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("이 브라우저는 알림 기능을 지원하지 않습니다."); return false;
  }
  const p=await Notification.requestPermission();
  updateNotificationStatus();
  if(p==="granted") { alert("알림 권한이 허용되었습니다. '알림 테스트'를 눌러 확인해보세요."); return true; }
  alert("알림 권한이 허용되지 않았습니다. Chrome의 사이트 알림 설정을 확인해주세요."); return false;
}
function updateNotificationStatus() {
  const el=document.getElementById("notificationStatus"); if(!el) return;
  if(!("Notification" in window)) { el.textContent="이 브라우저는 알림을 지원하지 않습니다."; return; }
  el.textContent=Notification.permission==="granted" ? "✅ 알림 허용됨" :
    Notification.permission==="denied" ? "⛔ 알림 차단됨" : "⚠️ 알림 권한 필요";
}
async function showTestNotification() {
  if(!("Notification" in window)) { alert("이 브라우저는 알림을 지원하지 않습니다."); return; }
  if(Notification.permission!=="granted" && !(await requestNotificationPermission())) return;
  try {
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification("출퇴근 인증 알림",{
      body:"알림 테스트입니다. 정상적으로 표시되면 성공입니다.",
      icon:"./icon-192.png", badge:"./icon-192.png", tag:"commute-test",
      data:{url:"./"}
    });
  } catch(e) {
    try { new Notification("출퇴근 인증 알림",{body:"알림 테스트입니다."}); } catch(_) {}
  }
}
let alarmTimer=null;
function scheduleLocalAlarms() {
  if(alarmTimer) clearTimeout(alarmTimer);
  if(!("Notification" in window) || Notification.permission!=="granted") return;
  const s=loadSettings(), now=new Date(), targets=[];
  if(isWeekday(now)) {
    for(const [kind,value,title] of [
      ["arrival",s.arrivalAlert||"08:50","출근 인증을 해주세요."],
      ["leave",s.leaveAlert||"17:50","퇴근 인증을 해주세요."]
    ]) {
      const [h,m]=String(value).split(":").map(Number), t=new Date(now);
      t.setHours(h,m,0,0);
      if(t>now) targets.push({time:t,title,kind});
    }
  }
  if(!targets.length) {
    const t=new Date(now); t.setDate(t.getDate()+1); t.setHours(0,0,2,0);
    alarmTimer=setTimeout(scheduleLocalAlarms,Math.max(1000,t-now)); return;
  }
  targets.sort((a,b)=>a.time-b.time);
  const next=targets[0];
  alarmTimer=setTimeout(async()=>{
    try {
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification("출퇴근 인증 알림",{
        body:next.title, icon:"./icon-192.png", badge:"./icon-192.png",
        tag:`commute-${next.kind}-${getLocalDateKey()}`, data:{url:"./"}
      });
    } catch(e) {}
    scheduleLocalAlarms();
  },Math.max(1000,next.time-now));
}
function getNextAlarmText() {
  const s=loadSettings(), now=new Date();
  if(!isWeekday(now)) return `다음 근무일 출근 알림: ${s.arrivalAlert||"08:50"}`;
  const a=[];
  for(const [label,value] of [["출근",s.arrivalAlert||"08:50"],["퇴근",s.leaveAlert||"17:50"]]) {
    const [h,m]=String(value).split(":").map(Number), t=new Date(now); t.setHours(h,m,0,0);
    if(t>now) a.push([t,label,value]);
  }
  if(!a.length) return `다음 근무일 출근 알림: ${s.arrivalAlert||"08:50"}`;
  a.sort((x,y)=>x[0]-y[0]); return `다음 알림: ${a[0][1]} ${a[0][2]}`;
}
document.addEventListener("DOMContentLoaded",()=>{
  updateNotificationStatus();
  const a=document.getElementById("allowNotificationBtn"), t=document.getElementById("testNotificationBtn");
  if(a) a.addEventListener("click",requestNotificationPermission);
  if(t) t.addEventListener("click",showTestNotification);
  const n=document.getElementById("nextAlarm"); if(n) n.textContent=getNextAlarmText();
  scheduleLocalAlarms();
});

const $=id=>document.getElementById(id);
const KEY="attendanceAppV1";

function load(){
  const d=JSON.parse(localStorage.getItem(KEY)||"{}");
  $("nameInput").value=d.name||"가축위생방역지원본부 충북도본부";
  $("addressInput").value=d.address||"";
  $("inAlarmInput").value=d.inAlarm||"08:50";
  $("outAlarmInput").value=d.outAlarm||"17:50";
  $("radiusInput").value=d.radius||"100";
  $("workplaceName").textContent=$("nameInput").value;
  $("workplaceAddress").textContent=$("addressInput").value||"주소를 설정해주세요";
  $("inAlarm").textContent=$("inAlarmInput").value;
  $("outAlarm").textContent=$("outAlarmInput").value;
  $("coordText").textContent=(d.lat!=null && d.lng!=null)
    ? `위도 ${Number(d.lat).toFixed(6)}, 경도 ${Number(d.lng).toFixed(6)} / 반경 ${d.radius||100}m`
    : "아직 등록되지 않았습니다.";
  updateAuth(d);
}
function save(){
  const d=JSON.parse(localStorage.getItem(KEY)||"{}");
  d.name=$("nameInput").value.trim();
  d.address=$("addressInput").value.trim();
  d.inAlarm=$("inAlarmInput").value;
  d.outAlarm=$("outAlarmInput").value;
  d.radius=Number($("radiusInput").value||100);
  localStorage.setItem(KEY,JSON.stringify(d));
  load();
  alert("설정이 저장되었습니다.");
}

function getPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){
      reject(new Error("이 브라우저에서는 GPS 위치 기능을 사용할 수 없습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve,reject,{
      enableHighAccuracy:true, timeout:10000, maximumAge:0
    });
  });
}

function distanceMeters(lat1,lon1,lat2,lon2){
  const R=6371000, rad=Math.PI/180;
  const dLat=(lat2-lat1)*rad, dLon=(lon2-lon1)*rad;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

async function setWorkplace(){
  try{
    $("coordText").textContent="현재 위치를 확인하는 중입니다...";
    const pos=await getPosition();
    const d=JSON.parse(localStorage.getItem(KEY)||"{}");
    d.lat=pos.coords.latitude;
    d.lng=pos.coords.longitude;
    d.radius=Number($("radiusInput").value||100);
    localStorage.setItem(KEY,JSON.stringify(d));
    load();
    alert("현재 위치가 근무지 GPS로 등록되었습니다.");
  }catch(e){
    alert("GPS 위치를 확인하지 못했습니다.\\n위치 권한을 허용하고 다시 시도해주세요.");
  }
}

async function certify(type){
  const d=JSON.parse(localStorage.getItem(KEY)||"{}");
  const today=new Date().toISOString().slice(0,10);
  const time=new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});
  if(type==="in" && d.inDate===today){alert("오늘은 이미 출근 인증이 완료되었습니다.");return}
  if(type==="out" && d.outDate===today){alert("오늘은 이미 퇴근 인증이 완료되었습니다.");return}

  if(d.lat==null || d.lng==null){
    alert("먼저 설정에서 [현재 위치를 근무지로 등록]해 주세요.");
    return;
  }

  try{
    $("locationStatus").textContent="GPS 확인 중...";
    const pos=await getPosition();
    const lat=pos.coords.latitude, lng=pos.coords.longitude;
    const dist=distanceMeters(lat,lng,Number(d.lat),Number(d.lng));
    const radius=Number(d.radius||100);
    $("locationStatus").textContent=`근무지에서 ${Math.round(dist)}m`;
    $("distanceText").textContent=`인증 기준: ${radius}m 이내`;
    if(dist>radius){
      alert(`인증할 수 없습니다.\\n현재 근무지에서 약 ${Math.round(dist)}m 떨어져 있습니다.\\n인증 가능 반경은 ${radius}m입니다.`);
      return;
    }

    if(type==="in"){
      d.inDate=today; d.inTime=time; d.inLat=lat; d.inLng=lng; d.inDistance=Math.round(dist);
      alert(`출근 인증이 완료되었습니다.\\n인증시간: ${time}\\n근무지 거리: ${Math.round(dist)}m`);
    }else{
      d.outDate=today; d.outTime=time; d.outLat=lat; d.outLng=lng; d.outDistance=Math.round(dist);
      alert(`퇴근 인증이 완료되었습니다.\\n인증시간: ${time}\\n근무지 거리: ${Math.round(dist)}m`);
    }
    localStorage.setItem(KEY,JSON.stringify(d)); updateAuth(d);
  }catch(e){
    $("locationStatus").textContent="위치 확인 실패";
    alert("GPS 위치를 확인하지 못했습니다.\\n스마트폰 위치 권한을 허용한 후 다시 시도해주세요.");
  }
}
function updateAuth(d){
  const today=new Date().toISOString().slice(0,10);
  $("inStatus").textContent=d.inDate===today?"인증완료":"미인증";
  $("outStatus").textContent=d.outDate===today?"인증완료":"미인증";
  $("inStatus").className="badge "+(d.inDate===today?"done":"pending");
  $("outStatus").className="badge "+(d.outDate===today?"done":"pending");
  $("inTime").textContent=d.inDate===today?d.inTime:"--:--";
  $("outTime").textContent=d.outDate===today?d.outTime:"--:--";
}
function tick(){
  const now=new Date();
  $("today").textContent=now.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  $("clock").textContent=now.toLocaleTimeString("ko-KR",{hour12:false});
}
$("saveBtn").addEventListener("click",save);
$("setWorkplaceBtn").addEventListener("click",setWorkplace);
$("checkInBtn").addEventListener("click",()=>certify("in"));
$("checkOutBtn").addEventListener("click",()=>certify("out"));
setInterval(tick,1000); tick(); load();

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
