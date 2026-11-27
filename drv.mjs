import {createRequire} from "module";
import fs from "fs";
const {chromium}=createRequire("/Users/lukemaggs/Desktop/Claude/WalesSim/package.json")("@playwright/test");
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1440,height:900}});
const page=await ctx.newPage(); await page.goto("http://localhost:4173");
const D="/Users/lukemaggs/Desktop/Claude/WalesSim/design/shots-build/cold3-c/";
let n=0;
while(true){
  if(fs.existsSync("cmd.js")){
    const s=fs.readFileSync("cmd.js","utf8"); fs.unlinkSync("cmd.js");
    let out;
    try{const f=new Function("page","D","return (async()=>{"+s+"})()");out=JSON.stringify(await f(page,D))}catch(e){out="ERR "+e.message}
    fs.writeFileSync("out.txt",String(out)+"\n"); fs.writeFileSync("done","1");
  }
  await new Promise(r=>setTimeout(r,200));
}
