/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var path = require('path');

var doxyparser = require('./src/parser');
var templates = require('./src/templates');
var helpers = require('./src/helpers');

module.exports = {

  // Export logger so it can be initialized by importing module
  logger: require('./src/logger'),

  /**
   * Default options values.
   **/
  defaultOptions: {

    directory: null,            /** Location of the doxygen files **/
    output: 'api.md',           /** Output file **/
    groups: false,              /** Output doxygen groups separately **/
    noindex: false,             /** Disable generation of the index. Does not work with `groups` option **/
    anchors: true,              /** Generate anchors for internal links **/
    language: 'cpp',            /** Programming language **/
    templates: 'templates',     /** Templates directory **/
    pages: false,               /** Output doxygen pages separately **/
    classes: false,             /** Output doxygen classes separately **/
    output_s: 'api_%s.md',      /** Output file for groups and classes **/
    logfile: 'moxygen.log',     /** Log file **/
    relativePaths: false,       /** Use relative paths (omit output base path) **/
    separator: '::',            /** Group separator sequence **/
    accessLevel: 'private',     /** Minimum access level to be considered **/

    filters: {
      members: [
        'define',
        'enum',
        // 'enumvalue',
        'func',
        // 'variable',
        'property',
        'public-attrib',
        'public-func',
        'protected-attrib',
        'protected-func',
        'signal',
        'public-slot',
        'protected-slot',
        'public-type',
        'private-attrib',
        'private-func',
        'private-slot',
        'public-static-func',
        'private-static-func',
      ],
      compounds: [
        'namespace',
        'class',
        'struct',
        'union',
        'typedef',
        'interface',
        // 'file',
      ]
    },
  },

  /**
   * Parse files and render the output.
   **/
  run: function (options) {

    // Sanitize options
    if (typeof options.output == "undefined") {
      if (options.classes || options.groups) {
        options.output = this.defaultOptions.output_s;
      }
      else {
        options.output = this.defaultOptions.output;
      }
    }

    if ((options.classes || options.groups) && options.output.indexOf('%s') === -1) {
      throw "The `output` file parameter must contain an '%s' for group or class name " +
        "substitution when `groups` or `classes` are enabled."
    }

    if (typeof options.templates == "undefined") {
      options.templates = path.join(__dirname, this.defaultOptions.templates, options.language);
    }

    if(options.accessLevel && options.accessLevel !== 'private' && options.accessLevel !== 'protected' && options.accessLevel !== 'public'){
      throw "The `accessLevel` option must be one of 'private', 'protected', or 'public'"
    }

    // Load templates
    templates.registerHelpers(options);
    templates.load(options.templates);

    // Parse files
    doxyparser.loadIndex(options, function (err, root) {
      if (err)
        throw err;
      // Output groups
      if (options.groups) {
        var groups = root.toArray('compounds', 'group');
        if (!groups.length)
          throw "You have enabled `groups` output, but no groups were " +
            "located in your doxygen XML files."

        groups.forEach(function (group) {
          group.filterChildren(options.filters, group.id);

          var compounds = group.toFilteredArray('compounds');
          compounds.unshift(group); // insert group at top
          helpers.writeCompound(group, templates.renderArray(compounds), doxyparser.references, options);
        });
      }
      else if (options.classes) {
        var rootCompounds = root.toArray('compounds', 'class');
        if (!rootCompounds.length)
          throw "You have enabled `classes` output, but no classes were " +
            "located in your doxygen XML files."
        rootCompounds.forEach(function (comp) {
          comp.filterChildren(options.filters);
          var compounds = comp.toFilteredArray();
          helpers.writeCompound(comp, [templates.render(comp)], doxyparser.references, options);
          compounds.forEach(function (e) {
            e.filterChildren(options.filters)
            helpers.writeCompound(e, [templates.render(e)], doxyparser.references, options);
          });
        });
      }
      // Output single file
      else {
        root.filterChildren(options.filters);

        var compounds = root.toFilteredArray('compounds');
        if (!options.noindex)
          compounds.unshift(root); // insert root at top if index is enabled
        var contents = templates.renderArray(compounds);
        // contents.push('Generated by [Moxygen](https://github.com/sourcey/moxygen)')
        helpers.writeCompound(root, contents, doxyparser.references, options);
      }

      if(options.pages){
        var pages = root.toArray('compounds', 'page');
        if(!pages.length)
          throw "You have enabled `pages` output, but no pages were " +
            "located in your doxygen XML files."
        pages.forEach(function(page){
          var compounds = page.toFilteredArray('compounds');
          compounds.unshift(page);
          helpers.writeCompound(page, templates.renderArray(compounds), doxyparser.references, options);
        })
      }

    });
  },
}
