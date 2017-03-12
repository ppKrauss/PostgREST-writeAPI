We use the best, [Nginx](https://nginx.org/) and [PostgREST](https://postgrest.com), to translate your [OpenAPI specification](https://www.openapis.org/specification) into a [back-end](https://en.wikipedia.org/wiki/Front_and_back_ends) system.

The project offers automatic generation of the main piece for implementation of  your *endpoints*, the *Nginx configuration script* &mdash; that acts as a primary [MVC](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)-controller for PostgREST and for your system.

## Illsutrating usage

After check pre-requisites (NodeJS v4.2), `git clone` this repo, you can generate an Nginx config-file with
```sh
cd PostgREST-writeAPI
node writeApi.js --tpl=01 --api=petstore-expanded | more
```
Edit `api-spec/petstore-expanded.json` and `nginx-tpl/tpl01-baseBreak.mustache` to try variations.  What it do:

Original endpoint | Expected by [API-specification](api-spec/petstore-expanded.json)
------------ | -------------
`http://localhost:3000/pets` | `petstore.swagger.io/api/pets` or `petstore.swagger.io/api/darlings`
`http://localhost:3000/pets?id=eq.`_id_ | `petstore.swagger.io/api/pets/{id}`

So *PostgREST-writeAPI* generates a [Nginx rewrite module script](http://nginx.org/en/docs/http/ngx_http_rewrite_module.html) that implements the expected API-specification, as below:

```sh
server {

	server_name petstore.swagger.io;
	root /var/www/petstore.swagger.io/html;

	# publishing by default the HTML for API description and related files for navigation
	index index.html index.htm;

	location / {
		try_files $uri $uri/ @proxy;
	}

	location @proxy {
		### endpoints defined by OpenAPI spec of this app:

		rewrite    # endpoint "pets" for get,post
		  ^/api/(pets?|darlings?)$
		  http://localhost:3000/pets
		  break;

		rewrite    # endpoint "pets/{id}" for get,delete
		  ^/api/pets/([0-9]+)
		  http://localhost:3000/pets?id=eq.$1
		  break;

		# endpoint insects (automatic PostgREST) for get
		
		rewrite    # endpoint "fishes TO OTHER PROXY" for get
		  ^/api/fishes
		  http://localhost:4000
		  break;

		### default and auxiliar endpoint, for all other requests for PostgREST-queries
		rewrite     ^/api/(.*)$      /$1     break;
		
		### proxy configurations:
		proxy_pass  http://localhost:3000;  # my PostREST is  here!
		...
	}
}
```
It is obtained by [tpl01-baseBreak](nginx-tpl/tpl01-baseBreak.mustache) template and [this spec](api-spec/petstore-expanded.json) as input, as required by `--tpl=01 --api=petstore-expanded` options.

Variations can be obtained changing the template. Example: to stop to use the *PostgREST queryes* (eg. `petstore.swagger.io/api/otherTable`) you can use `--tpl=02`  in the command line, that will generate script by [tpl02-baseBreak-noQuery](nginx-tpl/tpl02-baseBreak-noQuery.mustache) template, eliminating the last ` rewrite` clause.

## Motivations

PostgREST *endpoints* are ready-for-use, but, sometimes you can't reuse directally its "complex URL" endpoints, or need compliance with system requirements &mdash; already expressed in an formal specification.
 
This project was developed to simplify this PostgREST use case: to obey the OpenAPI specification of your project.

### Need for fast prototipation

PostgreSQL is not an "[agile](https://en.wikipedia.org/wiki/Agile_software_development) tool"?  We can go from scratch to a set of endpoints serving a database, in minutes? We can use only the database, alone, to implement *web-application [prototypes](https://en.wikipedia.org/wiki/Software_prototyping)*?  

With PostgREST we can (!!) and the goal of this project is to expand the spectrum of applications. We can extend the PostgREST capabilties to "plug-and-play" endpoints, by its OpenAPI specifications.

## OpenAPI addictions to specify your system

Your application can use full stack PostgREST (the URL-SQLquery syntax) for default endpoints, 
and two new fields must be included in your OpenAPI spec (your `swagger.json`), to describe the endpoints with non-default PostgREST behaviour:

* `x-rewrite_regex`: the regular expression that in fact represents the endpoint is a concatenation of *basePath*, *localPath* and *rewrite_regex*.

* `x-rewrite_url`: the target-URL with optional regex-variables (eg. $1).

* `x-proxy_url`: the URL of the "root" that is handling the `x-rewrite_url`, when is not PostgREST (the default proxy). 

When one or both are declared at JSON's API description, it is translated to Nginx *rewrite* directive. Else default PostgREST is adopted.
The `x-` prefix is the ["vendor extension" of OpenAPI](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#vendorExtensions).

## Methodology

As the project is alpha version, have good methodology but not an automatic procedure. Simple steps:

1. Prepare an OpenAPI specification of your system or application. Use basic PostgREST where is possible, where is not, two alternatives: rewrite to proxy-PostgREST or implement in it in other "proxy"... So, express also in the API specification the fields `x-proxy_url`, `x-rewrite_regex` and `x-rewrite_url`.

2. Check what templete you need (or colabore creating a new one!). See [nginx-tpl](nginx-tpl) folder with some examples (or use template `01` as first try).

3. Save your API specification (`swagger.json`)  at [api-spec](api-spec) with your project's name (eg. `myproj.json`), and edit it ading the fields xx and yy.

4. run `node writeApi.js > subdomain.conf` with correct parameters. It will generate the Nginx's script for your server's ` /etc/nginx/sites-available`.
 
5. do next steps as usual Nginx implementation
