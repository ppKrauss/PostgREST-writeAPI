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

// prepare for get "--tpl" option friendly:
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
var baseRewriteUrl = // used as proxy_pass, PostgREST is the default
      arg.url? arg.url: 'http://localhost:3000';
;
var apiSpec  = require( path +'/api-spec/'+ arg.api +'.json' ); // from "--api" option
var basePath = apiSpec.basePath;

// inicializing the mustache input:
var spec = {
  host:       apiSpec.host,       title:    apiSpec.info.title,
  basePath:   basePath,           rewrites: [],
  proxy_pass: baseRewriteUrl
};

var count=0;
for(var e of Object.keys(apiSpec.paths)) { // each endpoint path declared in the spec
   var defUrl = null; // target URL, real endpoint
   var defUrl2 = '';  // alternate target
   var defRgx = null;
   var baseRewriteUrlAlt = null;
   var p   = apiSpec.paths[e];
   var p0  = Object.keys(p);
   var lst = p0;
   var def = p0.filter(function(x){return (x.substr(0,2)=='x-')}).sort();
   if (def.length>0) {
      lst = _.difference(p0,def);
      if (p['x-rewrite_regex']) defRgx = p['x-rewrite_regex'];
      if (p['x-rewrite_url']) defUrl = p['x-rewrite_url'];
      if (p['x-proxy_url'])   baseRewriteUrlAlt = p['x-proxy_url'];
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

   if (defRgx || defUrl || baseRewriteUrlAlt) {
       var aux = defUrl2.replace(/\$[0-9]+/g,'').replace('/','.').replace(/^\.|\.$/g, '');
       var notes = e;
       if (baseRewriteUrlAlt) {
          defUrl = baseRewriteUrlAlt;
          notes = e+' TO OTHER PROXY';
          if (!defRgx) defRgx=aux;
       } else if (!defUrl) {
          defUrl = baseRewriteUrl+'/'+aux+ ((theVars.length>0)? '?'+theVars[1]+'=eq.$1': '');
       }
       if (!baseRewriteUrlAlt && !defRgx) {
         console.log("\n ERROR-3, JSON of Api-spec not show consistent rewrite_regex\n");
         process.exit(3);

       }
       spec.rewrites.push({ notes:notes, rewrite_regex:"^"+basePath+"/"+defRgx, rewrite_url:defUrl, lst:lst });
   } else
       spec.rewrites.push({notes:e+" (automatic PostgREST)", lst:lst});
}

var templateSrc = fs.readFileSync(path + "/nginx-tpl/"+tpl_file[arg['tpl']]).toString();
var template = handlebars.compile(templateSrc);
var out = template(spec);

console.log(out);

