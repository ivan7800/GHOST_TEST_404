'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.join(__dirname,'..','data');
const FILE=path.join(ROOT,'history.json');
const LIMIT=40;
function list(){try{const value=JSON.parse(fs.readFileSync(FILE,'utf8'));return Array.isArray(value)?value.slice(0,LIMIT):[];}catch(e){if(e.code==='ENOENT')return [];return [];}}
function summary(r){return {id:r.id,target:r.target,startedAt:r.startedAt,finishedAt:r.finishedAt,result:r.result,title:r.title,jsErrors:r.jsErrors?.length||0,networkErrors:r.networkErrors?.length||0,httpFailures:r.httpFailures?.length||0};}
function append(result){fs.mkdirSync(ROOT,{recursive:true});const id=crypto.randomUUID();const record={...result,id};const rows=[record,...list()].slice(0,LIMIT);const tmp=FILE+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(rows,null,2),{mode:0o600});fs.renameSync(tmp,FILE);return record;}
function get(id){return list().find(r=>r.id===id)||null;}
function clear(){fs.mkdirSync(ROOT,{recursive:true});fs.writeFileSync(FILE,'[]',{mode:0o600});}
module.exports={list:()=>list().map(summary),get,append,clear};
