'use strict';
const Generator = require('yeoman-generator');
var banner = require('./banner');
var fs = require('fs');

module.exports = class extends Generator {

    initializing() {

        this.log('--------------------');
        this.log('This project requires credentials to access to private Alfresco Docker Registry hosted in quay.io');
        this.log('Contact with Hyland support to get those credentials');
        this.log('-------------------');

    }

    prompting() {

        if (!this.options['skip-install-message']) {
            this.log(banner);
        }

        const prompts = [
            {
                type: 'list',
                name: 'acsVersion',
                message: 'Which ACS version do you want to use?',
                choices: [ '7.1' ],
                default: '7.1'
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
              message: 'Do you want to use Search Service (SOLR 6), Insight Engine (SOLR 6 with SQL) or Search Enterprise (Elasticsearch) as search service?',
              choices: [ 'search-service', 'insight-engine', 'search-enterprise' ],
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

    writing() {

        this.fs.copyTpl(
            this.templatePath(this.props.acsVersion + '/.env'),
            this.destinationPath('.env')
        )

        this.fs.copyTpl(
            this.templatePath(this.props.acsVersion + '/docker-compose.yml'),
            this.destinationPath('docker-compose.yml'), {
                transform: this.props.transform,
                search: this.props.search,
                share: this.props.share ? 'true' : 'false',
                sync: this.props.sync ? 'true' : 'false',
                adw: this.props.adw ? 'true' : 'false'
            }
        )

    }

    end() {

        if (this.props.share) {
            replaceContent('# share', 'services/share.yml', this);
        }
        
        if (this.props.sync) {
            replaceContent('# sync-service', 'services/sync-service.yml', this);
        }

        if (this.props.adw) {
            replaceContent('# digital-workspace', 'services/digital-workspace.yml', this);
        }

        if (this.props.transform == 't-engine') {
            replaceContent('# transform-service', 'services/transform-engine.yml', this);
        }

        if (this.props.transform == 't-service') {
            replaceContent('# transform-service', 'services/transform-service.yml', this);
            replaceContent('# transform-volume', 'services/transform-service-volume.yml', this);
        }
        
        if (this.props.search == 'search-service') {
            replaceContent('# search-service', 'services/search-service.yml', this);
        }

        if (this.props.search == 'insight-engine') {            
            replaceContent('# search-service', 'services/insight-engine.yml', this);
        }

        if (this.props.zeppelin) {
            replaceContent('# zeppelin', 'services/zeppelin.yml', this);
        }

        if (this.props.search == 'search-enterprise') {            
            replaceContent('# search-service', 'services/search-enterprise.yml', this);
            if (this.props.transform == 't-engine') {
                this.log('WARNING: Search Enterprise will be indexing only metadata, since Transform Service is using T-Engine.');
                this.log('To index also content, choose T-Service for Transform Service.');
            }
        }
      
    }

};

function replaceContent(replacementMark, templateFile, yo) {

    var dockerCompose = fs.readFileSync('docker-compose.yml').toString();
    var share = yo.fs.read(yo.templatePath(templateFile));
    dockerCompose = dockerCompose.replace(replacementMark, share);
    fs.writeFileSync('docker-compose.yml', dockerCompose);

}
  