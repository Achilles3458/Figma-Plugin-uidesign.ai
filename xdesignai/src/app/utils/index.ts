import { validationConstants } from '../constants';

export const beautifyHtml = (htmlString: string) => {
  // to remove comments
  // let bodyHtml = htmlString.replace(/<\!--.*?-->/g, '').replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g, '');
  // Sometimes AI response does not start with html tags. i.e: ```html <!DOC...
  if (htmlString.includes('<html')) {
    const startIndex = htmlString.indexOf('<html');
    let lastIndex = htmlString.indexOf('</html>');
    lastIndex = lastIndex < 0 ? htmlString.length : lastIndex + 7;
    htmlString = htmlString.substring(startIndex, lastIndex);
  }
  return htmlString;
  return htmlString.includes('```') ? htmlString.split(/```.*\n/)[1] : htmlString;
};

export const getAttributes = (node: any) => {
  if (!node) return {};

  const attributeNodeArray = [...node.attributes];
  const attrs = attributeNodeArray.reduce((attrs, attribute) => {
    attrs[attribute.name] = attribute.value;
    return attrs;
  }, {});
  return attrs;
};

export function isValidEmail(email: string) {
  return validationConstants.EMAIL_VALIDATION_REGEX.test(email);
}

export function isValidPassword(password: string) {
  return validationConstants.PASSWORD_VALIDATION_REGEX.test(password);
}
