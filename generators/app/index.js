'use strict';
const Generator = require('yeoman-generator');
var banner = require('./banner');
var fs = require('fs');
var compare = require('compare-versions').compare;

/**
 * This module provides a Yeoman Generator to produce 'docker-compose.yml' 
 * configurations for Alfresco Enterprise deployments
 */
 module.exports = class extends Generator {

    // Initial messages
    initializing() {

        this.log('--------------------');
        this.log('This project requires credentials to access to private Alfresco Docker Registry hosted in quay.io');
        this.log('Contact with Hyland support to get those credentials');
        this.log('-------------------');

    }

    // User options
    prompting() {

        if (!this.options['skip-install-message']) {
            this.log(banner);
        }

        const prompts = [
            {
                type: 'list',
                name: 'acsVersion',
                message: 'Which ACS version do you want to use?',
                choices: [ '7.1', '7.2', '7.3', '7.4', '23.1', '23.2', '23.4', '25.1', '25.3', '26.1' ],
                default: '26.1'
            },
            {
              type: 'list',
              name: 'transform',
              message: 'Do you want to use T-Engine (sync) or T-Service (async) as transform service?',
              choices: [ 't-engine', 't-service' ],
              default: 't-engine'
            },
            {
              type: 'list',
              name: 'search',
              message: 'Do you want to use Search Service (SOLR 6), Insight Engine (SOLR 6 with SQL) or Search Enterprise (with Elasticsearch or with OpenSearch) as search service?',
              choices: [ 'search-service', 'insight-engine', 'search-enterprise-elasticsearch', 'search-enterprise-opensearch' ],
              default: 'search-service'
            },
            {
              when: function (response) {
                return response.search == 'insight-engine'
              },
              type: 'confirm',
              name: 'zeppelin',
              message: 'Do you want to use Apache Zeppelin for Insight Engine?',
              default: false
            },
            {
              type: 'confirm',
              name: 'share',
              message: 'Do you want to use Share Web App?',
              default: true
            },
            {
              type: 'confirm',
              name: 'adw',
              message: 'Do you want to use Alfresco Digital Workspace App?',
              default: true
            },
            {
              when: function (response) {
                var version = response.acsVersion ? response.acsVersion : commandProps['acsVersion'];
                return compare(version, '7.3', '>=')
              },
              type: 'confirm',
              name: 'admin',
              message: 'Do you want to use Alfresco Admin App?',
              default: true
            },
            {
              type: 'confirm',
              name: 'sync',
              message: 'Do you want to use Sync Service?',
              default: false
            },
            {
              when: function (response) {
                var version = response.acsVersion ? response.acsVersion : commandProps['acsVersion'];
                return requiresActiveMqCredentials(version);
              },
              type: 'input',
              name: 'activeMqUser',
              message: 'Choose the USERNAME for your ActiveMQ user',
              default: 'admin'
            },
            {
              when: function (response) {
                var version = response.acsVersion ? response.acsVersion : commandProps['acsVersion'];
                return requiresActiveMqCredentials(version);
              },
              type: 'input',
              name: 'activeMqPassword',
              message: 'Choose the PASSWORD for your ActiveMQ user',
              default: 'password'
            }
        ]
        
        // Read options from command line parameters
        const filteredPrompts = [];
        const commandProps = new Map();
        prompts.forEach(function prompts(prompt) {
        const option = this.options[prompt.name];
        if (option === undefined) {
            filteredPrompts.push(prompt);
        } else {
            commandProps[prompt.name] = normalize(option, prompt);
        }
        }, this);

        // Prompt only for parameters not passed by command line
        return this.prompt(filteredPrompts).then(props => {
            this.props = props;
            Object.assign(props, commandProps);
            applyDerivedDefaults(props);
        });

    }

    // Producing 'docker-compose.yml' output file and temporary partial services
    writing() {

        this.fs.copyTpl(
            this.templatePath(this.props.acsVersion + '/.env'),
            this.destinationPath('.env'),
            {
                activeMqUser: this.props.activeMqUser,
                activeMqPassword: this.props.activeMqPassword
            }
        )

        var secretPassword = Math.random().toString(36).slice(2);

        this.fs.copyTpl(
            this.templatePath(this.props.acsVersion + '/docker-compose.yml'),
            this.destinationPath('docker-compose.yml'), {
                transform: this.props.transform,
                comms: this.props.acsVersion == '7.1' ? 'none' : 'secret',
                search: this.props.search,
                secret: secretPassword,
                share: this.props.share ? 'true' : 'false',
                sync: this.props.sync ? 'true' : 'false',
                adw: this.props.adw ? 'true' : 'false',
                admin: this.props.admin ? 'true' : 'false'
            }
        )

        // Create temporary search-service yml description
        if (this.props.search == 'search-service' || this.props.search == 'insight-engine') {
            this.fs.copyTpl(
                this.templatePath('services/' + this.props.search + '.yml'),
                this.destinationPath('search-service.yml'), {
                    comms: this.props.acsVersion == '7.1' ? 'none' : 'secret',
                    secret: secretPassword
                }
            )
        }

    }

    // Building the final 'docker-compose.yml' replacing internal marks with services definition
    end() {

        const syncTemplate = getServiceTemplate('sync-service.yml', this.props);
        const transformTemplate = getServiceTemplate('transform-service.yml', this.props);
        const elasticsearchTemplate = getServiceTemplate('search-enterprise-elasticsearch.yml', this.props);
        const opensearchTemplate = getServiceTemplate('search-enterprise-opensearch.yml', this.props);

        if (this.props.share) {
            replaceContentTemplate('# share', 'services/share.yml', this);
        }
        
        if (this.props.sync) {
            replaceContentTemplate('# sync-service', syncTemplate, this);
        }

        if (this.props.adw) {
            replaceContentTemplate('# digital-workspace', 'services/digital-workspace.yml', this);
        }

        if (this.props.admin) {
            replaceContentTemplate('# control-center', 'services/control-center.yml', this);
        }

        if (this.props.transform == 't-engine') {
            replaceContentTemplate('# transform-service', 'services/transform-engine.yml', this);
        }

        if (this.props.transform == 't-service') {
            replaceContentTemplate('# transform-service', transformTemplate, this);
            replaceContentTemplate('# transform-volume', 'services/transform-service-volume.yml', this);
        }
        
        if (this.props.search == 'search-service' || this.props.search == 'insight-engine') {
            replaceContentString('# search-service', fs.readFileSync('search-service.yml').toString());
            fs.unlinkSync('search-service.yml');
        }

        if (this.props.zeppelin) {
            replaceContentTemplate('# zeppelin', 'services/zeppelin.yml', this);
        }

        if (this.props.search == 'search-enterprise-elasticsearch') {            
            replaceContentTemplate('# search-service', elasticsearchTemplate, this);
            if (this.props.transform == 't-engine') {
                this.log('WARNING: Search Enterprise will be indexing only metadata, since Transform Service is using T-Engine.');
                this.log('To index also content, choose T-Service for Transform Service.');
            }
        }
      
        if (this.props.search == 'search-enterprise-opensearch') {            
            replaceContentTemplate('# search-service', opensearchTemplate, this);
            if (this.props.transform == 't-engine') {
                this.log('WARNING: Search Enterprise will be indexing only metadata, since Transform Service is using T-Engine.');
                this.log('To index also content, choose T-Service for Transform Service.');
            }
        }

    }

};

/**
 * Replace content in docker-compose.yml file using a Template File
 * @param replacementMark - The mark to be replaced (like '# search-service')
 * @param templateFile - The name of the template file (like 'services/search-service.yml')
 * @param yo - Yeoman Generator instance
 */
function replaceContentTemplate(replacementMark, templateFile, yo) {

    var dockerCompose = fs.readFileSync('docker-compose.yml').toString();
    var service = yo.fs.read(yo.templatePath(templateFile));
    dockerCompose = dockerCompose.replace(replacementMark, service);
    fs.writeFileSync('docker-compose.yml', dockerCompose);

}

/**
 * Replace content in docker-compose.yml file using an input String
 * @param replacementMark - The mark to be replaced (like '# search-service')
 * @param service - The String including the service definition in yml
 */
function replaceContentString(replacementMark, service) {

    var dockerCompose = fs.readFileSync('docker-compose.yml').toString();
    dockerCompose = dockerCompose.replace(replacementMark, service);
    fs.writeFileSync('docker-compose.yml', dockerCompose);

}

function requiresActiveMqCredentials(acsVersion) {
    return !!acsVersion && compare(acsVersion, '26.1', '>=');
}

function usesActiveMqCredentials(props) {
    return requiresActiveMqCredentials(props.acsVersion);
}

function applyDerivedDefaults(props) {
    if (usesActiveMqCredentials(props)) {
        props.activeMqUser = props.activeMqUser || 'admin';
        props.activeMqPassword = props.activeMqPassword || 'password';
    }
}

function getServiceTemplate(templateFile, props) {
    if (usesActiveMqCredentials(props)) {
        return 'services/26.1/' + templateFile;
    }
    return 'services/' + templateFile;
}
  
