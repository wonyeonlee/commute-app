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
