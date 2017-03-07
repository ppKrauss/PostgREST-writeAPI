We use the best, [Nginx](https://nginx.org/) and [PostgREST](https://postgrest.com), to translate your [OpenAPI specification](https://www.openapis.org/specification) into a [back-end](https://en.wikipedia.org/wiki/Front_and_back_ends) system... The project offers the main piece of the implementation, the *Nginx configuration script* that acts as a [MVC](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)-controller for PostgREST and your system.

## Motivations

PostgREST *endpoints* are ready-for-use, but, sometimes you can't reuse directally its "complex URL" endpoints, or need compliance with system requirements &mdash; already expressed in an OpenAPI specification.
 
This project was started to simplify this PostgREST use case: to obey the OpenAPI specification of your project.

### Market motivations

PostgreSQL is not an "[agile](https://en.wikipedia.org/wiki/Agile_software_development) tool"?  Now it is! 

You can generate a ready-for-use production version system with PostgREST.  Is not perfect yet, but in some niche *PostgreSQL experts* now can compete with Spring-boot, Django, CakePHP, etc. *agile frameworks*, in the back-end design and [prototipation](https://en.wikipedia.org/wiki/Software_prototyping). And, with this project,  can extend the PostgREST capabilty, to agile implementation of arbitrary endpoint specifications. 

## OpenAPI addictions to specify your system

Your application can use full stack PostgREST (the URL-SQLquery syntax) for default endpoints, 
and two new fields must be included in your OpenAPI spec (your `swagger.json`), to describe the endpoints with non-default PostgREST behaviour:

* `x-rewrite_regex`: the regular expression that in fact represents the endpoint is a concatenation of *basePath*, *localPath* and *rewrite_regex*.
* `x-rewrite_url`: the target-URL with optional regex-variables (eg. $1).

When one or both are declared at JSON's API description, it is translated to Nginx *rewrite* directive. Else default PostgREST is adopted.
The `x-` prefix is the ["vendor extension" of OpenAPI](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#vendorExtensions).

## Methodology

As the project is version 0.1, have good methodology but not an automatic procedure (nossa meta é ser um Spring-roo da vida).

1. Check what templete you need (or colabore creating a new one!). See [nginx-tpl](nginx-tpl) folder with some examples.

2. Save your API specification (`swagger.json`)  at [api-spec](api-spec) with your project's name (eg. `myproj.json`), and edit it ading the fields xx and yy.

3. run `node writeApi.js --tpl=basic1 --api=myproj` .. it will generate the Nginx's script. 
 
4. do next steps as usual Nginx implementation
