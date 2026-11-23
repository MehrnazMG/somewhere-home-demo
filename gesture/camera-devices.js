export function cameraVideoConstraints(deviceId=''){
  return {width:{ideal:960},height:{ideal:540},...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:'user'})};
}

export function cameraChoices(devices,preferred=''){
  const cameras=devices.filter(device=>device.kind==='videoinput'&&device.deviceId);
  const options=[{value:'',label:'Default camera'},...cameras.map((device,i)=>({value:device.deviceId,label:device.label||`Camera ${i+1} (enable access to see name)`}))];
  return {options,value:options.some(option=>option.value===preferred)?preferred:''};
}
