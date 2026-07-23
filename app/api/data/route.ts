import { NextRequest, NextResponse } from "next/server";
const url=process.env.GOOGLE_APPS_SCRIPT_URL,token=process.env.GOOGLE_APPS_SCRIPT_TOKEN;
async function proxy(method:"GET"|"POST",payload?:object){
 if(!url||!token)return NextResponse.json({ok:false,error:"Google Sheets connection is not configured."},{status:503});
 try{const target=new URL(url);if(method==="GET")target.searchParams.set("token",token);const response=await fetch(target,{method,redirect:"follow",cache:"no-store",headers:method==="POST"?{"Content-Type":"text/plain;charset=utf-8"}:undefined,body:method==="POST"?JSON.stringify({token,...payload}):undefined});const text=await response.text();let data;try{data=JSON.parse(text)}catch{data={ok:false,error:"Invalid response from Google Sheets."}}return NextResponse.json(data,{status:response.ok?200:502})}catch{return NextResponse.json({ok:false,error:"Unable to reach Google Sheets."},{status:502})}}
export async function GET(){return proxy("GET")}
export async function POST(request:NextRequest){try{return proxy("POST",await request.json())}catch{return NextResponse.json({ok:false,error:"Invalid request."},{status:400})}}
