console.log( "kinodbglue1.js loaded");

var moduleExports = {}; //we'll then set this reference in the module kinodbglue.mjs
var params = null; //in case we get called before the module loads, or we could sleep?

function drawPattern( dataAndConfig, ptarget, options ) 
{
    console.log( "Calling moduleExports.drawPattern");

    if ( moduleExports.drawPattern )
        moduleExports.drawPattern( dataAndConfig, ptarget, options );
    else
        params = { dataAndConfig:dataAndConfig, ptarget:ptarget, options:options };
}

function moduleLoaded()
{
    console.log( "module loaded, params:", params );

    if ( params )
        moduleExports.drawPattern( params.dataAndConfig, params.ptarget, params.options );
}

console.log( "kinodbglue1.js done");