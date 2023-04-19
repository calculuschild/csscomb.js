'use strict';

var gonzales = require('gonzales-pe');

let option = {
  /**
   * Option's name as it's used in config.
   * @type {String}
   */
  get name() {
    return 'align-colons';
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
    const treeString = ast.toString();
    const tempAst = gonzales.parse(treeString, {syntax: ast.syntax, context: ast.type});
    ast.content = tempAst.content;
    ast.end     = tempAst.end;

    ast.traverseByType('block', function (block, i, parent) {
      let maxColonPos = 0;
      block.forEach('declaration', function(declaration, j, parent) {
        let colonPos = declaration.first('propertyDelimiter').start.column;
        maxColonPos = Math.max(maxColonPos, colonPos);
      });
      block.forEach('declaration', function(declaration, j, parent) {
        declaration.eachFor('propertyDelimiter', function(propertyDelimiter, j, parent2) {
          let colonPos = propertyDelimiter.start.column;
          let spaces = '';
          if (parent2.get(j - 1).is('space')) {
            spaces = parent2.get(j - 1).content;
            parent2.removeChild(j - 1);
            j--;
          }
          spaces += ' '.repeat(maxColonPos - colonPos);
          let newSpace = gonzales.createNode({
            type: 'space',
            content: spaces,
            syntax: parent2.syntax
          });
          parent2.insert(j, newSpace);
        });
      });
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
