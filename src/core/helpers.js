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
  
  static uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
}