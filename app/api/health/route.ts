import {env}from'../../../src/server/runtime';
export const dynamic='force-dynamic';
export async function GET(){try{await env.DB.prepare('SELECT 1').first();return Response.json({status:'ok',application:'PilaManager Nova Experiência',database:'PostgreSQL'});}catch{return Response.json({status:'unavailable'},{status:503});}}
