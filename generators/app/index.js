'use strict';
const Generator = require('yeoman-generator');
var banner = require('./banner');
var fs = require('fs');

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
                choices: [ '7.1', '7.2' ],
                default: '7.2'
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
              type: 'confirm',
              name: 'sync',
              message: 'Do you want to use Sync Service?',
              default: false
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
        });

    }

    // Producing 'docker-compose.yml' output file and temporary partial services
    writing() {

        this.fs.copyTpl(
            this.templatePath(this.props.acsVersion + '/.env'),
            this.destinationPath('.env')
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
                adw: this.props.adw ? 'true' : 'false'
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

        if (this.props.share) {
            replaceContentTemplate('# share', 'services/share.yml', this);
        }
        
        if (this.props.sync) {
            replaceContentTemplate('# sync-service', 'services/sync-service.yml', this);
        }

        if (this.props.adw) {
            replaceContentTemplate('# digital-workspace', 'services/digital-workspace.yml', this);
        }

        if (this.props.transform == 't-engine') {
            replaceContentTemplate('# transform-service', 'services/transform-engine.yml', this);
        }

        if (this.props.transform == 't-service') {
            replaceContentTemplate('# transform-service', 'services/transform-service.yml', this);
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
            replaceContentTemplate('# search-service', 'services/search-enterprise-elasticsearch.yml', this);
            if (this.props.transform == 't-engine') {
                this.log('WARNING: Search Enterprise will be indexing only metadata, since Transform Service is using T-Engine.');
                this.log('To index also content, choose T-Service for Transform Service.');
            }
        }
      
        if (this.props.search == 'search-enterprise-opensearch') {            
            replaceContentTemplate('# search-service', 'services/search-enterprise-opensearch.yml', this);
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
  