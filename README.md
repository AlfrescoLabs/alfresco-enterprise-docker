# generator-alfresco-enterprise-docker
> Alfresco Enterprise Docker Installer

## DISCLAIMER

**IMPORTANT** This project is not supported by Alfresco in any way. Despite deployments using Docker Compose are considered a valid approach for ACS deployment (Community and Enterprise), this `alfresco-enterprise-docker` tool is **not** the official Alfresco recommendation. Please, check [https://github.com/Alfresco/acs-deployment/tree/master/docker-compose](https://github.com/Alfresco/acs-deployment/tree/master/docker-compose) in order to understand official recommendations from Alfresco.

## Description

This project builds a Docker Compose template for Alfresco Enterprise according to services selection that can be used as reference to design ACS deployments.

This project does **not** include:

* RAM limits for every service according to global memory available for Docker
* Customized configuration for Docker Images
* Addons deployment

Docker Images from [quay.io](https://quay.io/organization/alfresco) are used, since this product is only available for Alfresco Enterprise customers. If you are Enterprise Customer or Partner but you are still experimenting problems to download Docker Images, contact [Alfresco Hyland Support](https://community.hyland.com) in order to get required credentials and permissions.

## Installation

This program has following dependencies:

* Node.js
* Yeoman

You can download and install `Node.js` from official web page:

https://nodejs.org/en/download/

Or you can use any of the package managers provided by the product:

https://nodejs.org/en/download/package-manager/

Once Node.js is installed, you can install [Yeoman](http://yeoman.io) as a module:

```bash
$ npm install -g yo
```

And finally, you can install this generator:

```bash
$ npm install --global generator-alfresco-enterprise-docker
```

Deployment is provided for Docker Compose, so following dependencies must be satisfied by the server used to run the generated configuration:

* Docker
* Docker Compose

You can install *Docker Desktop* for Windows or Mac and *Docker Server* for Linux.

https://docs.docker.com/install/

You need also to add *Docker Compose* program to your installation.

https://docs.docker.com/compose/install/


## Running

Create a folder where Docker Compose template files are going to be produced and run the generator.

>>> If you downloaded this project, **don't** reuse source code folder. Create an empty folder to generate Docker Compose template anywhere.

```
$ mkdir docker-compose
$ cd docker-compose

$ yo alfresco-enterprise-docker
```

Several options are provided in order to build the configuration.

```
? Which ACS version do you want to use? 7.4
```

Versions 7.1, 7.2, 7.3 and 7.4 are available

```
? Do you want to use T-Engine (sync) or T-Service (async) as transform service? t-engine
```

* `t-engine` is the Transform Service used for Community Edition, relying on synchronous requests (no ActiveMQ is required)
* `t-service` is a Transform Service available for Enterprise Edition, relying on asynchronous requests (ActiveMQ is required)

```
? Do you want to use Search Service (SOLR 6), Insight Engine (SOLR 6 with SQL) or Search Enterprise (Elasticsearch) as search service? search-service
```

* `search-service` is the Search Service used for Community Edition, relying on SOLR 6.6
* `insight-engine` is a Search Service available for Enterprise Edition, relying on SOLR 6.6 *and* including support for SQL
* `search-enterprise-elasticsearch` is a Search Service available for Enterprise Edition, relying on Elasticsearch (ActiveMQ is required)
* `search-enterprise-opensearch` is a Search Service available for Enterprise Edition, relying on OpenSearch (ActiveMQ is required)

```
? Do you want to use Apache Zeppelin for Insight Engine? n
```

If `insight-engine` is selected, Apache Zeppelin deployment will provide a UI to build graphical dashboards using Solr SQL feature

```
? Do you want to use Share Web App? Y
```

Deploy the legacy Share UI (built with FreeMarker, Springsurf and Aikau)

```
? Do you want to use Alfresco Digital Workspace App? Y
```

Deploy the current ADW UI (built with Angular)

```
? Do you want to use Alfresco Admin App? Y
```

Deploy the Control Center app for Alfresco Authorities (built with Angular)

```
? Do you want to use Sync Service? N
```

Deploy Sync Service to support Desktop Sync application


## Docker Images

* [Repository](https://docs.alfresco.com/content-services/latest/): [alfresco-content-repository](https://quay.io/alfresco/alfresco-content-repository)
* [Share](https://docs.alfresco.com/content-services/latest/using/share/): [alfresco-share](https://quay.io/alfresco/alfresco-share)
* [Digital Workspace](https://docs.alfresco.com/digital-workspace/latest/): [alfresco-digital-workspace](https://quay.io/alfresco/alfresco-digital-workspace)
* [Control Center](https://docs.alfresco.com/digital-workspace/latest/): [alfresco-digital-workspace](https://quay.io/alfresco/alfresco-admin-app)
* [Search](https://docs.alfresco.com/search-services/latest/): [alfresco-search-services](https://hub.docker.com/r/alfresco/alfresco-search-services)
* [Insight Engine](https://docs.alfresco.com/insight-engine/latest/): [insight-engine](https://quay.io/alfresco/insight-engine)
* [Zeppelin](https://docs.alfresco.com/insight-engine/latest/using/): [insight-zeppelin](https://quay.io/alfresco/insight-zeppelin)
* [Search Enterprise](https://docs.alfresco.com/search-enterprise/latest/): [alfresco-elasticsearch](https://quay.io/alfresco/alfresco-elasticsearch-live-indexing)
* [Transform Service](https://docs.alfresco.com/transform-service/latest/): [alfresco-transform-router](https://quay.io/alfresco/alfresco-transform-router)
* [Sync Service](https://docs.alfresco.com/sync-service/latest/): [sync-service](https://quay.io/alfresco/service-sync)

## Service URLs

*Default URLs*

http://localhost:8080/workspace (ADW)

Default credentials
* user: admin
* password: admin

http://localhost:8080/admin (Control Center)

Default credentials
* user: admin
* password: admin

http://localhost:8080/share (Share)

Default credentials
* user: admin
* password: admin

http://localhost:8080/alfresco (Alfresco)

Default credentials
* user: admin
* password: admin

http://localhost:8080/api-explorer (API Explorer)

Default credentials
* user: admin
* password: admin

http://localhost:8083/solr (Search Service)

Default credentials
* user: admin
* password: admin

http://localhost:8161 (ActiveMQ)

Default credentials: none

http://localhost:9091/zeppelin (Zeppelin)

Default credentials
* user: admin
* password: admin

http://localhost:9200 (Elasticsearch / OpenSearch)

Default credentials: none

http://localhost:5601 (Kibana / OpenSearch Dashboards)

Default credentials: none

## Building

It's not required to build or download this project in order to use it. But this can be done using default *npm* tools.

The module is available at **npm**:

https://www.npmjs.com/package/generator-alfresco-enterprise-docker

If you want to build it locally, you need an environment with Node.js and Yeoman. And from the root folder of the project, just type:

```bash
$ npm link
```
