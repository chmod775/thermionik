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
}