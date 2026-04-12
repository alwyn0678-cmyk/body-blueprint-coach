const n=(t=new Date)=>{const e=t.getTimezoneOffset();return new Date(t.getTime()-e*60*1e3).toISOString().split("T")[0]};export{n as g};
