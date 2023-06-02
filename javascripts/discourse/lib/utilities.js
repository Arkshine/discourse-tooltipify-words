const readInputList = function (action) {
  JSON.parse(settings[action.inputListName]).forEach((pair) => {
    action.inputs[pair.words] = pair.replacement;
  });
};

// Detect this pattern: /regex/modifiers
const isInputRegex = function (input) {
  return input[0] === "/" && input.split("/").length > 2;
};

const escapeRegExp = function (str) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const prepareRegex = function (input) {
  let leftWordBoundary = "(\\s|[:.;,!?…\\([{]|^)";
  let rightWordBoundary = "(?=[:.;,!?…\\]})]|\\s|$)";
  let wordOrRegex, modifier, regex;
  if (isInputRegex(input)) {
    let tmp = input.split("/");
    modifier = tmp.pop();
    wordOrRegex = tmp.slice(1).join("/");
    // Allow only "i" modifier for now, global modifier is implicit
    if (modifier.includes("i")) {
      modifier = "ig";
    } else {
      modifier = "g";
    }
  } else {
    // Input is a case-insensitive WORD
    // Autolink only first occurrence of the word in paragraph,
    // i.e. do not use global modifier here
    modifier = "i";
    wordOrRegex = escapeRegExp(input);
  }
  try {
    regex = new RegExp(
      leftWordBoundary + "(" + wordOrRegex + ")" + rightWordBoundary,
      modifier
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "ERROR from auto-linkify theme: Invalid input:",
      wordOrRegex,
      err.message
    );
    return;
  }
  return regex;
};

const executeRegex = function (regex, str, value, matches) {
  if (!(regex instanceof RegExp)) {
    return;
  }
  let match = regex.exec(str);
  if (match === null) {
    return;
  }
  do {
    // This is ugly, but we need the matched word and corresponding value together
    match.value = value;
    matches.push(match);
  } while (regex.global && (match = regex.exec(str)) !== null);
};

const replaceCapturedVariables = function (input, match) {
  // Did we capture user defined variables?
  // By default, we capture 2 vars: left boundary and the regex itself
  if (match.length <= 3) {
    return input;
  }
  let captured = match.slice(3, match.length);
  let replaced = input;
  for (let i = captured.length; i > 0; i--) {
    let re = new RegExp("\\$" + i.toString(), "");
    replaced = replaced.replace(re, captured[i - 1]);
  }
  return replaced;
};

const modifyText = function (helper, text, action) {
  const words = action.inputs;

  let inputRegexes = Object.keys(words).filter(isInputRegex);

  // sort words longest first
  let sortedWords = Object.keys(words)
    .filter((x) => !isInputRegex(x))
    .sort((x, y) => y.length - x.length);

  // First match regexes in the original order, then words longest first
  let keys = inputRegexes.concat(sortedWords);
  let matches = [];

  for (const element of keys) {
    let word = element;
    let value = words[word];

    executeRegex(prepareRegex(word), text.data, value, matches);
  }

  // Sort matches according to index, descending order
  // Got to work backwards not to muck up string
  matches.sort((m, n) => n.index - m.index);

  for (const element of matches) {
    let match = element;
    let matchedLeftBoundary = match[1];
    let matchedWord = match[2];
    let value = replaceCapturedVariables(match.value, match);

    // We need to protect against multiple matches of the same word or phrase
    if (
      match.index + matchedLeftBoundary.length + matchedWord.length >
      text.data.length
    ) {
      continue;
    }

    text.splitText(match.index + matchedLeftBoundary.length);
    text.nextSibling.splitText(matchedWord.length);

    text.parentNode.replaceChild(
      action.createNode(helper, matchedWord, value),
      text.nextSibling
    );
  }
};

const isSkippedClass = function (classes, skipClasses) {
  // Return true if at least one of the classes should be skipped
  return classes && classes.split(" ").some((cls) => cls in skipClasses);
};

const traverseNodes = function (helper, elem, action, skipTags, skipClasses) {
  // work backwards so changes do not break iteration
  for (let index = elem.childNodes.length - 1; index >= 0; index--) {
    let child = elem.childNodes[index];

    if (child.nodeType === Node.ELEMENT_NODE) {
      let tag = child.nodeName.toLowerCase();
      let cls = child.getAttribute("class");

      if (!(tag in skipTags) && !isSkippedClass(cls, skipClasses)) {
        traverseNodes(helper, child, action, skipTags, skipClasses);
      }
    } else if (child.nodeType === Node.TEXT_NODE) {
      modifyText(helper, child, action);
    }
  }
};

export { readInputList, traverseNodes };
