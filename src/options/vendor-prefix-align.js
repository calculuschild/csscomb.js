'use strict';

var gonzales = require('gonzales-pe');

module.exports = (function() {
  // Vendor prefixes list:
  var PREFIXES = [
    'webkit',
    'khtml',
    'moz',
    'ms',
    'o'
  ];

  var oneline;

  /**
   * Makes namespace from property name.
   *
   * @param {String} propertyName
   * @returns {String|undefined}
   */
  function makeNamespace(propertyName) {
    var info = getPrefixInfo(propertyName);
    return info && info.baseName;
  }

  /**
   * Creates object which contains info about vendor prefix used
   * in propertyName.
   *
   * @param {String} propertyName property name
   * @param {String} [namespace=''] namespace name
   * @param {Number} [extraSymbols=0] extra symbols count
   * @returns {Object|undefined}
   */
  function getPrefixInfo(propertyName, namespace, extraSymbols) {
    var baseName = propertyName;
    var prefixLength = 0;

    namespace = namespace || '';
    extraSymbols = extraSymbols || 0;

    if (!propertyName) return;

    PREFIXES.some(function(prefix) {
      prefix = '-' + prefix + '-';
      if (propertyName.indexOf(prefix) !== 0) return;

      baseName = baseName.substr(prefix.length);
      prefixLength = prefix.length;

      return true;
    });

    return {
      id: namespace + baseName,
      baseName: baseName,
      prefixLength: prefixLength,
      extra: extraSymbols
    };
  }

  /**
   * Returns extra indent for item in arguments
   *
   * @param {Array} nodes nodes to process
   * @returns {Number|undefined}
   */
  function extraIndent(nodes) {
    if (!nodes || !nodes.length) return;

    var node;
    var crPos;
    var tabPos;
    var result = 0;

    for (var i = nodes.length; i--;) {
      node = nodes[i];

      if (!node.content) {
        crPos = -1;
      } else {
        crPos = node.content.lastIndexOf('\n');
        tabPos = node.content.lastIndexOf('\t');
        if (tabPos > crPos) crPos = tabPos;
      }

      if (crPos !== -1)
        oneline = false;

      if (node.is('space')) {
        result += node.content.length - crPos - 1;
        if (crPos !== -1)
          break;
      }
      if (node.is('multilineComment')) {
        if (crPos === -1) {
          // Comment symbols length
          let offset = 4;
          result += node.content.length + offset;
        } else {
          // Only last comment symbols length - 1 (not count \n)
          let offset = crPos - 1;
          result += node.content.length - offset;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Wrapper for extra indent function for `property` node.
   *
   * @param {Array} nodes all nodes
   * @param {Number} i position in nodes array
   */
  function extraIndentProperty(nodes, i) {
    var subset = [];
    while (i--) {
      if (!nodes.get(i) || nodes.get(i).is('declarationDelimiter'))
        break;
      subset.unshift(nodes.get(i));
    }
    return extraIndent(subset);
  }

  /**
   * Wrapper for extra indent function for val-node.
   *
   * @param {Array} nodes all nodes
   * @param {Number} i position in nodes array
   */
  function extraIndentVal(nodes, i) {
    var subset = [];
    var declaration = nodes.get(i);
    if (!declaration.is('declaration')) return;

    for (var x = declaration.length; x--;) {
      if (!declaration.get(x).is('value')) continue;

      x--;

      while (!declaration.get(x).is('propertyDelimiter')) {
        subset.push(declaration.get(x));
        x--;
      }

      break;
    }
    return extraIndent(subset);
  }

  /**
   * Walks across nodes, and call payload for every node that pass
   * selector check.
   *
   * @param {Object} args arguments in form of:
   *  {
   *      node: {object} current node,
   *      selector: {function} propertyName selector
   *      payload: {function} work to do with gathered info
   *      namespaceSelector: {function} selector for namespace
   *      getExtraSymbols: {Number} extra symbols count
   *  }
   */
  function walk(args) {
    args.node.forEach(function(item, i) {
      var name = args.selector(item);
      var namespace = args.namespaceSelector &&
                      makeNamespace(args.namespaceSelector(item));
      var extraSymbols = args.getExtraSymbols(args.node, i);

      var info = name && getPrefixInfo(name, namespace, extraSymbols);
      if (!info) return;
      args.payload(info, i);
    });
  }

  /**
   * Returns property name.
   * e.g.
   * for: 'color: #fff'
   * returns string: 'color'
   *
   * @param {node} node
   * @returns {String|undefined}
   */
  function getPropertyName(node) {
    if (!node.is('declaration')) return;
    // TODO: Check that it's not a variable
    return node.get(0).get(0).content;
  }

  /**
   * Returns property value name.
   * e.g.
   * for: '-webkit-transition: -webkit-transform 150ms linear'
   * returns string: '-webkit-transform', and
   * for: 'background: -webkit-linear-gradient(...)'
   * returns string: '-webkit-linear-gradient'
   *
   * @param {node} node
   * @returns {String|undefined}
   */
  function getValName(node) {
    if (!node.is('declaration')) return;

    var value = node.first('value');
    if (value.get(0).is('ident')) return value.get(0).content;
    if (value.get(0).is('function')) return value.get(0).get(0).content;
  }

  /**
   * Updates dict which contains info about items align.
   *
   * @param {Object} info
   * @param {Object} dict
   */
  function updateDict(info, dict) {
    if (info.prefixLength === 0 && info.extra === 0) return;

    var indent = dict[info.id] || {prefixLength: 0, extra: 0};

    let indentLength = indent.prefixLength + indent.extra;
    let infoLength = info.prefixLength + info.extra;
    if (indentLength > infoLength) {
      dict[info.id] = indent;
    } else {
      dict[info.id] = {
        prefixLength: info.prefixLength,
        extra: info.extra
      };
    }
  }

  /**
   * Returns string with correct number of spaces for info.baseName property.
   *
   * @param {Object} info
   * @param {Object} dict
   * @param {String} whitespaceNode
   * @returns {String}
   */
  function updateIndent(info, dict, whitespaceNode) {
    var item = dict[info.id];
    if (!item)
        return whitespaceNode;

    var crPos = whitespaceNode.lastIndexOf('\n');
    var tabPos = whitespaceNode.lastIndexOf('\t');
    if (tabPos > crPos) crPos = tabPos;

    var firstPart = whitespaceNode.substr(0, crPos + 1);
    var extraIndent = new Array(
        (item.prefixLength - info.prefixLength) +
        (item.extra - info.extra) +
        whitespaceNode.length - firstPart.length +
        1).join(' ');

    return firstPart.concat(extraIndent);
  }

  return {
    name: 'vendor-prefix-align',
    runBefore: 'align-colons',
    syntax: ['css', 'less', 'sass', 'scss'],

    accepts: {
      boolean: [true]
    },

    /**
     * Processes tree node.
     *
     * @param {node} ast
     */
    process: function(ast) {
      ast.traverseByType('block', function(node) {
        oneline = true;

        var dict = {};

        // Gathering Info
        walk({
          node: node,
          selector: getPropertyName,
          getExtraSymbols: extraIndentProperty,
          payload: function(info) {
            updateDict(info, dict);
          }
        });

        walk({
          node: node,
          selector: getValName,
          namespaceSelector: getPropertyName,
          getExtraSymbols: extraIndentVal,
          payload: function(info) {
            updateDict(info, dict);
          }
        });

        if (oneline && ast.syntax !== 'sass') return;

        // Update nodes
        walk({
          node: node,
          selector: getValName,
          namespaceSelector: getPropertyName,
          getExtraSymbols: extraIndentVal,
          payload: function(info, i) {
            for (var x = node.get(i).length; x--;) {
              if (node.get(i).get(x).is('value')) break;
            }

            let prevNode = node.get(i).get(x - 1);
            if (!prevNode.is('space')) {
              var space = gonzales.createNode({
                type: 'space',
                content: ''
              });
              node.get(i).insert(x, space);
              ++x;
            }

            let content = node.get(i).get(x - 1).content;
            let updatedIndent = updateIndent(info, dict, content);
            node.get(i).get(x - 1).content = updatedIndent;
          }
        });

        if (ast.syntax === 'sass') return;

        walk({
          node: node,
          selector: getPropertyName,
          getExtraSymbols: extraIndentProperty,
          payload: function(info, i) {
            // `node.get(i - 1)` can be either space or comment:
            var whitespaceNode = node.get(i - 1);
            if (!whitespaceNode) return;
            // If it's a comment, insert an empty space node:
            if (!whitespaceNode.is('space')) {
              whitespaceNode = gonzales.createNode({
                type: 'space',
                content: ''
              });
              node.insert(i - 1, whitespaceNode);
            }
            let content = whitespaceNode.content;
            let updatedContent = updateIndent(info, dict, content);
            whitespaceNode.content = updatedContent;
          }
        });
      });
    },

    /**
     * Detects the value of an option at the tree node.
     *
     * @param {node} ast
     */
    detect: function(ast) {
      let detected = [];

      ast.traverseByType('block', function(node) {
        var result = {
          true: 0,
          false: 0
        };

        var maybePrefix = false;
        var prevPrefixLength = false;
        var prevProp;
        var prevSum;
        var partialResult = null;

        var getResult = function(options) {
          let {node, sum, info, i} = options;
          var prop = info.baseName;

          // If this is the last item in a row and we have a result,
          // then catch it
          if (prop !== prevProp && partialResult !== null) {
            if (partialResult) {
              result.true++;
            } else {
              result.false++;
            }
            partialResult = null;
          }

          if (prop === prevProp &&
              info.prefixLength !== prevPrefixLength) {
            maybePrefix = true;
          } else {
            maybePrefix = false;
          }

          if (maybePrefix && partialResult !== false) {
            // If there is prefixed prop, check if the prefixes are
            // aligned, but only if we hadn't already catched
            // that it is false
            if (sum === prevSum) {
              partialResult = true;
            } else {
              partialResult = false;
            }
          }

          if (node.length === i + 3 && partialResult !== null) {
            // If we're at the last property and have a result,
            // catch it
            if (partialResult) {
              result.true++;
            } else {
              result.false++;
            }
          }

          prevPrefixLength = info.prefixLength;
          prevProp = prop;
          prevSum = sum;
        };

        // Gathering Info
        walk({
          node: node,
          selector: getPropertyName,
          getExtraSymbols: extraIndentProperty,
          payload: function(info, i) {
            if (node.get(i - 1) && node.get(i - 1).content) {
              let nodeLength = node.get(i - 1).content
                  .replace(/^[ \t]*\n+/, '').length;
              var sum = nodeLength + info.prefixLength;
              getResult({node: node, sum: sum, info: info, i: i});
            }
          }
        });

        walk({
          node: node,
          selector: getValName,
          getExtraSymbols: extraIndentVal,
          payload: function(info, i) {
            for (var x = node.get(i).length; x--;) {
              if (node.get(i).get(x).is('value')) break;
            }

            if (node.get(i).get(x - 1)) {
              let nodeLength = node.get(i).get(x - 1).content
                  .replace(/^[ \t]*\n+/, '').length;
              var sum = nodeLength + info.prefixLength;
              getResult({node: node, sum: sum, info: info, i: i});
            }
          }
        });

        if (result.true > 0 || result.false > 0) {
          if (result.true >= result.false) {
            detected.push(true);
          } else {
            detected.push(false);
          }
        }
      });

      return detected;
    }
  };
})();
