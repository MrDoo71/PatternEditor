import  { drawPattern } from '../dist/patterneditor.js?v=2';

console.log( "kinodbglue2.js?v=2 module");

//This is setting the non-module global reference that can then be called normally
console.log( "Populating moduleExports.drawPattern");
moduleExports.drawPattern = drawPattern;
moduleLoaded();


