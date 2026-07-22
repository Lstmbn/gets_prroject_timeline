import { NextRequest, NextResponse } from "next/server";

const endpoint=process.env.GOOGLE_APPS_SCRIPT_URL;
const token=process.env.SHEETS_API_TOKEN;

async function callScript(payload?:unknown){
  if(!endpoint||!token) return NextResponse.json({error:"Server integration is not configured"},{status:503});
  const url=payload?endpoint:`${endpoint}?token=${encodeURIComponent(token)}`;
  const response=await fetch(url,payload?{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload as object,token}),cache:"no-store"}:{cache:"no-store",redirect:"follow"});
  const text=await response.text();
  if(!response.ok) return NextResponse.json({error:"Google Sheets request failed",detail:text.slice(0,300)},{status:502});
  try{return NextResponse.json(JSON.parse(text))}catch{return NextResponse.json({error:"Invalid response from Google Apps Script"},{status:502})}
}
export async function GET(){return callScript()}
export async function POST(request:NextRequest){return callScript(await request.json())}
