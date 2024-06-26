/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var fs = require('fs');
var log = require('./logger').getLogger();
var path = require('path');
var handlebars = require('handlebars');
// var tidyMarkdown = require('tidy-markdown');

var doxyparser = require('./parser');
var helpers = require('./helpers');
var markdown = require('./markdown');

module.exports = {

  // Loaded templates
  templates: {},

  // Load templates from the given directory
  load: function (templateDirectory) {
    fs.readdirSync(templateDirectory).forEach(function (filename) {
      var fullname = path.join(templateDirectory, filename);
      // Skip files that are no markdown files
      if (!filename.match(/\.md$/)) {
        return;
      }
      
      const templateBasename = path.basename(filename, '.md');

      var template = handlebars.compile(fs.readFileSync(fullname, 'utf8'), {
        noEscape: true,
        strict: true
      });
      this.templates[templateBasename] = template;
    }.bind(this));
  },

  render: function (compound) {
    var template;

    log.verbose('Rendering ' + compound.kind + ' ' + compound.fullname);

    switch (compound.kind) {
      case 'index':
        template = 'index';
        break;
      case 'page':
        template = 'page'
        break;
      case 'group':
      case 'namespace':
        if (Object.keys(compound.compounds).length === 1
          && compound.compounds[Object.keys(compound.compounds)[0]].kind == 'namespace') {
          return undefined;
        }
        template = 'namespace';
        break;
      case 'class':
      case 'struct':
      case 'interface':
        template = 'class';
        break;
      default:
        log.warn('Cannot render ' + compound.kind + ' ' + compound.fullname);
        console.log('Skipping ', compound);
        return undefined;
    }

    if (typeof this.templates[template] == "undefined") {
      throw 'Template "' + template + '" not found in your templates directory.';
    }

    return this.templates[template](compound).replace(/(\r\n|\r|\n){3,}/g, '$1\n');
  },

  renderArray: function (compounds) {
    return compounds.map(function(compound) {
      return this.render(compound);
    }.bind(this));
  },

  // Register handlebars helpers
  registerHelpers: function (options) {

    // Escape the code for a table cell.
    handlebars.registerHelper('cell', function(code) {
      return code.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
    });

    // Escape the code for a titles.
    handlebars.registerHelper('title', function(code) {
      return code.replace(/\n/g, '<br/>');
    });

    // Generate an anchor for internal links
    handlebars.registerHelper('anchor', function(name) {
      return helpers.getAnchor(name, options);
    });

    // Give the current language name
    handlebars.registerHelper('language', () => options.language)

    // Strips formatting from the prototype
    handlebars.registerHelper('stripmarkdown', function(prototype) {
      return helpers.stripMarkdown(prototype);
    });

    handlebars.registerHelper('adjust-access-modifiers', function(prototype) {
      if(!options.showAccessModifiers) {
        return helpers.stripAccessModifiers(prototype);
      }
      return prototype;
    });

  },
};
