/**
 * Produce a Nginx config file from inputs. Usage:
 *   node writeApi.js --tpl=01 --api=petstore-expanded | more
 *
 * @param tpl string: the number or the file name at nginx-tpl folder, without extension.
 * @param url string: (default "http://localhost:3000") the local PostgREST URL, used as proxy_pass.
 * @param api string: the file name at api-spec folder, without extension.
 * @return STDOUT with the new Nginx config script.
 *
 * @see https://github.com/ppKrauss
 */


const _          = require("underscore");
const fs         = require('fs');
const handlebars = require('handlebars');
var   arg        = require('minimist')(process.argv.slice(2));

var path = process.cwd();
var tpl_file = {};
var tpl_path = path+'/nginx-tpl';
for (var i of fs.readdirSync(tpl_path)) if (i.substr(-9)=='.mustache') {
  tpl_file[i.slice(0,-9)]= i;
  tpl_file[parseInt(i.slice(3,5))]=i;
  tpl_file[i.slice(3,5)]=i;
  tpl_file[i.substr(0,5)]=i;
}

if ( arg.api==undefined || arg.tpl==undefined ) {
  console.log("\n ERROR-2, see folders 'nginx-tpl' and 'api-spec'. Use options \n\t--tpl=filenameAtTpl \n\t--api=filenameAtApi\n");
  process.exit(2);
}
var baseRewriteUrl = arg.url? arg.url: 'http://localhost:3000';

var apiSpec = require( path +'/api-spec/'+ arg.api +'.json' );
var basePath = apiSpec.basePath;
var spec = { host:apiSpec.host, title:apiSpec.info.title, basePath:basePath, rewrites:[], proxy_pass:baseRewriteUrl };
var count=0;

for(var e of Object.keys(apiSpec.paths)) {
   var defUrl = null;
   var defUrl2 = '';
   var defRgx = null;
   var p   = apiSpec.paths[e];
   var p0  = Object.keys(p);
   var lst = p0;
   var def = p0.filter(function(x){return (x.substr(0,2)=='x-')}).sort();
   if (def.length>0) {
      if (def[0]=='x-rewrite_regex') defRgx = p['x-rewrite_regex'];
      if (def.length>1 || !defRgx) defUrl = p['x-rewrite_url'];
      lst = _.difference(p0,def);
   }

   e = e.replace(/^\/|\/$/g, ''); // trimSlash
   var hasVar = (e.indexOf('{')>-1);
   var theVars = [];
   if (!defRgx && (e.indexOf('/')>-1 || hasVar)) {
     if (hasVar) {
        count=0;
        defRgx = e.replace(
           /\{([^\}]+)\}/g,
           function (match,p1) { count++; theVars[count]=p1; return (p1.substr(-2)=='id')? '([0-9]+)' : '([^/]+)' }
        );
     }
     defUrl2 = e.replace( /\{([^\}]+)\}\/?/g,  '' );
   } else
      defUrl2 = e;

   if (defRgx || defUrl) {
       if (!defUrl) {
          var aux = defUrl2.replace(/\$[0-9]+/g,'').replace('/','.').replace(/^\.|\.$/g, '');
          defUrl = baseRewriteUrl+'/'+aux+ ((theVars.length>0)? '?'+theVars[1]+'=eq.$1': '');
       }
       if (!defRgx) {
         console.log("\n ERROR-3, JSON of Api-spec not show consistent rewrite_regex\n");
         process.exit(3);

       }
       spec.rewrites.push({ notes:e, rewrite_regex:"^"+basePath+"/"+defRgx, rewrite_url:defUrl, lst:lst });
   } else
       spec.rewrites.push({notes:"using table "+e});
}

var templateSrc = fs.readFileSync(path + "/nginx-tpl/"+tpl_file[arg['tpl']]).toString();
var template = handlebars.compile(templateSrc);
var out = template(spec);

console.log(out);

