'use strict';

var gonzales = require('gonzales-pe');

let option = {
  /**
   * Option's name as it's used in config.
   * @type {String}
   */
  get name() {
    return 'inline-single-declarations';
  },

  /**
   * Name of option that must run after this option.
   * @type {String}
   */
  get runBefore() {
    return '';
  },

  /**
   * List of syntaxes that are supported by this option.
   * @type {Array}
   */
  get syntax() {
    return ['css', 'less', 'sass', 'scss'];
  },

  /**
   * Types of values this option accepts in config.
   * @type {Object}
   */
  get accepts() {
    return {
      boolean: [true]
    };
  },

  /**
   * Processes ast and fixes found code style errors.
   * @param {Node} ast
   */
  process(ast) {
    //re-parse ast since previous options may have invalidated the start/end positions
    // const treeString = ast.toString();
    // const tempAst = gonzales.parse(treeString, {syntax: ast.syntax, context: ast.type});
    // ast.content = tempAst.content;
    // ast.end     = tempAst.end;

    ast.traverseByType('block', function (block, i, parent) {
      let childCount = 0;
      block.forEach(function(child, j, parent2) {
        if(child.is('declaration') || child.is('ruleset'))
          childCount += 1;
      });
      if(childCount <= 1) {
        block.eachFor('space', function(declaration, j, parent2) {
          parent2.removeChild(j);
        });
      }
    });
  },

  /**
   * Detects the value of this option in ast.
   * @param {Node} ast
   * @return {Array} List of detected values
   */
  detect(ast) {
    var detected = [];
    
    ast.traverseByType('block', function (block, i, parent) {
      let isAligned = true;
      let maxColonPos = block.first('declaration').first('propertyDelimiter').start.column;
      block.forEach('declaration', function(declaration, j, parent) {
        let colonPos = declaration.first('propertyDelimiter').start.column;
        if(maxColonPos != colonPos) {
          isAligned = false;
        }
      });
      detected.push(isAligned);
    });

    return detected;
  }

};
module.exports = option;
