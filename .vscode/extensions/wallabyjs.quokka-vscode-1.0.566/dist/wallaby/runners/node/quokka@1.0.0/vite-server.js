/*
 * Wallaby.js - v1.0.1475
 * https://wallabyjs.com
 * Copyright (c) 2014-2023 Wallaby.js - All Rights Reserved.
 *
 * This source code file is a part of Wallaby.js and is a proprietary (closed source) software.

 * IMPORTANT:
 * Wallaby.js is a tool made by software developers for software developers with passion and love for what we do.
 * Pirating the tool is not only illegal and just morally wrong,
 * it is also unfair to other fellow programmers who are using it legally,
 * and very harmful for the tool and its future.
 */
let vite,node,filePath,content;async function start({localProjectRoot,vitePath,viteNodeServerPath,quokkaSettingsDirPath,quokkaTempDirPath}){const{createServer}=await eval("import(vitePath)"),{ViteNodeServer}=await eval("import(viteNodeServerPath)"),resolve=(await eval("import('resolve')")).default.sync,fs=await eval("import('fs')");return vite=await createServer({mode:"development",root:localProjectRoot,build:{sourcemap:!0},optimizeDeps:{disabled:!0},logLevel:"error",plugins:[{name:"quokka:adjust-config",enforce:"pre",config(e){!1!==e.esbuild&&(e.esbuild=e.esbuild||{},e.esbuild.sourcemap=!0,e.esbuild.legalComments="none")}},{name:"quokka:preprocessing",enforce:"pre",load(e){if(e===filePath)return content}},{name:"quokka:postprocessing",enforce:"post",async transform(e,t){return t!==filePath?{code:e}:externalRequest("transform",{transformed:{code:e,map:this._getCombinedSourcemap()},fileName:t})}},{name:"quokka:resolveId",async resolveId(e,t,r){if(/\0/.test(e))return null;t=await this.resolve(e,t,Object.assign({skipSelf:!0},r));if(!t){try{return resolve(e,{basedir:quokkaTempDirPath})}catch(e){}try{return resolve(e,{basedir:quokkaSettingsDirPath})}catch(e){}}}}]}),await vite.pluginContainer.buildStart({}),node=new ViteNodeServer(vite,{sourcemap:!0}),{root:vite.config.root,base:vite.config.base}}let id=1,pendingPromises={};function reset(e){filePath=e.filePath,content=e.content,id=1,pendingPromises={},vite.moduleGraph.invalidateAll(),node.fetchCache.clear(),node.fetchPromiseMap.clear()}function externalRequest(r,s){return new Promise((e,t)=>{pendingPromises[id]={resolve:e,reject:t},process.send({type:r,id:id,payload:s}),id++})}async function resolveId({id:e,importer:t}){return node.resolveId(e,t)}async function fetchModule({moduleId:e}){return node.fetchModule(e)}const messageHandlers={reset:reset,start:start,resolveId:resolveId,fetchModule:fetchModule};(async()=>{process.on("message",async t=>{if(t)if(t.returnId){var{returnId:e,result:r,error:s}=t;if(pendingPromises[e]){if(s){const a=JSON.parse(s),i=new Error;Object.keys(a).forEach(e=>{i[e]=a[e]}),pendingPromises[e].reject(i)}else pendingPromises[e].resolve(r);delete pendingPromises[e]}}else if(t&&t.type&&messageHandlers[t.type])try{var o=await messageHandlers[t.type](t.payload);t.id&&process.send({returnId:t.id,result:o})}catch(e){t.id&&(s=Object.assign(Object.assign({},e),{message:e.message,stack:e.stack}),process.send({returnId:t.id,error:JSON.stringify(s)}))}}),process.send({type:"ready"}),setTimeout(()=>{},void 0)})();