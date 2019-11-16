console.log( "kinodbglue2.js module");

import  { drawPattern } from '../dist/patterneditor.js';

//This is setting the non-module global reference that can then be called normally
console.log( "Populating moduleExports.drawPattern");
moduleExports.drawPattern = drawPattern;
moduleLoaded();


