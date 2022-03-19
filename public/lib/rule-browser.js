(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Rule = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const fs = require('fs');
const certLogicJs = require('certlogic-js');

class Rule {
  static fromFile(filePath, external = {}) {
    return Rule.fromJSON(JSON.parse(fs.readFileSync(filePath)), external);
  }

  static fromJSON(ruleJSON, external = {}) {
    const rule = new Rule();
    rule._external = external;
    rule._payload = ruleJSON;
    return rule;
  }

  get payload() {
    return this._payload;
  }

  get identifier() {
      return this._payload.Identifier;
  }

  getDescription(language = 'en') {
    const description = this._payload.Description.find((element) => element.lang === language);
    return description ? description.desc : null;
  }

  evaluateDCC(dcc, external = {}) {
    const options = { ...this._external, ...external };
    return certLogicJs.evaluate(this.payload.Logic, {
      payload: dcc,
      external: options,
    });
  }
}

module.exports = Rule;
},{"certlogic-js":3,"fs":7}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = void 0;
const typings_1 = require("./typings");
const internals_1 = require("./internals");
const evaluateVar = (value, data) => {
    
    if (typeof value !== "string") {
        throw new Error(`not of the form { "var": "<path>" }`);
    }
    const path = value;
    if (path === "") { // "it"
        return data;
    }
    return path.split(".").reduce((acc, fragment) => {
        if (acc === null) {
            return null;
        }
        
        const index = parseInt(fragment, 10);
        const value = isNaN(index) ? acc[fragment] : acc[index];
        return value === undefined ? null : value;
    }, data);
};
const evaluateIf = (guard, then, else_, data) => {
    if (guard === undefined) {
        throw new Error(`an if-operation must have a guard (argument #1)`);
    }
    if (then === undefined) {
        throw new Error(`an if-operation must have a then (argument #2)`);
    }
    if (else_ === undefined) {
        throw new Error(`an if-operation must have an else (argument #3)`);
    }
    const evalGuard = exports.evaluate(guard, data);
    if (internals_1.isTruthy(evalGuard)) {
        return exports.evaluate(then, data);
    }
    if (internals_1.isFalsy(evalGuard)) {
        return exports.evaluate(else_, data);
    }
    throw new Error(`if-guard evaluates to something neither truthy, nor falsy: ${evalGuard}`);
};
const compareFunctionFor = (operator) => (l, r) => {
    switch (operator) {
        case "<": return l < r;
        case ">": return l > r;
        case "<=": return l <= r;
        case ">=": return l >= r;
    }
};
const compare = (operator, values) => {
    const compFunc = compareFunctionFor(operator);
    switch (values.length) {
        case 2: return compFunc(values[0], values[1]);
        case 3: return compFunc(values[0], values[1]) && compFunc(values[1], values[2]);
        default: throw new Error(`invalid number of operands to a "${operator}" operation`);
    }
};
const comparisonOperatorForDateTimeComparison = (operator) => {
    switch (operator) {
        case "after": return ">";
        case "before": return "<";
        case "not-after": return "<=";
        case "not-before": return ">=";
    }
};
const evaluateInfix = (operator, values, data) => {
    switch (operator) {
        case "and": {
            if (values.length < 2)
                throw new Error(`an "and" operation must have at least 2 operands`);
            break;
        }
        case "<":
        case ">":
        case "<=":
        case ">=":
        case "after":
        case "before":
        case "not-after":
        case "not-before": {
            if (values.length < 2 || values.length > 3)
                throw new Error(`an operation with operator "${operator}" must have 2 or 3 operands`);
            break;
        }
        default: {
            if (values.length !== 2)
                throw new Error(`an operation with operator "${operator}" must have 2 operands`);
            break;
        }
    }
    var evalArgs = [];
    values.map((arg) => {evalArgs.push(exports.evaluate(arg, data))});
    // console.log(evalArgs)
    switch (operator) {
        case "===": return evalArgs[0] === evalArgs[1];
        case "in": {
            const r = evalArgs[1];
            if (!Array.isArray(r)) {
                throw new Error(`right-hand side of an "in" operation must be an array`);
            }
            return r.indexOf(evalArgs[0]) > -1;
        }
        case "+": {
            const l = evalArgs[0];
            const r = evalArgs[1];
            if (!internals_1.isInt(l) || !internals_1.isInt(r)) {
                throw new Error(`operands of this operation must both be integers`);
            }
            return l + r;
        }
        case "and": return values.reduce((acc, current) => {
            if (internals_1.isFalsy(acc)) {
                return acc;
            }
            if (internals_1.isTruthy(acc)) {
                return exports.evaluate(current, data);
            }
            throw new Error(`all operands of an "and" operation must be either truthy or falsy`);
        }, true);
        case "<":
        case ">":
        case "<=":
        case ">=": {
            if (!evalArgs.every(internals_1.isInt)) {
                throw new Error(`all operands of a comparison operation must be of integer type`);
            }
            return compare(operator, evalArgs);
        }
        case "after":
        case "before":
        case "not-after":
        case "not-before": {
            if (!evalArgs.every(internals_1.isDate)) {
                throw new Error(`all operands of a date-time comparison must be date-times`);
            }
            return compare(comparisonOperatorForDateTimeComparison(operator), evalArgs);
        }
        default: throw new Error(`unhandled infix operator "${operator}"`);
    }
};
const evaluateNot = (operandExpr, data) => {
    const operand = exports.evaluate(operandExpr, data);
    if (internals_1.isFalsy(operand)) {
        return true;
    }
    if (internals_1.isTruthy(operand)) {
        return false;
    }
    throw new Error(`operand of ! evaluates to something neither truthy, nor falsy: ${operand}`);
};
const evaluatePlusTime = (dateOperand, amount, unit, data) => {
    if (!internals_1.isInt(amount)) {
        throw new Error(`"amount" argument (#2) of "plusTime" must be an integer`);
    }
    if (typings_1.timeUnits.indexOf(unit) === -1) {
        throw new Error(`"unit" argument (#3) of "plusTime" must be a string with one of the time units: ${typings_1.timeUnits.join(", ")}`);
    }
    const dateTimeStr = exports.evaluate(dateOperand, data);
    
    if (typeof dateTimeStr !== "string") {
        throw new Error(`date argument of "plusTime" must be a string`);
    }
    return internals_1.plusTime(dateTimeStr, amount, unit);
};
const evaluateReduce = (operand, lambda, initial, data) => {
    const evalOperand = exports.evaluate(operand, data);
    const evalInitial = () => exports.evaluate(initial, data);
    if (evalOperand === null) {
        return evalInitial();
    }
    if (!Array.isArray(evalOperand)) {
        throw new Error(`operand of reduce evaluated to a non-null non-array`);
    }
    return evalOperand
        .reduce((accumulator, current) => exports.evaluate(lambda, { accumulator, current /* (patch:) , data */ }), evalInitial());
};
const evaluate = (expr, data) => {
    if (typeof expr === "string" || internals_1.isInt(expr) || typeof expr === "boolean") {
        return expr;
    }
    if (expr === null) {
        throw new Error(`invalid CertLogic expression: ${expr}`);
    }
    if (Array.isArray(expr)) {
        return expr.map((item) => exports.evaluate(item, data));
    }
    if (typeof expr === "object") { // That includes Date objects, but those have no keys, so are returned as-is.
        const keys = Object.keys(expr);
        if (keys.length !== 1) {
            throw new Error(`unrecognised expression object encountered`);
        }
        const operator = keys[0];
        const values = expr[operator];
        if (operator === "var") {
            return evaluateVar(values, data);
        }
        if (!(Array.isArray(values) && values.length > 0)) {
            throw new Error(`operation not of the form { "<operator>": [ <values...> ] }`);
        }
        if (operator === "if") {
            const [guard, then, else_] = values;
            return evaluateIf(guard, then, else_, data);
        }
        if (["===", "and", ">", "<", ">=", "<=", "in", "+", "after", "before", "not-after", "not-before"].indexOf(operator) > -1) {
            return evaluateInfix(operator, values, data);
        }
        if (operator === "!") {
            return evaluateNot(values[0], data);
        }
        if (operator === "plusTime") {
            return evaluatePlusTime(values[0], values[1], values[2], data);
        }
        if (operator === "reduce") {
            return evaluateReduce(values[0], values[1], values[2], data);
        }
        throw new Error(`unrecognised operator: "${operator}"`);
    }
    throw new Error(`invalid CertLogic expression: ${expr}`);
};
exports.evaluate = evaluate;

},{"./internals":4,"./typings":5}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = exports.evaluate = exports.isInt = void 0;
var internals_1 = require("./internals"); // (export other internals only when necessary)
Object.defineProperty(exports, "isInt", { enumerable: true, get: function () { return internals_1.isInt; } });
var evaluator_1 = require("./evaluator");
Object.defineProperty(exports, "evaluate", { enumerable: true, get: function () { return evaluator_1.evaluate; } });
exports.version = require("../package.json").version;

},{"../package.json":6,"./evaluator":2,"./internals":4}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plusTime = exports.dateFromString = exports.isDate = exports.isInt = exports.isTruthy = exports.isFalsy = void 0;
const isDictionary = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/**
 * @returns Whether the given `value` is considered *falsy* by CertLogic.
 * Note: the notions of both falsy and truthy are narrower than those of JavaScript, and even of JsonLogic.
 * Truthy and falsy values can be used for conditional logic, e.g. the guard of an `if`-expression.
 * Values that are neither truthy nor falsy (many of which exist) can't be used for that.
 */
const isFalsy = (value) => value === false
    || value === null
    || (typeof value === "string" && value === "")
    || (typeof value === "number" && value === 0)
    || (Array.isArray(value) && value.length === 0)
    || (isDictionary(value) && Object.keys(value).length === 0);
exports.isFalsy = isFalsy;
/**
 * @returns Whether the given `value` is considered *truthy* by CertLogic.
 * @see isFalsy
 */
const isTruthy = (value) => value === true
    || (typeof value === "string" && value !== "")
    || (typeof value === "number" && value !== 0)
    || (Array.isArray(value) && value.length > 0)
    || (isDictionary(value) && Object.keys(value).length > 0);
exports.isTruthy = isTruthy;
const isInt = (value) => typeof value === "number" && Number.isInteger(value);
exports.isInt = isInt;
const isDate = (value) => typeof value === "object" && "toISOString" in value;
exports.isDate = isDate;
const leftPad = (str, len, char) => char.repeat(len - str.length) + str;
/**
 * @returns A JavaScript {@see Date} object representing the date or date-time given as a string.
 * @throws An {@see Error} in case the string couldn't be parsed as a date or date-time.
 */
const dateFromString = (str) => {
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(str);
    }
    const matcher = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+?)?(Z|(([+-])(\d{1,2}):?(\d{2})?))?$/);
    //                                   1      2       3       4       5       6      7        8   910    11          12
    if (matcher) {
        let reformatted = `${matcher[1]}-${matcher[2]}-${matcher[3]}T${matcher[4]}:${matcher[5]}:${matcher[6]}`;
        if (matcher[7]) {
            reformatted += matcher[7].padEnd(4, "0").substring(0, 4);
        }
        if (!matcher[8] || (matcher[8] === "Z")) {
            reformatted += "Z"; // Assume timezone offset 'Z' when missing.
        }
        else {
            reformatted += matcher[10] + leftPad(matcher[11], 2, "0") + ":" + (matcher[12] || "00");
        }
        return new Date(reformatted);
    }
    throw new Error(`not an allowed date or date-time format: ${str}`);
};
exports.dateFromString = dateFromString;
const plusTime = (dateTimeLikeStr, amount, unit) => {
    const dateTime = exports.dateFromString(dateTimeLikeStr);
    if (amount === 0) {
        return dateTime;
    }
    if (unit === "day") {
        dateTime.setUTCDate(dateTime.getUTCDate() + amount);
    }
    else if (unit === "hour") {
        dateTime.setUTCHours(dateTime.getUTCHours() + amount);
    }
    else if (unit === "month") {
        dateTime.setUTCMonth(dateTime.getUTCMonth() + amount);
    }
    else if (unit === "year") {
        const wasMonth = dateTime.getUTCMonth();
        dateTime.setUTCFullYear(dateTime.getUTCFullYear() + amount);
        if (dateTime.getUTCMonth() > wasMonth) {
            dateTime.setUTCDate(dateTime.getUTCDay() - 1);
        }
    }
    else {
        throw new Error(`unknown time unit "${unit}"`);
    }
    return dateTime;
};
exports.plusTime = plusTime;

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeUnits = void 0;
exports.timeUnits = ["year", "month", "day", "hour"];

},{}],6:[function(require,module,exports){
module.exports={
  "name": "certlogic-js",
  "version": "0.8.2",
  "description": "Implementation of CertLogic in TypeScript (including validation).",
  "keywords": [
    "json",
    "logic",
    "jsonlogic",
    "rules",
    "validation",
    "validator"
  ],
  "homepage": "https://github.com/ehn-dcc-development/dgc-business-rules/tree/main/certlogic",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ehn-dcc-development/dgc-business-rules.git"
  },
  "bugs": {
    "url": "https://github.com/ehn-dcc-development/dgc-business-rules/issues"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "build-watch": "tsc --watch --incremental",
    "pretest": "npm run build",
    "test": "mocha dist/test",
    "test-watch": "mocha --watch dist/test",
    "clean": "rm -rf dist/ && rm -rf node_modules/ && rm -rf package-lock.json && rm -rf yarn.lock"
  },
  "bin": {
    "certlogic-run": "dist/cli.js",
    "certlogic-validate": "dist/validation/cli.js"
  },
  "author": "Meinte Boersma <meinte.boersma@gmail.com>",
  "contributors": [
    "Steffen Schulze",
    "Denzil Ferreira <denzil.ferreira@solita.fi>"
  ],
  "license": "Apache-2.0",
  "devDependencies": {
    "@types/chai": "^4.2.18",
    "@types/deep-equal": "^1.0.1",
    "@types/mocha": "^8.2.2",
    "@types/node": "^15.12.1",
    "chai": "^4.3.4",
    "mocha": "^8.4.0",
    "typescript": "^4.3.4"
  }
}

},{}],7:[function(require,module,exports){

},{}]},{},[1])(1)
});
