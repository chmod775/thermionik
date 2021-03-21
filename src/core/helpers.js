uuidCnt = 0;

class Helpers {
  static ParseTemplate(template, placeholders, evalAsJS) {
    if (evalAsJS) {
      return new Function(template).call(placeholders);
    } else {
      for (var pKey in placeholders) {
        let pVal = placeholders[pKey];
        template = template.replaceAll(pKey, pVal);
      }
      return template;  
    }
  }

  static FunctionOrValue(target) {
    if (target instanceof Function)
      return target();
    else
      return target;
  }

  /*
  static uuidv4() {
    return "10000000_1000_4000_8000_100000000000".replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
  */

  static uuidv4() {
    uuidCnt++;
    return uuidCnt;
  }

  static hashString(str) {
    var hash = 0, i, chr;
    for (i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash >>> 0;
  }

  static download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }

  static readUploadedFileAsText(inputFile) {
    const temporaryFileReader = new FileReader();
  
    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException("Problem parsing input file."));
      };
  
      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result);
      };
      temporaryFileReader.readAsText(inputFile);
    });
  };

  async handleUpload (event) {
    const file = event.target.files[0];
    console.log(file);

    try {
      const fileContents = await Helpers.readUploadedFileAsText(file)  
      ui.Load(fileContents)
    } catch (e) {
      console.error(e.message);
    }
  }

  static pFileReader(file){
    return new Promise((resolve, reject) => {
      var fr = new FileReader();  
      fr.onload = resolve;  // CHANGE to whatever function you want which would eventually call resolve
      fr.readAsDataURL(file);
    });
  }

  static posToRef(pos) {
    return Helpers.numToSSColumn(pos.col ?? 1) + (pos.row ?? 1);
  }

  static refToPos(ref) {
    let ret = { col: 0, row: 0 };
    ref = ref.toUpperCase();

    for (var ch of ref) {
      let chCode = ch.charCodeAt(0);

      if ((ch >= '0') && (ch <= '9')) {
        ret.row *= 10;
        ret.row |= chCode - 48;
      } else if ((ch >= 'A') && (ch <= 'Z')) {
        ret.col *= 26;
        ret.col |= chCode - 64;
      } else {
        console.error("Character not valid for reference.", ref);
        return null;
      }
    }

    return ret;
  }

  static numToSSColumn(num){
    var s = '', t;
  
    while (num > 0) {
      t = (num - 1) % 26;
      s = String.fromCharCode(65 + t) + s;
      num = (num - t)/26 | 0;
    }
    return s || undefined;
  }

  static SSColumToNum(ss) {

  }

  static JSONClean(obj) {
    return JSON.stringify(obj).replace(/"(\w+)"\s*:/g, '$1:');
  }
}
/*
var json = typeof JSON !== 'undefined' ? JSON : require('jsonify');

module.exports = function (obj, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var space = opts.space || '';
    if (typeof space === 'number') space = Array(space+1).join(' ');
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
    var replacer = opts.replacer || function(key, value) { return value; };

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (parent, key, node, level) {
        var indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
        var colonSeparator = space ? ': ' : ':';

        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        node = replacer.call(parent, key, node);

        if (node === undefined) {
            return;
        }
        if (typeof node !== 'object' || node === null) {
            return json.stringify(node);
        }
        if (isArray(node)) {
            var out = [];
            for (var i = 0; i < node.length; i++) {
                var item = stringify(node, i, node[i], level+1) || json.stringify(null);
                out.push(indent + space + item);
            }
            return '[' + out.join(',') + indent + ']';
        }
        else {
            if (seen.indexOf(node) !== -1) {
                if (cycles) return json.stringify('__cycle__');
                throw new TypeError('Converting circular structure to JSON');
            }
            else seen.push(node);

            var keys = objectKeys(node).sort(cmp && cmp(node));
            var out = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = stringify(node, key, node[key], level+1);

                if(!value) continue;

                var keyValue = json.stringify(key)
                    + colonSeparator
                    + value;
                ;
                out.push(indent + space + keyValue);
            }
            seen.splice(seen.indexOf(node), 1);
            return '{' + out.join(',') + indent + '}';
        }
    })({ '': obj }, '', obj, 0);
};

var isArray = Array.isArray || function (x) {
    return {}.toString.call(x) === '[object Array]';
};

var objectKeys = Object.keys || function (obj) {
    var has = Object.prototype.hasOwnProperty || function () { return true };
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};
*/